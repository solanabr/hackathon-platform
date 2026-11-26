#!/usr/bin/env node
// PreToolUse guard. Permission rules match command prefixes only, so `head .env.local` or a bare `git push` on main slips
// past them. This hook reads the whole command: it refuses any read of an env file, and asks a person before a push that
// lands on main, a merge, a write through `gh api`, a Vercel production action, or a change to these guard rails.
// Exit 0 with no output lets the normal permission flow decide.

import { execFileSync } from "node:child_process";

const GUARD_FILES = /(^|[^\w.])\.claude\/(settings(\.local)?\.json|hooks\/)/;
const ENV_FILE = /(^|[\s'"=:/(<])\.env(\.(?!example\b)[\w.-]+)?(?=$|[\s'")>;|&])/;
const READ_ONLY = new Set(["cat", "head", "tail", "less", "grep", "rg", "wc", "ls", "file", "diff"]);

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
  const dir = segment.match(/^git\s+-C\s+(\S+)/)?.[1] ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  try {
    return execFileSync("git", ["-C", dir, "branch", "--show-current"], { encoding: "utf8", timeout: 5000 }).trim();
  } catch {
    return "";
  }
}

function checkPush(s) {
  if (/\s(--force(-with-lease)?\b|-f\b|\+\S)/.test(s)) ask("Force-push rewrites shared history.");
  if (/(\s|:|\/)main(\s|$)/.test(s)) ask("This push targets main, which deploys production.");
  const args = s.replace(/^git(\s+-C\s+\S+)?\s+push\b/, "").split(/\s+/).filter((w) => w && !w.startsWith("-"));
  const refspec = args.slice(1);
  if ((refspec.length === 0 || refspec.every((r) => r === "HEAD")) && currentBranch(s) === "main")
    ask("You're on main: this push would land on main, which deploys production.");
}

function checkBash(command) {
  if (ENV_FILE.test(command)) deny("Env files hold secrets: their values never go into the transcript. Use .env.example for names.");
  for (const segment of segmentsOf(command)) {
    const s = programOf(segment);
    const first = s.split(/\s+/)[0];

    if (first === "printenv" || /^env(\s*$|\s+-)/.test(s)) deny("Printing the environment would put secrets in the transcript.");
    if (!READ_ONLY.has(first) && GUARD_FILES.test(segment)) ask("This command touches the Claude guard rails (.claude/settings or .claude/hooks).");
    if (/^git(\s+-C\s+\S+)?\s+push\b/.test(s)) checkPush(s);
    if (/^gh\s+pr\s+merge\b/.test(s) || /^gh\s+api\b.*\/pulls\/\d+\/merge\b/.test(s))
      ask("Merging deploys production; Gabriel merges.");
    if (/^gh\s+api\b/.test(s) && /\s(-X|--method)[\s=]*(?!GET\b)\w+/i.test(s)) ask("This `gh api` call writes to GitHub.");
    if (/^(npx\s+)?vercel\b/.test(s) && (/\benv\s+(pull|add|rm|update)\b/.test(s) || /--prod\b|\bpromote\b|\brollback\b/.test(s)))
      ask("This Vercel command reads secrets or changes production.");
  }
}

function checkFileTool(tool, input) {
  const path = input?.file_path ?? input?.notebook_path ?? input?.path ?? "";
  const name = path.split("/").pop() ?? "";
  if (/^\.env(\..+)?$/.test(name) && name !== ".env.example") deny("Env files hold secrets: their values never go into the transcript.");
  if (tool !== "Read" && tool !== "Grep" && tool !== "Glob" && GUARD_FILES.test(path))
    ask("This edit changes the Claude guard rails (.claude/settings or .claude/hooks).");
}

// Read stdin as a stream: Claude Code can hand the hook a non-blocking pipe, where a synchronous read fails with EAGAIN.
let raw = "";
for await (const chunk of process.stdin) raw += chunk;

try {
  const event = JSON.parse(raw);
  if (event.tool_name === "Bash") checkBash(event.tool_input?.command ?? "");
  else checkFileTool(event.tool_name, event.tool_input);
} catch (error) {
  // A guard error asks instead of failing, which would block every command.
  const decision = error instanceof Decision ? error : new Decision("ask", `The guard hit an error (${error.message}): check this yourself.`);
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
