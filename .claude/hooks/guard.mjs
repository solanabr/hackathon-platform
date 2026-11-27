#!/usr/bin/env node
// PreToolUse guard. Permission "ask" rules didn't prompt in auto mode (fresh-session check, 27 Nov 2026), so the rules
// that protect secrets, main, merges, production services and these guard rails deny outright. SQL through a database
// connector is the exception Gabriel chose: agents may run it once he says yes in chat, so it stays an ask. The hook
// reads the whole command, which prefix rules can't. Exit 0 with no output lets the normal permission flow decide.
// `scripts/guard-selftest.sh` runs it on real inputs.
//
// Sessions run the main checkout's settings and this hook, worktree sessions included (verified 27 Nov). So the live
// guard rails are the main checkout's files, plus the session project's own when the project isn't the main checkout.
// Those can't be written, and the main checkout's HEAD can't be moved; copies inside `.claude/worktrees/*` aren't live,
// and guard changes are made there and land through a PR.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

// Supabase project refs where agents may run SQL without asking. None today: the hackathon has no test project, and the
// connector also reaches Academy production. Everywhere else an agent asks Gabriel in chat first (his rule, 27 Nov).
const NON_PRODUCTION_PROJECTS = new Set([]);

const SQL_TOOLS = new Set([
  "execute_sql", "apply_migration", "run_notebook", "create_notebook",
  "run_sql", "run_sql_transaction", "d1_database_query", "query_render_postgres", "query_database",
]);
const MCP_WRITE_TOOLS = new Set([
  "create_project", "pause_project", "restore_project", "delete_project", "confirm_cost",
  "create_branch", "delete_branch", "merge_branch", "reset_branch", "deploy_edge_function",
  "create_project_env", "edit_project_env", "update_project", "add_project_domain",
  "create_record", "update_record", "replace_domain_dns_records",
  "create_deployment", "request_promote", "request_rollback", "assign_alias",
  "create-domain", "remove-domain", "create-api-key", "create-webhook", "send-email", "send-batch-emails",
  "d1_database_delete", "kv_namespace_delete", "r2_bucket_delete", "hyperdrive_config_delete",
]);
const GUARD_PATH = /\.claude\/(settings(\.local)?\.json|hooks(\/|$))|(^|\/)\.mcp\.json$|\/\.claude\.json$/;
const GUARDISH = /\.claude|settings(\.local)?\.json|(^|\/)hooks(\/|$)|guard\.mjs|\.mcp\.json/;
const ENV_FILE = /(^|[\s'"=:/(<])\.env(\.(?!example\b)[\w.-]+)?(?=$|[\s'")>;|&])/;
const READ_ONLY = new Set(["cat", "head", "tail", "less", "grep", "rg", "wc", "ls", "file", "diff"]);
const DESTRUCTIVE = new Set(["rm", "rmdir", "mv", "cp", "rsync", "ln", "chmod", "chown", "truncate", "unlink", "shred", "install"]);
const IN_PLACE_WRITERS = new Set(["sed", "perl", "tee", "patch", "awk", "gawk", "dd"]);
// gh subcommands that merge, change access, secrets or releases, run workflows, or print the token.
const GH_DENIED = {
  secret: /^(set|delete|remove)$/,
  variable: /^(set|delete|remove)$/,
  repo: /^(delete|edit|archive|unarchive|rename|transfer|deploy-key)$/,
  release: /^(create|delete|edit|upload|delete-asset)$/,
  workflow: /^(run|enable|disable)$/,
  auth: /^(token|login|logout|refresh|switch|setup-git)$/,
  "ssh-key": /^(add|delete)$/,
  "gpg-key": /^(add|delete)$/,
};
const GIT_FILE_WRITERS = new Set(["checkout", "restore", "rm", "mv", "clean", "reset", "stash", "switch"]);
const GIT_HEAD_MOVERS = new Set(["checkout", "switch", "restore", "reset", "stash", "rebase", "merge", "cherry-pick", "revert", "am", "clean", "rm", "mv"]);
// REST paths whose writes merge, change access or protection, or write commits and refs without a push.
const SENSITIVE_GH_API = /\/(pulls\/\d+\/merge|merges|collaborators|secrets|variables|rulesets|protection|hooks|keys|actions\/permissions|git\/refs|contents)\b/;
const SENSITIVE_GRAPHQL = /\b(mergePullRequest|enablePullRequestAutoMerge|mergeBranch|createCommitOnBranch|updateRefs?|deleteRef|\w*BranchProtectionRule|\w*Ruleset|updateRepository|deleteRepository|transferRepository|archiveRepository|\w*Collaborator\w*|\w*DeployKey)\b/;
const VERCEL_DENIED_SUBCOMMANDS = new Set(["env", "pull", "promote", "rollback", "redeploy", "alias", "domains", "dns", "certs", "secrets", "remove", "rm"]);

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

// Compares real paths, so a symlink (or macOS's /var → /private/var) can't hide a guard file.
function real(p) {
  try {
    return fs.realpathSync(p);
  } catch {
    const parent = path.dirname(p);
    return parent === p ? p : path.join(real(parent), path.basename(p));
  }
}

const HOME = real(homedir());
const projectDir = real(path.resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd()));

function mainCheckout() {
  try {
    const out = execFileSync("git", ["-C", projectDir, "rev-parse", "--git-common-dir"], { encoding: "utf8", timeout: 5000 }).trim();
    return real(path.dirname(path.resolve(projectDir, out)));
  } catch {
    return projectDir;
  }
}

function inside(dir, target) {
  const rel = path.relative(dir, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function liveRoots() {
  return [...new Set([projectDir, mainCheckout()])];
}

function inLiveRoot(abs) {
  return liveRoots().some((root) => inside(root, abs) && !inside(path.join(root, ".claude", "worktrees"), abs));
}

function isLiveGuardFile(abs) {
  if (inside(path.join(HOME, ".claude"), abs) && /\/settings(\.local)?\.json$/.test(abs)) return true;
  if (abs === path.join(HOME, ".claude.json")) return true;
  return GUARD_PATH.test(abs) && inLiveRoot(abs);
}

// True when deleting, moving or overwriting `abs` would take live guard files with it: `.claude` itself or any parent.
function holdsLiveGuardFiles(abs) {
  const dirs = [...liveRoots().map((root) => path.join(root, ".claude")), path.join(HOME, ".claude")];
  return dirs.some((dir) => inside(abs, dir)) || abs === path.join(HOME, ".claude.json");
}

function unquote(word) {
  return word.replace(/['"]/g, "");
}

function expandWord(word) {
  return unquote(word)
    .replace(/\$\{?CLAUDE_PROJECT_DIR\}?/g, projectDir)
    .replace(/\$\{?HOME\}?/g, HOME)
    .replace(/^~(?=\/|$)/, HOME);
}

// Resolves a shell word to an absolute path, or null when it depends on a variable, substitution or glob.
function resolveWord(word, cwd) {
  const t = expandWord(word);
  if (/[$`*?[{]/.test(t) || cwd === null) return null;
  return real(path.resolve(cwd, t));
}

// The paths a write target names: one path, the matches of a glob, or null when it can't be known.
function targetsOf(word, cwd) {
  const t = expandWord(word);
  if (/[$`]/.test(t) || cwd === null) return null;
  if (!/[*?[{]/.test(t)) return [real(path.resolve(cwd, t))];
  if (typeof fs.globSync !== "function") return null;
  try {
    return fs.globSync(t, { cwd }).map((p) => real(path.resolve(cwd, p)));
  } catch {
    return null;
  }
}

// `expandGlobs` is for redirect targets and in-place writers; elsewhere only guard-looking words are checked.
function checkGuardWrite(word, cwd, expandGlobs = false) {
  const glob = /[*?[{]/.test(word);
  if (!GUARDISH.test(word) && !(expandGlobs && glob)) return;
  const targets = expandGlobs || !glob ? targetsOf(word, cwd) : null;
  if (targets === null) {
    if (GUARDISH.test(word)) deny("This command writes to a path that may be a guard-rail file and can't be resolved; spell the path out.");
    return;
  }
  if (targets.some((abs) => isLiveGuardFile(abs) || holdsLiveGuardFiles(abs)))
    deny("Guard rails change only through a PR from a worktree under .claude/worktrees.");
}

function checkDestructive(words, cwd) {
  for (const word of words.filter((w) => !w.startsWith("-"))) {
    const targets = targetsOf(word, cwd);
    if (targets === null) {
      if (GUARDISH.test(word)) deny("This command removes or moves a path that may hold guard-rail files and can't be resolved.");
      continue;
    }
    if (targets.some((abs) => isLiveGuardFile(abs) || holdsLiveGuardFiles(abs))) deny("This would remove, move or overwrite live guard-rail files.");
  }
}

function segmentsOf(command) {
  return command
    .split(/&&|\|\||;|\||\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Drops grouping, shell keywords, `VAR=value` assignments and wrappers, so the first word is the program that runs.
function programOf(segment) {
  let t = segment;
  for (;;) {
    const next = t
      .replace(/^(\(|\{|!|then|do|else|elif|if|while|until|exec|xargs(\s+-\S+)*)\s*/, "")
      .replace(/^(\w+=\S*\s+)+/, "")
      .replace(/^env\s+(-\S+\s+)*(\w+=\S*\s+)+/, "")
      .replace(/^(timeout\s+\S+|time|nice|nohup|command|sudo)\s+/, "");
    if (next === t) break;
    t = next;
  }
  return t.replace(/\s#.*$/, "").replace(/[)}]+\s*$/, "");
}

// Commands hidden inside `sh -c '…'`, `eval "…"`, `$(…)` and backticks, found before the line is split on `;`/`&&`.
function innerCommands(command) {
  const out = [];
  for (const m of command.matchAll(/(?:^|[\s;&|(`])(?:(?:ba|z|da|k)?sh|eval)\s+(?:-\w*c\w*\s+)?(['"])((?:\\.|(?!\1)[\s\S])*)\1/g)) out.push(m[2]);
  for (const m of command.matchAll(/\$\(([^()]*)\)/g)) out.push(m[1]);
  for (const m of command.matchAll(/`([^`]*)`/g)) out.push(m[1]);
  return out;
}

// Splits `git [global options] <sub> <args>`, keeping -C so repository checks look at the right one.
function gitArgs(words) {
  let dir = null;
  let i = 1;
  while (i < words.length && words[i].startsWith("-")) {
    if (words[i] === "-C") dir = words[i + 1];
    i += ["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--exec-path", "--config-env"].includes(words[i]) ? 2 : 1;
  }
  return { dir, sub: words[i], rest: words.slice(i + 1) };
}

// Positional words after `gh`, skipping global and subcommand flags that take a value.
function ghPositional(words) {
  const out = [];
  for (let i = 1; i < words.length; i++) {
    if (["-R", "--repo", "--hostname"].includes(words[i])) i++;
    else if (!words[i].startsWith("-")) out.push(words[i]);
  }
  return out;
}

function repoOf(dir, cwd) {
  return (dir && resolveWord(dir, cwd)) ?? cwd ?? projectDir;
}

function currentBranch(repo) {
  try {
    return execFileSync("git", ["-C", repo, "branch", "--show-current"], { encoding: "utf8", timeout: 5000 }).trim();
  } catch {
    return "";
  }
}

function checkPush(rest, repo) {
  const options = rest.filter((w) => w.startsWith("-"));
  const args = rest.filter((w) => !w.startsWith("-")).map(unquote);
  if (options.some((o) => o === "--all" || o === "--mirror" || o === "--branches")) deny("This push includes every branch, main among them.");
  const refspecs = args.slice(1);
  const destination = (ref) => {
    const r = ref.replace(/^\+/, "");
    if (r.includes(":")) return r.split(":").pop();
    return r === "HEAD" || r === "@" ? currentBranch(repo) : r;
  };
  const toMain = refspecs.some((r) => /^(refs\/heads\/)?main$/.test(destination(r)));
  if (toMain || (refspecs.length === 0 && currentBranch(repo) === "main"))
    deny("Pushes to main deploy production; they go through a reviewed PR that Gabriel merges.");
  if (options.some((o) => /^(--force(-with-lease)?(=.*)?|-f)$/.test(o)) || refspecs.some((r) => r.startsWith("+")))
    ask("Force-push rewrites shared history.");
}

function checkGit(words, cwd) {
  const { dir, sub, rest } = gitArgs(words);
  const repo = repoOf(dir, cwd);
  if (sub === "push") checkPush(rest, repo);
  const main = mainCheckout();
  const inMainCheckout = inside(main, repo) && !inside(path.join(main, ".claude", "worktrees"), repo);
  if (inMainCheckout && (GIT_HEAD_MOVERS.has(sub) || (sub === "pull" && !rest.includes("--ff-only"))))
    deny("This would move HEAD or rewrite files in the main checkout, whose guard rails every session runs. Work in a worktree; `git fetch` and `git pull --ff-only` stay allowed.");
  if (GIT_FILE_WRITERS.has(sub)) checkDestructive(rest, repo);
}

function checkGhApi(s, positional) {
  if (positional[1] === "graphql") {
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

// Strips package-runner prefixes (npx -y, bunx, pnpm dlx, yarn dlx, npm exec) so `vercel`/`vc` is the first word.
function vercelArgs(s) {
  const stripped = s
    .replace(/^(npx|bunx|pnpx)((\s+-\S+)|(\s+--package\s+\S+))*\s+/, "")
    .replace(/^(pnpm|yarn|npm)\s+(dlx|exec|x)(\s+-\S+)*\s+/, "")
    .replace(/^yarn\s+(?=(vercel|vc)\b)/, "");
  const words = stripped.split(/\s+/);
  if (!/^(vercel|vc)(@\S+)?$/.test(words[0])) return null;
  return words.slice(1);
}

function checkVercel(args, s) {
  const sub = args.find((w) => !w.startsWith("-"));
  if (VERCEL_DENIED_SUBCOMMANDS.has(sub)) deny(`\`vercel ${sub}\` reads secrets or changes production.`);
  if (/(^|\s)--prod\b|--(target|environment)[=\s]+production\b/.test(s)) deny("This Vercel command targets production.");
}

function checkBash(command, cwd0, depth = 0) {
  if (ENV_FILE.test(command)) deny("Env files hold secrets: their values never go into the transcript. Use .env.example for names.");
  if (depth < 3) for (const inner of innerCommands(command)) checkBash(inner, cwd0, depth + 1);
  let cwd = cwd0;
  for (const segment of segmentsOf(command)) {
    const s = programOf(segment);
    const words = s.split(/\s+/);
    const first = words[0];

    if (first === "cd") {
      cwd = words[1] ? resolveWord(words[1], cwd ?? projectDir) : HOME;
      continue;
    }
    if (first === "printenv" || /^env(\s*$|\s+-)/.test(s)) deny("Printing the environment would put secrets in the transcript.");

    for (const m of segment.matchAll(/(?:^|[^<&\d])\d?(?:&)?>>?\|?\s*([^\s;&|]+)/g)) if (!m[1].startsWith("&")) checkGuardWrite(m[1], cwd, true);
    if (DESTRUCTIVE.has(first)) checkDestructive(words.slice(1), cwd);
    else if (!READ_ONLY.has(first)) for (const word of words.slice(1)) checkGuardWrite(word, cwd, IN_PLACE_WRITERS.has(first));

    if (first === "git") checkGit(words, cwd);
    if (first === "gh") {
      const positional = ghPositional(words);
      if (positional[0] === "pr" && positional[1] === "merge") deny("Merges go through stbr-chief-staff's approval, not an agent's command.");
      if (GH_DENIED[positional[0]]?.test(positional[1] ?? "")) deny(`\`gh ${positional[0]} ${positional[1]}\` changes access, secrets, releases or workflows, or prints the token.`);
      if (positional[0] === "auth" && positional[1] === "status" && /\s(-t|--show-token)\b/.test(s)) deny("This prints the GitHub token into the transcript.");
      if (positional[0] === "api") checkGhApi(s, positional);
    }
    const vercel = vercelArgs(s);
    if (vercel) checkVercel(vercel, s);
  }
}

function checkFileTool(tool, input, cwd) {
  const target = input?.file_path ?? input?.notebook_path ?? input?.path ?? "";
  const name = target.split("/").pop() ?? "";
  if (/^\.env(\..+)?$/.test(name) && name !== ".env.example") deny("Env files hold secrets: their values never go into the transcript.");
  if (tool === "Read" || tool === "Grep" || tool === "Glob" || !target) return;
  if (isLiveGuardFile(real(path.resolve(cwd, target)))) deny("Guard rails change only through a PR from a worktree under .claude/worktrees.");
}

function checkMcp(tool, input) {
  const name = tool.split("__").pop();
  if (SQL_TOOLS.has(name)) {
    const ref = input?.project_id ?? input?.projectId ?? "";
    if (!NON_PRODUCTION_PROJECTS.has(ref))
      ask(`SQL on ${ref || "this database"} needs Gabriel's yes in chat first: show him the statement and wait for it.`);
  }
  if (MCP_WRITE_TOOLS.has(name)) deny(`${name} changes a production service; a person does it.`);
}

// Read stdin as a stream: Claude Code can hand the hook a non-blocking pipe, where a synchronous read fails with EAGAIN.
let raw = "";
for await (const chunk of process.stdin) raw += chunk;

try {
  const event = JSON.parse(raw);
  const tool = event.tool_name ?? "";
  const cwd = real(path.resolve(event.cwd ?? projectDir));
  if (tool === "Bash") checkBash(event.tool_input?.command ?? "", cwd);
  else if (tool.startsWith("mcp__")) checkMcp(tool, event.tool_input);
  else checkFileTool(tool, event.tool_input, cwd);
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
