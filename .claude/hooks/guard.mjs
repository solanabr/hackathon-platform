#!/usr/bin/env node
// PreToolUse guard. Permission "ask" rules didn't prompt in auto mode (fresh-session check, 27 Nov 2026), so the rules
// that protect secrets, main, merges, production services and these guard rails deny outright. SQL through the Supabase
// connector is the exception Gabriel chose: agents may run it once he says yes in chat, so it stays an ask. The hook
// reads the whole command, which prefix rules can't: `head .env.local`, a bare `git push` on main. Exit 0 with no output
// lets the normal permission flow decide.
//
// Sessions run the main checkout's settings and this hook, worktree sessions included (verified 27 Nov). So the live guard
// rails are the main checkout's files, plus the session project's own when the project isn't the main checkout. Those
// can't be written; copies inside `.claude/worktrees/*` aren't live, and guard changes are made there and land through a PR.

import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";

// Supabase project refs where agents may run SQL without asking. None today: the hackathon has no test project, and the
// connector also reaches Academy production. Everywhere else an agent asks Gabriel in chat first (his rule, 27 Nov).
const NON_PRODUCTION_PROJECTS = new Set([]);

const SQL_TOOLS = new Set(["execute_sql", "apply_migration"]);
const MCP_WRITE_TOOLS = new Set([
  "create_project", "pause_project", "restore_project", "confirm_cost",
  "create_branch", "delete_branch", "merge_branch", "reset_branch", "deploy_edge_function",
  "create_project_env", "edit_project_env", "update_project", "add_project_domain",
  "create_record", "update_record", "replace_domain_dns_records",
  "create_deployment", "request_promote", "request_rollback", "assign_alias",
  "create-domain", "remove-domain", "create-api-key", "create-webhook", "send-email", "send-batch-emails",
]);
const GUARD_PATH = /\.claude\/(settings(\.local)?\.json|hooks(\/|$))/;
const GUARDISH = /\.claude|settings(\.local)?\.json|(^|\/)hooks(\/|$)|guard\.mjs/;
const ENV_FILE = /(^|[\s'"=:/(<])\.env(\.(?!example\b)[\w.-]+)?(?=$|[\s'")>;|&])/;
const READ_ONLY = new Set(["cat", "head", "tail", "less", "grep", "rg", "wc", "ls", "file", "diff"]);
// REST paths whose writes merge, change access or protection, or write commits and refs without a push.
const SENSITIVE_GH_API = /\/(pulls\/\d+\/merge|merges|collaborators|secrets|variables|rulesets|protection|hooks|keys|actions\/permissions|git\/refs|contents)\b/;
const SENSITIVE_GRAPHQL = /\b(mergePullRequest|enablePullRequestAutoMerge|mergeBranch|createCommitOnBranch|updateRefs?|deleteRef|\w*BranchProtectionRule|\w*Ruleset|updateRepository|deleteRepository|transferRepository|archiveRepository|\w*Collaborator\w*|\w*DeployKey)\b/;

class Decision {
  constructor(decision, reason) {
    this.decision = decision;
    this.reason = reason;
  }
}
const ask = (reason) => {
  throw new Decision("ask", reason);
};
const deny = (reason) => {
  throw new Decision("deny", reason);
};

const projectDir = path.resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());

function mainCheckout() {
  try {
    const out = execFileSync("git", ["-C", projectDir, "rev-parse", "--git-common-dir"], { encoding: "utf8", timeout: 5000 }).trim();
    return path.dirname(path.resolve(projectDir, out));
  } catch {
    return projectDir;
  }
}

function inside(dir, target) {
  const rel = path.relative(dir, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function isLiveGuardFile(abs) {
  if (inside(path.join(homedir(), ".claude"), abs) && /\/settings(\.local)?\.json$/.test(abs)) return true;
  if (!GUARD_PATH.test(abs)) return false;
  for (const root of new Set([projectDir, mainCheckout()])) {
    if (inside(root, abs) && !inside(path.join(root, ".claude", "worktrees"), abs)) return true;
  }
  return false;
}

// Resolves a shell word to an absolute path, or null when it depends on a variable or substitution we can't expand.
function resolveWord(word, cwd) {
  const t = word
    .replace(/^['"]|['"]$/g, "")
    .replace(/\$\{?CLAUDE_PROJECT_DIR\}?/g, projectDir)
    .replace(/\$\{?HOME\}?/g, homedir())
    .replace(/^~(?=\/|$)/, homedir());
  if (/[$`]/.test(t) || cwd === null) return null;
  return path.resolve(cwd, t);
}

function checkGuardWrite(word, cwd) {
  if (!GUARDISH.test(word)) return;
  const abs = resolveWord(word, cwd);
  if (abs === null) deny("This command writes to a path that may be a guard-rail file and can't be resolved; spell the path out.");
  if (isLiveGuardFile(abs)) deny("Guard rails change only through a PR from a worktree under .claude/worktrees.");
}

function segmentsOf(command) {
  return command
    .split(/&&|\|\||;|\||\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Drops leading `VAR=value` assignments and wrappers, so the first word is the program that runs.
function programOf(segment) {
  return segment
    .replace(/^(\w+=\S*\s+)+/, "")
    .replace(/^env\s+(-\S+\s+)*(\w+=\S*\s+)+/, "")
    .replace(/^(timeout\s+\S+|time|nice|nohup|command)\s+/, "")
    .replace(/\s#.*$/, "");
}

// Splits `git [global options] <sub> <args>`, keeping -C so branch checks look at the right repository.
function gitArgs(words) {
  let dir = null;
  let i = 1;
  while (i < words.length && words[i].startsWith("-")) {
    if (words[i] === "-C") dir = words[i + 1];
    i += ["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--exec-path", "--config-env"].includes(words[i]) ? 2 : 1;
  }
  return { dir, sub: words[i], rest: words.slice(i + 1) };
}

function ghArgs(words) {
  let i = 1;
  while (i < words.length && words[i].startsWith("-")) i += ["-R", "--repo", "--hostname"].includes(words[i]) ? 2 : 1;
  return { sub: words[i], rest: words.slice(i + 1) };
}

function currentBranch(dir, cwd) {
  const repo = (dir && resolveWord(dir, cwd)) ?? cwd ?? projectDir;
  try {
    return execFileSync("git", ["-C", repo, "branch", "--show-current"], { encoding: "utf8", timeout: 5000 }).trim();
  } catch {
    return "";
  }
}

function checkPush({ dir, rest }, cwd) {
  const options = rest.filter((w) => w.startsWith("-"));
  const args = rest.filter((w) => !w.startsWith("-"));
  if (options.some((o) => o === "--all" || o === "--mirror")) deny("This push includes every branch, main among them.");
  const refspecs = args.slice(1);
  const destination = (ref) => {
    const r = ref.replace(/^\+/, "");
    if (r.includes(":")) return r.split(":").pop();
    return r === "HEAD" ? currentBranch(dir, cwd) : r;
  };
  const toMain = refspecs.some((r) => /^(refs\/heads\/)?main$/.test(destination(r)));
  if (toMain || (refspecs.length === 0 && currentBranch(dir, cwd) === "main"))
    deny("Pushes to main deploy production; they go through a reviewed PR that Gabriel merges.");
  if (options.some((o) => /^(--force(-with-lease)?(=.*)?|-f)$/.test(o)) || refspecs.some((r) => r.startsWith("+")))
    ask("Force-push rewrites shared history.");
}

function checkGhApi(s, rest) {
  if (rest[0] === "graphql") {
    if (/query=@|--input/.test(s)) deny("A GraphQL document read from a file can't be checked; inline it.");
    if (SENSITIVE_GRAPHQL.test(s)) deny("This GraphQL mutation merges, writes refs or commits, or changes access or protection.");
    if (/\bmutation\b/.test(s)) ask("This GraphQL mutation writes to GitHub.");
    return;
  }
  const method = s.match(/\s(?:-X|--method)[\s=]*(\w+)/i)?.[1]?.toUpperCase() ?? (/\s(-f|-F|--field|--raw-field|--input)\b/.test(s) ? "POST" : "GET");
  if (method === "GET") return;
  if (method === "DELETE") deny("`gh api` DELETE calls are refused.");
  if (SENSITIVE_GH_API.test(s)) deny("This `gh api` call merges, writes refs or commits, or changes access or protection.");
  ask("This `gh api` call writes to GitHub.");
}

function checkBash(command, depth = 0) {
  if (ENV_FILE.test(command)) deny("Env files hold secrets: their values never go into the transcript. Use .env.example for names.");
  let cwd = projectDir;
  for (const segment of segmentsOf(command)) {
    const s = programOf(segment);
    const words = s.split(/\s+/);
    const first = words[0];

    const nested = s.match(/^(?:(?:ba|z|da)?sh\s+-c|eval)\s+(['"])([\s\S]*)\1\s*$/);
    if (nested && depth < 3) checkBash(nested[2], depth + 1);

    if (first === "cd") {
      cwd = words[1] ? resolveWord(words[1], cwd ?? projectDir) : homedir();
      continue;
    }
    if (first === "printenv" || /^env(\s*$|\s+-)/.test(s)) deny("Printing the environment would put secrets in the transcript.");

    for (const m of segment.matchAll(/(?:^|[^<&\d])\d?(?:&)?>>?\|?\s*([^\s;&|]+)/g)) if (!m[1].startsWith("&")) checkGuardWrite(m[1], cwd);
    if (!READ_ONLY.has(first)) for (const word of words.slice(1)) checkGuardWrite(word, cwd);

    if (first === "git") {
      const git = gitArgs(words);
      if (git.sub === "push") checkPush(git, cwd);
    }
    if (first === "gh") {
      const gh = ghArgs(words);
      if (gh.sub === "pr" && gh.rest[0] === "merge") deny("Gabriel merges PRs himself.");
      if (gh.sub === "api") checkGhApi(s, gh.rest);
    }
    if (/^(npx\s+)?vercel\b/.test(s) && (/\benv\s+(pull|add|rm|update)\b/.test(s) || /--prod\b|\bpromote\b|\brollback\b/.test(s)))
      deny("This Vercel command reads secrets or changes production.");
  }
}

function checkFileTool(tool, input) {
  const target = input?.file_path ?? input?.notebook_path ?? input?.path ?? "";
  const name = target.split("/").pop() ?? "";
  if (/^\.env(\..+)?$/.test(name) && name !== ".env.example") deny("Env files hold secrets: their values never go into the transcript.");
  if (tool === "Read" || tool === "Grep" || tool === "Glob" || !target) return;
  if (isLiveGuardFile(path.resolve(projectDir, target))) deny("Guard rails change only through a PR from a worktree under .claude/worktrees.");
}

function checkMcp(tool, input) {
  const name = tool.split("__").pop();
  if (SQL_TOOLS.has(name)) {
    const ref = input?.project_id ?? input?.projectId ?? "";
    if (!NON_PRODUCTION_PROJECTS.has(ref))
      ask(`SQL on ${ref || "this project"} needs Gabriel's yes in chat first: show him the statement and wait for it.`);
  }
  if (MCP_WRITE_TOOLS.has(name)) deny(`${name} changes a production service; a person does it.`);
}

// Read stdin as a stream: Claude Code can hand the hook a non-blocking pipe, where a synchronous read fails with EAGAIN.
let raw = "";
for await (const chunk of process.stdin) raw += chunk;

try {
  const event = JSON.parse(raw);
  const tool = event.tool_name ?? "";
  if (tool === "Bash") checkBash(event.tool_input?.command ?? "");
  else if (tool.startsWith("mcp__")) checkMcp(tool, event.tool_input);
  else checkFileTool(tool, event.tool_input);
} catch (error) {
  // A guard error refuses rather than failing open; fix the hook in a worktree.
  const decision = error instanceof Decision ? error : new Decision("deny", `The guard hit an error (${error.message}); the call was refused.`);
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: decision.decision,
        permissionDecisionReason: decision.reason,
      },
    }),
  );
}
