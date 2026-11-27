#!/usr/bin/env node
// PreToolUse guard. Permission "ask" rules didn't prompt in auto mode (fresh-session check, 27 Nov 2026), so every rule
// here that protects production, secrets, main or these guard rails denies outright. It reads the whole command, which
// prefix rules can't: `head .env.local`, a bare `git push` on main, SQL through any Supabase connector. Exit 0 with no
// output lets the normal permission flow decide. Change this file in a separate worktree and land it through a PR: edits
// to it inside the session's project or the main checkout are refused, and the hook runs fresh on every call.

import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";

// Supabase project refs where agents may run SQL. None today: the hackathon has no test project, and the connector
// also reaches Academy production. Adding one is a guard change, so it goes through a PR.
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
const GUARD_PATH = /\.claude\/(settings(\.local)?\.json|hooks\/)/;
const ENV_FILE = /(^|[\s'"=:/(<])\.env(\.(?!example\b)[\w.-]+)?(?=$|[\s'")>;|&])/;
const READ_ONLY = new Set(["cat", "head", "tail", "less", "grep", "rg", "wc", "ls", "file", "diff"]);
const SENSITIVE_GH_API = /\/(pulls\/\d+\/merge|merges|collaborators|secrets|variables|rulesets|protection|hooks|keys|actions\/permissions)\b/;

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

// A guard file is protected when it belongs to this session's project, to the main checkout (not one of its other
// worktrees, where guard changes are made), or to the user's global settings.
function isProtectedGuardFile(target) {
  const abs = path.resolve(projectDir, target.replace(/^~(?=\/)/, homedir()));
  if (inside(path.join(homedir(), ".claude"), abs) && /\/settings(\.local)?\.json$/.test(abs)) return true;
  if (!GUARD_PATH.test(abs)) return false;
  if (inside(projectDir, abs)) return true;
  const main = mainCheckout();
  return inside(main, abs) && !inside(path.join(main, ".claude", "worktrees"), abs);
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
    .replace(/^(timeout\s+\S+|time|nice|nohup|command)\s+/, "")
    .replace(/\s#.*$/, "");
}

function currentBranch(segment) {
  const dir = segment.match(/^git\s+-C\s+(\S+)/)?.[1] ?? projectDir;
  try {
    return execFileSync("git", ["-C", dir, "branch", "--show-current"], { encoding: "utf8", timeout: 5000 }).trim();
  } catch {
    return "";
  }
}

function checkPush(s) {
  const force = /\s(--force(-with-lease)?\b|-f\b|\+\S)/.test(s);
  const args = s.replace(/^git(\s+-C\s+\S+)?\s+push\b/, "").split(/\s+/).filter((w) => w && !w.startsWith("-"));
  const refspecs = args.slice(1);
  const namesMain = refspecs.some((r) => /(^|:|\/)main$/.test(r.replace(/^\+/, "")));
  const lands = namesMain || ((refspecs.length === 0 || refspecs.every((r) => r === "HEAD")) && currentBranch(s) === "main");
  if (lands) deny("Pushes to main deploy production; they go through a reviewed PR that Gabriel merges.");
  if (force) ask("Force-push rewrites shared history.");
}

function checkGhApi(s) {
  const method = s.match(/\s(?:-X|--method)[\s=]*(\w+)/i)?.[1]?.toUpperCase() ?? (/\s(-f|-F|--field|--raw-field|--input)\b/.test(s) ? "POST" : "GET");
  if (method === "GET") return;
  if (method === "DELETE") deny("`gh api` DELETE calls are refused.");
  if (SENSITIVE_GH_API.test(s)) deny("This `gh api` call changes merges, access, secrets or repository protection.");
  ask("This `gh api` call writes to GitHub.");
}

function checkBash(command) {
  if (ENV_FILE.test(command)) deny("Env files hold secrets: their values never go into the transcript. Use .env.example for names.");
  for (const segment of segmentsOf(command)) {
    const s = programOf(segment);
    const first = s.split(/\s+/)[0];

    if (first === "printenv" || /^env(\s*$|\s+-)/.test(s)) deny("Printing the environment would put secrets in the transcript.");
    if (!READ_ONLY.has(first)) {
      for (const token of segment.match(/[~\w./-]*\.claude\/(?:settings(?:\.local)?\.json|hooks\/[\w./-]*)/g) ?? []) {
        if (isProtectedGuardFile(token)) deny("Guard rails change only through a PR from a separate worktree.");
        ask("This command touches Claude guard-rail files in another worktree.");
      }
    }
    if (/^git(\s+-C\s+\S+)?\s+push\b/.test(s)) checkPush(s);
    if (/^gh\s+pr\s+merge\b/.test(s)) deny("Gabriel merges PRs himself.");
    if (/^gh\s+api\b/.test(s)) checkGhApi(s);
    if (/^(npx\s+)?vercel\b/.test(s) && (/\benv\s+(pull|add|rm|update)\b/.test(s) || /--prod\b|\bpromote\b|\brollback\b/.test(s)))
      deny("This Vercel command reads secrets or changes production.");
  }
}

function checkFileTool(tool, input) {
  const target = input?.file_path ?? input?.notebook_path ?? input?.path ?? "";
  const name = target.split("/").pop() ?? "";
  if (/^\.env(\..+)?$/.test(name) && name !== ".env.example") deny("Env files hold secrets: their values never go into the transcript.");
  if (tool === "Read" || tool === "Grep" || tool === "Glob" || !target) return;
  if (isProtectedGuardFile(target)) deny("Guard rails change only through a PR from a separate worktree.");
  if (GUARD_PATH.test(target)) ask("This edit changes Claude guard-rail files in another worktree.");
}

function checkMcp(tool, input) {
  const name = tool.split("__").pop();
  if (SQL_TOOLS.has(name)) {
    const ref = input?.project_id ?? input?.projectId ?? "";
    if (!NON_PRODUCTION_PROJECTS.has(ref))
      deny(`Agents don't run SQL on ${ref || "this project"}: it isn't on the non-production list in .claude/hooks/guard.mjs. A person runs the repo's SQL in the Supabase SQL editor.`);
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
  // A guard error refuses rather than failing open; fix the hook in a separate worktree.
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
