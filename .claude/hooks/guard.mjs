#!/usr/bin/env node
// PreToolUse guard. It refuses calls that would expose secrets, write to main, merge, change a production service or
// change these guard rails. SQL through a database connector is the one exception: it asks, and the agent shows the
// owner the statement and waits for a yes. The hook reads the whole command, which prefix rules can't. Exit 0 with no
// output lets the normal permission flow decide. `scripts/guard-selftest.sh` runs it on real inputs.
//
// Sessions run the main checkout's settings and this hook, worktree sessions included. So the live guard rails are the
// main checkout's files, plus the session project's own when the project isn't the main checkout. Those can't be
// written, and the main checkout's HEAD can't be moved; copies inside `.claude/worktrees/*` aren't live, and guard
// changes are made there and land through a PR.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

// Supabase project refs where agents may run SQL without asking. None today: there is no test project.
const NON_PRODUCTION_PROJECTS = new Set([]);

const SQL_TOOLS = new Set([
  "execute_sql", "apply_migration", "run_notebook", "create_notebook",
  "run_sql", "run_sql_transaction", "d1_database_query", "query_render_postgres", "query_database",
]);
const MCP_WRITE_TOOLS = new Set([
  "create_project", "pause_project", "restore_project", "delete_project", "confirm_cost",
  "create_branch", "delete_branch", "merge_branch", "reset_branch", "rebase_branch", "deploy_edge_function",
  "create_project_env", "edit_project_env", "update_project", "add_project_domain", "buy_domain",
  "create_record", "update_record", "replace_domain_dns_records",
  "create_deployment", "deploy_to_vercel", "request_promote", "request_rollback", "assign_alias",
  "create-domain", "remove-domain", "create-api-key", "create-webhook", "send-email", "send-batch-emails", "send-broadcast",
  "d1_database_delete", "kv_namespace_delete", "r2_bucket_delete", "hyperdrive_config_delete",
]);
const ENV_VALUE_TOOLS = new Set(["get_project_env", "filter_project_envs", "get_shared_env_var"]);
// The Vercel and Resend connectors: a tool list by name always misses one, so only reads pass.
const READ_ONLY_CONNECTORS = /^mcp__(plugin_vercel_vercel|7efec743-30e5-4693-a26b-1cad3dfd0a8c|876859bb-c158-4a73-bfba-84ae344dfa0a)__/;
const CONNECTOR_READ = /^(get|list|search|count|aggregate)[_-]/;

const GUARD_PATH = /\.claude\/(settings(\.local)?\.json|hooks(\/|$))|(^|\/)\.mcp\.json$|\/\.claude\.json$/;
const GUARDISH = /\.claude|settings(\.local)?\.json|(^|\/)hooks(\/|$)|guard\.mjs|\.mcp\.json/i;
const WORD_END = "(?=$|[\\s'\")>;|&])";
const ENV_FILE = new RegExp(`(^|[\\s'"=:/(<])\\.env(?!\\.example${WORD_END})((\\.|[*?[{])[\\w.*?[\\]{},-]*)?${WORD_END}`, "i");
const ENV_NAME = /^\.env(\..+)?$/i;
const ENV_MESSAGE = "Env files hold secrets: their values never go into the transcript. Use .env.example for names.";
const GLOB = /[*?[{]/;
const READ_ONLY = new Set(["cat", "head", "tail", "less", "grep", "rg", "wc", "ls", "file", "diff", "jq"]);
const DESTRUCTIVE = new Set(["rm", "rmdir", "mv", "cp", "rsync", "ln", "chmod", "chown", "truncate", "unlink", "shred", "install"]);
const IN_PLACE_WRITERS = new Set(["sed", "perl", "tee", "patch", "awk", "gawk", "dd"]);
const FIND_WRITES = /^-(delete|exec|execdir|ok|okdir|fprint0?|fprintf|fls)$/;
const KEYWORDS = new Set(["then", "do", "else", "elif", "if", "while", "until"]);
// Programs that run another program, with their options that take a value.
const WRAPPERS = {
  env: ["-u", "--unset", "-C", "--chdir"],
  exec: ["-a"],
  sudo: ["-u", "-g", "-h", "-p", "-C", "-D", "-R", "-T", "-U", "-r", "-t"],
  nice: ["-n"],
  timeout: ["-s", "-k", "--signal", "--kill-after"],
  xargs: ["-I", "-n", "-P", "-L", "-d", "-E", "-s", "-a", "-J", "-R", "-S"],
  time: [],
  command: [],
  builtin: [],
  nohup: [],
  eval: [],
};
// gh subcommands that merge, change access, secrets or releases, run workflows, add aliases, or print the token.
const GH_DENIED = {
  secret: /^(set|delete|remove)$/,
  variable: /^(set|delete|remove)$/,
  repo: /^(delete|edit|archive|unarchive|rename|transfer|deploy-key)$/,
  release: /^(create|delete|edit|upload|delete-asset)$/,
  workflow: /^(run|enable|disable)$/,
  auth: /^(token|login|logout|refresh|switch|setup-git)$/,
  alias: /^(set|import)$/,
  "ssh-key": /^(add|delete)$/,
  "gpg-key": /^(add|delete)$/,
};
// gh groups whose arguments are text for GitHub, not local paths to write.
const GH_TEXT_ONLY = new Set(["api", "pr", "issue"]);
const GH_API_VALUE_FLAGS = new Set([
  "-H", "--header", "-X", "--method", "-f", "-F", "--field", "--raw-field", "-q", "--jq", "-t", "--template",
  "--input", "-p", "--preview", "--cache", "--hostname",
]);
// The only REST paths an agent writes to: issues, comments, labels and a PR's own text.
const GH_API_REPO = "^repos\\/(?!\\.\\.?\\/)[\\w.{}:-]+\\/(?!\\.\\.?\\/)[\\w.{}:-]+\\/";
const GH_API_WRITABLE = new RegExp(`${GH_API_REPO}(issues(\\/\\d+(\\/(comments|labels))?)?|issues\\/comments\\/\\d+|pulls\\/\\d+\\/comments(\\/\\d+\\/replies)?|labels)$`);
const GH_API_PATCHABLE = new RegExp(`${GH_API_REPO}pulls\\/\\d+$`);
const SENSITIVE_GRAPHQL = /\b(mergePullRequest|enablePullRequestAutoMerge|mergeBranch|createCommitOnBranch|updateRefs?|deleteRef|\w*BranchProtectionRule|\w*Ruleset|updateRepository|deleteRepository|transferRepository|archiveRepository|\w*Collaborator\w*|\w*DeployKey)\b/;
const GIT_READERS = new Set(["diff", "log", "show", "status", "blame", "ls-files", "ls-tree", "rev-parse", "cat-file"]);
const GIT_FILE_WRITERS = new Set(["checkout", "restore", "rm", "mv", "clean", "reset", "stash", "switch"]);
const GIT_HEAD_MOVERS = new Set([
  "checkout", "switch", "restore", "reset", "stash", "rebase", "merge", "cherry-pick", "revert", "am", "clean", "rm", "mv",
  "apply", "checkout-index", "read-tree", "bisect",
]);
const GIT_VALUE_FLAGS = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--config-env", "--super-prefix"]);
const PULL_FLAGS = new Set(["--ff-only", "-q", "--quiet", "-v", "--verbose", "-p", "--prune", "--tags", "--no-tags", "--no-rebase", "--stat", "--no-stat"]);
const PUSH_VALUE_FLAGS = new Set(["-o", "--push-option", "--repo", "--receive-pack", "--exec"]);
const VERCEL_RUNNERS = new Set(["npx", "bunx", "pnpx", "pnpm", "yarn", "npm", "bun"]);
const VERCEL_VALUE_FLAGS = new Set(["--scope", "-S", "--token", "-t", "--cwd", "--local-config", "-A", "--global-config", "-Q", "--team", "-T"]);
const VERCEL_DENIED_SUBCOMMANDS = new Set(["env", "pull", "promote", "rollback", "redeploy", "alias", "domains", "dns", "certs", "secrets", "remove", "rm"]);
// Programs that run code the guard can't read. A guard path inside that code is refused.
const INTERPRETER = /^(python[\d.]*|pypy[\d.]*|node|nodejs|deno|bun|ruby|perl|php|osascript|lua|Rscript|swift|tclsh)$/;
const GUARD_IN_CODE = /\.claude\/(settings|hooks)|guard\.mjs|\.mcp\.json|\.claude\.json/i;
const SHELLS = new Set(["sh", "bash", "zsh", "dash", "ksh", "fish"]);
const STDIN_FILE = /^(-|\/dev\/stdin|\/dev\/fd\/\d+|\/proc\/self\/fd\/\d+)$/;
const EXTRACTORS = new Set(["tar", "bsdtar", "gtar", "unzip", "cpio"]);
const MAIN_REF = /^(refs\/)?(heads\/)?main$/;
// Git config keys that change what a later `git push` or an unknown subcommand does.
const GIT_PUSH_CONFIG = /^(alias\..+|remote\..+\.push|push\.default)$/i;
const BRANCH_REWRITE = /^(-[a-zA-Z]*[fmMdDcC][a-zA-Z]*|--(force|move|delete|copy))$/;
const UNEXPANDED = Symbol("a glob that can't be expanded");

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

// macOS and Windows match file names without case, so `.claude/Settings.json` is the live settings file there.
const fold = process.platform === "linux" ? (p) => p : (p) => p.toLowerCase();

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

let mainCheckoutDir;
function mainCheckout() {
  if (mainCheckoutDir) return mainCheckoutDir;
  try {
    const out = execFileSync("git", ["-C", projectDir, "rev-parse", "--git-common-dir"], { encoding: "utf8", timeout: 5000 }).trim();
    mainCheckoutDir = real(path.dirname(path.resolve(projectDir, out)));
  } catch {
    mainCheckoutDir = projectDir;
  }
  return mainCheckoutDir;
}

function inside(dir, target) {
  const rel = path.relative(fold(dir), fold(target));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function liveRoots() {
  return [...new Set([projectDir, mainCheckout()])];
}

function inLiveRoot(abs) {
  return liveRoots().some((root) => inside(root, abs) && !inside(path.join(root, ".claude", "worktrees"), abs));
}

function isLiveGuardFile(abs) {
  if (inside(path.join(HOME, ".claude"), abs) && /\/settings(\.local)?\.json$/.test(fold(abs))) return true;
  if (fold(abs) === fold(path.join(HOME, ".claude.json"))) return true;
  return GUARD_PATH.test(fold(abs)) && inLiveRoot(abs);
}

// True when deleting, moving or overwriting `abs` would take live guard files with it: `.claude` itself or any parent.
function holdsLiveGuardFiles(abs) {
  const dirs = [...liveRoots().map((root) => path.join(root, ".claude")), path.join(HOME, ".claude")];
  return dirs.some((dir) => inside(abs, dir)) || fold(abs) === fold(path.join(HOME, ".claude.json"));
}

// A git command aimed here moves the HEAD or the files that every session's guard rails are read from.
function isMainCheckout(dir) {
  const main = mainCheckout();
  return inside(main, dir) && !inside(path.join(main, ".claude", "worktrees"), dir) && !inside(path.join(main, ".git", "worktrees"), dir);
}

function unquote(word) {
  return word.replace(/['"]/g, "");
}

const programName = (word) => path.basename(word.replace(/['"\\]/g, ""));

function expandWord(word) {
  return unquote(word)
    .replace(/\$\{?CLAUDE_PROJECT_DIR\}?/g, projectDir)
    .replace(/\$\{?HOME\}?/g, HOME)
    .replace(/^~(?=\/|$)/, HOME);
}

// Resolves a shell word to an absolute path, or null when it depends on a variable, substitution, glob or unknown folder.
function resolveWord(word, cwd) {
  const t = expandWord(word);
  if (/[$`*?[{]/.test(t) || (cwd === null && !path.isAbsolute(t))) return null;
  return real(path.resolve(cwd ?? "/", t));
}

// The paths a write target names: one path, the matches of a glob, null when a variable hides it, or UNEXPANDED.
function targetsOf(word, cwd) {
  const t = expandWord(word);
  if (/[$`]/.test(t)) return null;
  const glob = GLOB.test(t);
  if (cwd === null && !path.isAbsolute(t)) return glob ? UNEXPANDED : null;
  if (!glob) return [real(path.resolve(cwd ?? "/", t))];
  if (typeof fs.globSync !== "function") return UNEXPANDED;
  try {
    return fs.globSync(t, { cwd: cwd ?? "/" }).map((p) => real(path.resolve(cwd ?? "/", p)));
  } catch {
    return UNEXPANDED;
  }
}

const touchesLiveGuard = (targets) => targets.some((abs) => isLiveGuardFile(abs) || holdsLiveGuardFiles(abs));

// `mode` is "redirect" for a redirect target, "writer" for an in-place writer's argument and "word" for any other
// argument. The first two expand globs; a plain word is checked only when it looks like a guard path.
function checkGuardWrite(word, cwd, mode = "word") {
  const eq = word.indexOf("=");
  for (const w of eq > 0 ? [word, word.slice(eq + 1)] : [word]) {
    const glob = GLOB.test(w);
    const guardish = GUARDISH.test(w);
    if (!guardish && !(mode !== "word" && glob)) continue;
    const targets = mode !== "word" || !glob ? targetsOf(w, cwd) : null;
    if (targets === UNEXPANDED) deny("This command writes through a glob that can't be expanded here; spell the path out.");
    if (targets === null) {
      if (guardish || (mode === "redirect" && glob)) deny("This command writes to a path that may be a guard-rail file and can't be resolved; spell the path out.");
      continue;
    }
    if (touchesLiveGuard(targets)) deny("Guard rails change only through a PR from a worktree under .claude/worktrees.");
  }
}

function checkDestructive(words, cwd) {
  for (const word of words.filter((w) => !w.startsWith("-"))) {
    const targets = targetsOf(word, cwd);
    if (targets === UNEXPANDED) deny("This command removes or moves paths through a glob that can't be expanded here; spell the paths out.");
    if (targets === null) {
      if (GUARDISH.test(word)) deny("This command removes or moves a path that may hold guard-rail files and can't be resolved.");
      continue;
    }
    if (touchesLiveGuard(targets)) deny("This would remove, move or overwrite live guard-rail files.");
  }
}

// An archive unpacked over a folder that holds live guard files replaces them, whatever the archive's source.
function checkExtract(first, args, cwd) {
  const dirs = [];
  let extracts;
  if (first === "unzip") {
    extracts = !args.some((w) => /^-[a-zA-Z]*[lptvzZ]/.test(w));
    args.forEach((w, i) => w === "-d" && dirs.push(args[i + 1] ?? ""));
  } else if (first === "cpio") {
    extracts = args.some((w) => /^(-[a-zA-Z]*[ip]|--extract|--pass-through)/.test(w));
    dirs.push(...args.filter((w) => !w.startsWith("-")));
    if (!dirs.length) dirs.push(".");
  } else {
    const bundle = args[0] && !args[0].startsWith("-") ? args[0] : "";
    extracts = bundle.includes("x") || args.some((w) => /^-[a-zA-Z]*x/.test(w) || w === "--extract" || w === "--get");
    args.forEach((w, i) => {
      if (/^-[a-zA-Z]*C$/.test(w) || w === "--directory" || w === "--cd") dirs.push(args[i + 1] ?? "");
      else if (w.startsWith("--directory=")) dirs.push(w.slice("--directory=".length));
    });
    if (bundle.includes("C")) dirs.push("$");
  }
  if (!extracts) return;
  const places = dirs.length ? dirs.map((dir) => resolveWord(dir, cwd)) : [cwd];
  if (places.includes(null)) deny("The guard can't tell which folder this archive unpacks into; spell the folder out.");
  if (places.some((dir) => isLiveGuardFile(dir) || holdsLiveGuardFiles(dir)))
    deny("This unpacks an archive over live guard-rail files. Unpack it in a worktree or another folder.");
}

// A glob the shell expands can name an env file without spelling it (`.e*`). A leading dot is never matched by `*`.
function checkEnvGlob(word, cwd) {
  const leaf = word.text.split("/").pop();
  if (!word.glob || !/^[.{]/.test(leaf)) return;
  const targets = targetsOf(word.text, cwd);
  if (targets === null) return;
  const hit = targets === UNEXPANDED ? /^\.([e*?[{])/i.test(leaf) : targets.some((abs) => ENV_NAME.test(path.basename(abs)) && fold(path.basename(abs)) !== ".env.example");
  if (hit) deny(ENV_MESSAGE);
}

// A lone `&` separates commands; `&&`, `>&`, `<&` and `&>` don't, and `>|` is a redirect, not a pipe.
const SEPARATOR = /&&|\|\||;|(?<!>)\||\n|(?<![>&<])&(?![>&])/g;

function segmentsOf(command) {
  const out = [];
  let from = 0;
  const add = (to) => {
    const raw = command.slice(from, to);
    if (raw.trim()) out.push({ text: raw.trim(), start: from + raw.length - raw.trimStart().length });
  };
  for (const m of command.matchAll(SEPARATOR)) {
    add(m.index);
    from = m.index + m[0].length;
  }
  add(command.length);
  return out;
}

function closingParen(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")" && --depth === 0) return i;
  }
  return s.length - 1;
}

// The words of the one command that starts at `start`, read with shell quoting: quotes are removed, redirects are
// dropped, and the command ends at the first separator outside quotes and substitutions. `segmentsOf` splits inside
// quotes, which hides the words after a quoted `;`; this reading doesn't. `dynamic` marks a word the shell expands,
// `glob` one with an unquoted pattern. `end` is where the command stops.
function shellWords(command, start) {
  const words = [];
  let text = "";
  let open = false;
  let dynamic = false;
  let glob = false;
  let skip = false;
  const flush = () => {
    if (open && !skip) words.push({ text, dynamic, glob });
    if (open) skip = false;
    text = "";
    open = dynamic = glob = false;
  };
  let i = start;
  for (; i < command.length; i++) {
    const c = command[i];
    if (c === "\\") {
      text += command[++i] ?? "";
      open = true;
    } else if (c === "'") {
      const end = command.indexOf("'", i + 1);
      const stop = end === -1 ? command.length : end;
      text += command.slice(i + 1, stop);
      i = stop;
      open = true;
    } else if (c === '"') {
      open = true;
      for (i++; i < command.length && command[i] !== '"'; i++) {
        if (command[i] === "\\" && i + 1 < command.length && '$`"\\'.includes(command[i + 1])) text += command[++i];
        else {
          if (command[i] === "$" || command[i] === "`") dynamic = true;
          text += command[i];
        }
      }
    } else if (c === "$" && command[i + 1] === "(") {
      const end = closingParen(command, i + 1);
      text += command.slice(i, end + 1);
      i = end;
      open = dynamic = true;
    } else if (c === "`") {
      const end = command.indexOf("`", i + 1);
      const stop = end === -1 ? command.length - 1 : end;
      text += command.slice(i, stop + 1);
      i = stop;
      open = dynamic = true;
    } else if (c === ";" || c === "\n" || (c === "|" && command[i - 1] !== ">")) {
      break;
    } else if (c === "&" && command[i - 1] !== ">" && command[i - 1] !== "<" && command[i + 1] !== ">") {
      break;
    } else if (c === ">" || c === "<" || c === "&") {
      if (/^\d*$/.test(text)) text = "";
      else flush();
      open = false;
      while ("><&|".includes(command[i + 1] ?? " ")) i++;
      skip = true;
    } else if (/\s/.test(c)) {
      flush();
    } else {
      if (c === "$") dynamic = true;
      if (GLOB.test(c)) glob = true;
      text += c;
      open = true;
    }
  }
  flush();
  words.end = i;
  return words;
}

// Drops grouping, shell keywords, `VAR=value` assignments and wrappers, so the first word is the program that runs,
// named without its folder, quotes or backslashes. `dropped` counts the words removed from the front.
function programOf(input) {
  let words = [...input];
  const last = words.at(-1)?.replace(/[)}]+$/, "");
  if (last !== undefined) words = last ? [...words.slice(0, -1), last] : words.slice(0, -1);
  let dropped = 0;
  let viaXargs = false;
  const drop = (n) => {
    words = words.slice(n);
    dropped += n;
  };
  for (;;) {
    const head = words[0];
    if (head === undefined) break;
    const bare = head.replace(/^[({!]+/, "");
    if (bare !== head) {
      if (bare) words[0] = bare;
      else drop(1);
      continue;
    }
    if (/^\w+=/.test(head) || KEYWORDS.has(head)) {
      drop(1);
      continue;
    }
    const name = programName(head);
    const valueFlags = WRAPPERS[name];
    if (!valueFlags) break;
    let i = 1;
    while (i < words.length && words[i].startsWith("-")) {
      if (words[i] === "--") {
        i++;
        break;
      }
      i += valueFlags.includes(words[i]) ? 2 : 1;
    }
    if (name === "timeout") i++;
    if (name === "env") {
      while (i < words.length && /^\w+=/.test(words[i])) i++;
      if (i >= words.length) deny("Printing the environment would put secrets in the transcript.");
    }
    if (name === "xargs") viaXargs = true;
    drop(i);
  }
  if (words.length) words[0] = programName(words[0]);
  return { words, dropped, viaXargs };
}

// Commands hidden inside `sh -c '…'`, `eval "…"`, `$(…)`, `<(…)` and backticks, found before the line is split.
function innerCommands(command) {
  const out = [];
  for (const m of command.matchAll(/(?:^|[\s;&|(`/\\])(?:(?:ba|z|da|k)?sh|eval)\s+(?:-\S+\s+)*(['"])((?:\\.|(?!\1)[\s\S])*)\1/g)) out.push(m[2]);
  for (const m of command.matchAll(/[$<>]\(([^()]*)\)/g)) out.push(m[1]);
  for (const m of command.matchAll(/`([^`]*)`/g)) out.push(m[1]);
  return out;
}

// Splits `git [global options] <sub> <args>` and keeps every folder the command is aimed at.
function gitArgs(words) {
  const chdir = [];
  const aimed = [];
  let plain = true;
  let i = 1;
  for (; i < words.length && words[i].startsWith("-"); i++) {
    const eq = words[i].startsWith("--") ? words[i].indexOf("=") : -1;
    const flag = eq === -1 ? words[i] : words[i].slice(0, eq);
    const value = eq !== -1 ? words[i].slice(eq + 1) : GIT_VALUE_FLAGS.has(flag) ? (words[++i] ?? "") : null;
    if (flag === "-C") chdir.push(value);
    else if (flag === "--git-dir" || flag === "--work-tree") aimed.push(value);
    if (flag !== "-C" && flag !== "--no-pager" && flag !== "-P") plain = false;
  }
  return { chdir, aimed, plain, globals: words.slice(1, i), sub: words[i], rest: words.slice(i + 1) };
}

function gitOutput(repo, args) {
  try {
    return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", timeout: 5000, stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

// An unknown folder counts as main: the guard can't show that the command runs elsewhere.
function currentBranch(repo) {
  return repo === null ? "main" : gitOutput(repo, ["branch", "--show-current"]);
}

// The one pull the main checkout takes: a fast-forward of main from origin.
function isFastForwardOfMain(rest, repo) {
  const flags = rest.filter((w) => w.startsWith("-"));
  const args = rest.filter((w) => !w.startsWith("-")).map(unquote);
  if (!flags.includes("--ff-only") || !flags.every((f) => PULL_FLAGS.has(f))) return false;
  if (args.length === 2) return args[0] === "origin" && /^(refs\/heads\/)?main$/.test(args[1]);
  if (args.length > 2 || (args.length === 1 && args[0] !== "origin") || repo === null) return false;
  const branch = currentBranch(repo);
  return (
    branch === "main" &&
    gitOutput(repo, ["config", "--get", "branch.main.remote"]) === "origin" &&
    gitOutput(repo, ["config", "--get", "branch.main.merge"]) === "refs/heads/main"
  );
}

function checkPush(rest, onMain, repo) {
  const options = [];
  const args = [];
  for (let i = 0; i < rest.length; i++) {
    const word = unquote(rest[i]);
    if (!word.startsWith("-")) args.push(word);
    else {
      options.push(word);
      if (PUSH_VALUE_FLAGS.has(word)) i++;
    }
  }
  if (options.some((o) => o === "--all" || o === "--mirror" || o === "--branches")) deny("This push includes every branch, main among them.");
  const refspecs = args.slice(1);
  if (refspecs.some((r) => /[*?[]|\{[^}]*(,|\.\.)/.test(r))) deny("A refspec with a pattern can update main; name the branch.");
  if (refspecs.some((r) => /[$`]/.test(r))) deny("A refspec built by the shell can't be read; name the branch.");
  const destination = (ref) => {
    const r = ref.replace(/^\+/, "");
    if (r.includes(":")) return r.split(":").pop();
    return (r === "HEAD" || r === "@") && onMain ? "main" : r;
  };
  if (refspecs.length === 0 && repo !== null) {
    for (const line of gitOutput(repo, ["config", "--get-regexp", "^(remote\\..*\\.push|push\\.default)$"]).split("\n")) {
      const [key, value = ""] = line.split(/\s+/);
      if (/^push\.default$/i.test(key) ? value === "matching" : MAIN_REF.test(destination(value)))
        deny("The git config sends this push to main. Pushes to main go through a reviewed PR.");
    }
  }
  const toMain = refspecs.some((r) => MAIN_REF.test(destination(r)));
  if (toMain || (refspecs.length === 0 && onMain)) deny("Pushes to main deploy production; they go through a reviewed PR.");
  if (options.some((o) => /^(--force(-with-lease)?(=.*)?|-f)$/.test(o)) || refspecs.some((r) => r.startsWith("+")))
    ask("Force-push rewrites shared history.");
}

// Commands that move the main branch without a checkout: the main checkout's HEAD follows that branch.
function checkMainRef(sub, rest, mainOrUnknown) {
  const args = rest.filter((w) => !w.startsWith("-")).map(unquote);
  const moved = "This moves the main branch or the main checkout's HEAD. Main changes only through `git pull --ff-only origin main`.";
  const hidden = (ref) => /[$`]/.test(ref ?? "");
  if (sub === "update-ref") {
    if (rest.includes("--stdin")) deny("Ref updates read from stdin can't be checked; name the ref.");
    if (/^refs\/heads\/main$/.test(args[0] ?? "") || hidden(args[0]) || (args[0] === "HEAD" && mainOrUnknown)) deny(moved);
  }
  if (sub === "symbolic-ref" && args.length > 1 && (hidden(args[0]) || (args[0] === "HEAD" && mainOrUnknown))) deny(moved);
  if (sub === "branch" && rest.some((w) => BRANCH_REWRITE.test(w))) {
    const onlyForce = !rest.some((w) => /^(-[a-zA-Z]*[mMdDcC][a-zA-Z]*|--(move|delete|copy))$/.test(w));
    const renamesCurrent = rest.some((w) => /^(-[a-zA-Z]*[mM][a-zA-Z]*|--move)$/.test(w)) && args.length < 2 && mainOrUnknown;
    const named = onlyForce ? args.slice(0, 1) : args;
    if (renamesCurrent || named.some((ref) => MAIN_REF.test(ref) || hidden(ref))) deny(moved);
  }
  if (sub === "fetch" || sub === "pull") {
    for (const word of rest) {
      const spec = unquote(word).replace(/^--refmap=/, "");
      if (!spec.includes(":")) continue;
      const to = spec.split(":").pop();
      if (MAIN_REF.test(to) || /[$`]/.test(to) || (/[*?[{]/.test(to) && !/^refs\/(remotes|tags)\//.test(to))) deny(moved);
    }
  }
  if (sub === "config") {
    const reads = rest.some((w) => /^(--get(-all|-regexp|-urlmatch)?|--list|-l)$/.test(w)) || args[0] === "get" || args[0] === "list";
    const key = args.findIndex((a) => GIT_PUSH_CONFIG.test(a));
    if (!reads && key !== -1 && (key < args.length - 1 || rest.some((w) => /^--(add|replace-all)$/.test(w))))
      deny("This git config changes where a push goes or adds an alias the guard can't follow.");
  }
}

function checkGit(words, cwd, gitEnv, viaXargs = false, depth = 0) {
  const { chdir, aimed, plain, globals, sub, rest } = gitArgs(words);
  const repo = chdir.reduce((at, dir) => resolveWord(dir, at), cwd);
  const places = [repo, ...[...aimed, ...gitEnv].map((dir) => resolveWord(dir, repo))];
  const unknown = places.includes(null);
  const inMain = places.some((dir) => dir !== null && isMainCheckout(dir));
  globals.forEach((word, i) => {
    if (globals[i - 1] === "-c" && GIT_PUSH_CONFIG.test(unquote(word).split("=")[0])) deny("This git config changes where a push goes or adds an alias the guard can't follow.");
  });
  if (viaXargs && (sub === undefined || sub === "push")) deny("A git command whose arguments come from stdin can't be checked; spell them out.");
  // An alias runs another git command, or a shell line after `!`.
  if (sub && /^[\w-]+$/.test(sub) && depth < 3) {
    const alias = gitOutput(repo ?? projectDir, ["config", "--get", `alias.${sub}`]);
    if (alias.startsWith("!")) checkBash(`${alias.slice(1)} ${rest.join(" ")}`, repo, depth + 1);
    else if (alias) checkGit(["git", ...globals, ...alias.split(/\s+/), ...rest], cwd, gitEnv, viaXargs, depth + 1);
  }
  if (sub === "push") checkPush(rest, places.some((dir) => currentBranch(dir) === "main"), repo);
  checkMainRef(sub, rest, inMain || unknown);
  // Putting the main checkout back on main is the one branch change it takes.
  const backToMain = (sub === "switch" || sub === "checkout") && rest.filter((w) => !/^(-q|--quiet)$/.test(w)).map(unquote).join(" ") === "main";
  if (backToMain) return;
  if (GIT_HEAD_MOVERS.has(sub) || (sub === "pull" && (inMain || unknown) && !isFastForwardOfMain(rest, repo))) {
    if (inMain)
      deny("This would move HEAD or rewrite files in the main checkout, whose guard rails every session runs. Work in a worktree; `git fetch` and `git pull --ff-only origin main` stay allowed.");
    if (unknown) deny("The guard can't tell which checkout this git command runs in; spell the folder out.");
  }
  if (sub === "apply" && rest.some((w) => w.startsWith("--unsafe-paths"))) deny("`git apply --unsafe-paths` writes outside the working tree.");
  if (!(GIT_READERS.has(sub) && plain && !rest.some((w) => w.startsWith("--output")))) {
    for (const word of globals) checkGuardWrite(word, cwd);
    for (const word of [sub ?? "", ...rest]) checkGuardWrite(word, repo);
  }
  if (GIT_FILE_WRITERS.has(sub)) checkDestructive(rest, repo);
}

// Indexes of the positional words after `gh`, skipping global flags that take a value.
function ghPositional(words) {
  const out = [];
  for (let i = 1; i < words.length; i++) {
    if (["-R", "--repo", "--hostname"].includes(words[i])) i++;
    else if (!words[i].startsWith("-")) out.push(i);
  }
  return out;
}

// Reads `gh api` arguments the way gh does: the endpoint is the first positional, and a value flag takes the rest of
// its word (`-fbase=main`, `--field=x`) or the next word.
function ghApiCall(args) {
  const call = { endpoint: null, methods: [], fields: [], input: false, dynamic: false };
  const take = (flag, value) => {
    if (flag === "-X" || flag === "--method") {
      call.methods.push(value.text.toUpperCase());
      if (value.dynamic) call.dynamic = true;
    } else if (["-f", "-F", "--field", "--raw-field"].includes(flag)) call.fields.push(value);
    else if (flag === "--input") call.input = true;
  };
  const none = { text: "", dynamic: false };
  for (let i = 0; i < args.length; i++) {
    const word = args[i];
    const w = word.text;
    if (w === "--") {
      call.endpoint ??= args[i + 1]?.text ?? null;
      break;
    }
    if (!w.startsWith("-") || w === "-") {
      if (call.endpoint === null) {
        call.endpoint = w;
        if (word.dynamic) call.dynamic = true;
      }
    } else if (w.startsWith("--")) {
      const eq = w.indexOf("=");
      const flag = eq === -1 ? w : w.slice(0, eq);
      if (GH_API_VALUE_FLAGS.has(flag)) take(flag, eq === -1 ? (args[++i] ?? none) : { text: w.slice(eq + 1), dynamic: word.dynamic });
    } else {
      for (let j = 1; j < w.length; j++) {
        const flag = `-${w[j]}`;
        if (!GH_API_VALUE_FLAGS.has(flag)) continue;
        const attached = w.slice(j + 1).replace(/^=/, "");
        take(flag, attached ? { text: attached, dynamic: word.dynamic } : (args[++i] ?? none));
        break;
      }
    }
  }
  return call;
}

function checkGhApi(args, s) {
  const call = ghApiCall(args);
  const endpoint = (call.endpoint ?? "").replace(/^\/+/, "").split(/[?#]/)[0];
  if (endpoint.toLowerCase() === "graphql") {
    if (call.input) deny("A GraphQL document read from a file can't be checked; inline it.");
    for (const field of call.fields) {
      const eq = field.text.indexOf("=");
      const key = eq === -1 ? null : field.text.slice(0, eq);
      if (key === "query" && field.text[eq + 1] === "@") deny("A GraphQL document read from a file can't be checked; inline it.");
      if (field.dynamic && (key === "query" || key === null || !/^\w+$/.test(key)))
        deny("A GraphQL document built by the shell can't be checked; inline it in single quotes.");
    }
    if (SENSITIVE_GRAPHQL.test(s)) deny("This GraphQL mutation merges, writes refs or commits, or changes access or protection.");
    if (/\bmutation\b/.test(s)) ask("This GraphQL mutation writes to GitHub.");
    return;
  }
  const writes = call.methods.some((m) => m !== "GET") || (call.methods.length === 0 && (call.fields.length > 0 || call.input));
  if (!writes) return;
  if (call.methods.includes("DELETE")) deny("`gh api` DELETE calls are refused.");
  if (call.dynamic) deny("This `gh api` write has a method or path built by the shell; spell it out.");
  const patch = call.methods.length > 0 && call.methods.every((m) => m === "PATCH");
  if (GH_API_WRITABLE.test(endpoint) || (patch && GH_API_PATCHABLE.test(endpoint))) return;
  deny("`gh api` writes only to issues, comments, labels and a PR's title and body. A person does every other write.");
}

function checkGh(words, lexed) {
  const at = ghPositional(words);
  const [group, action] = [words[at[0]], words[at[1]] ?? ""];
  if (group === "pr" && action === "merge") deny("Merges go through the release gate, not an agent's command.");
  if (GH_DENIED[group]?.test(action)) deny(`\`gh ${group} ${action}\` changes access, secrets, releases, workflows or aliases, or prints the token.`);
  if (group === "auth" && action === "status" && words.some((w) => /^(-t|--show-token)$/.test(w))) deny("This prints the GitHub token into the transcript.");
  if (group === "api" && lexed) checkGhApi(lexed.slice(at[0] + 1), words.join(" "));
}

const isVercel = (word) => /^(vercel|vc)(@\S+)?$/.test(programName(word));

// The words after `vercel`/`vc`, run directly or through a package runner (npx -y, bunx, pnpm dlx, bun x, yarn, npm exec).
function vercelArgs(words) {
  if (isVercel(words[0])) return words.slice(1);
  if (!VERCEL_RUNNERS.has(words[0])) return null;
  for (let i = 1; i < words.length; i++) {
    if (words[i] === "-p" || words[i] === "--package") i++;
    else if (isVercel(words[i])) return words.slice(i + 1);
  }
  return null;
}

function checkVercel(words) {
  const args = vercelArgs(words);
  if (!args) return;
  const production = "This Vercel command targets production.";
  let sub;
  for (let i = 0; i < args.length; i++) {
    const word = unquote(args[i]);
    const target = word.match(/^--(?:target|environment)(?:=(.*))?$/);
    if (word === "--prod") deny(production);
    else if (target) {
      if (unquote(target[1] ?? args[++i] ?? "").toLowerCase() === "production") deny(production);
    } else if (VERCEL_VALUE_FLAGS.has(word)) i++;
    else if (!word.startsWith("-")) sub ??= word;
  }
  if (VERCEL_DENIED_SUBCOMMANDS.has(sub)) deny(`\`vercel ${sub}\` reads secrets or changes production.`);
}

// A shell that takes its commands from stdin, a heredoc, a here-string or a substitution runs text the guard can't read.
function checkShell(first, args, text) {
  const flags = args.filter((w) => w.startsWith("-") && w !== "-");
  const script = args.find((w) => !w.startsWith("-") || w === "-");
  const inline = SHELLS.has(first) && flags.some((f) => /^-[a-zA-Z]*c[a-zA-Z]*$/.test(f));
  const fromStdin = script === undefined || STDIN_FILE.test(script) || flags.some((f) => /^-[a-zA-Z]*s[a-zA-Z]*$/.test(f)) || /<<|<\(/.test(text);
  if (!inline && fromStdin) deny("A shell that reads its commands from stdin, a heredoc or a substitution can't be checked; run the commands directly.");
}

function checkCommand({ words, viaXargs }, lexed, { cwd, command, gitEnv, text }) {
  const first = words[0];
  if (!first) return;
  const args = words.slice(1);
  if (first === "printenv") deny("Printing the environment would put secrets in the transcript.");

  const ghGroup = first === "gh" ? words[ghPositional(words)[0]] : null;
  if (DESTRUCTIVE.has(first) || (first === "find" && args.some((w) => FIND_WRITES.test(w)))) checkDestructive(args, cwd);
  else if (!READ_ONLY.has(first) && first !== "find" && first !== "git" && !GH_TEXT_ONLY.has(ghGroup))
    for (const word of args) checkGuardWrite(word, cwd, IN_PLACE_WRITERS.has(first) ? "writer" : "word");
  if (viaXargs && (DESTRUCTIVE.has(first) || IN_PLACE_WRITERS.has(first)) && GUARDISH.test(command))
    deny("This pipes paths that may be guard-rail files into a program that removes or rewrites them.");

  if (INTERPRETER.test(first)) {
    const inCode = args.some((w) => GUARDISH.test(expandWord(w)) && /[^\w./~@:+=,-]/.test(expandWord(w)));
    const fromStdin = command.includes("<<") || !args.some((w) => !w.startsWith("-"));
    if (inCode || (fromStdin && GUARD_IN_CODE.test(command)))
      deny("This runs code that names a guard-rail path, and the guard can't read what the code does. Use the file tools on a worktree copy.");
  }
  if (SHELLS.has(first) || first === "source" || first === ".") checkShell(first, args, text);
  if (EXTRACTORS.has(first)) checkExtract(first, args, cwd);

  if (first === "git") checkGit(words, cwd, gitEnv, viaXargs);
  if (first === "gh") checkGh(words, lexed);
  checkVercel(words);
}

function checkBash(input, cwd0, depth = 0) {
  const command = input.replace(/\\\r?\n/g, "");
  if (ENV_FILE.test(command)) deny(ENV_MESSAGE);
  if (depth < 3) for (const inner of innerCommands(command)) checkBash(inner, cwd0, depth + 1);
  // `GIT_DIR=… git reset` and `export GIT_DIR=…; git reset` aim git at another checkout, like `--git-dir`.
  const gitEnv = [...command.matchAll(/\bGIT_(?:DIR|WORK_TREE|COMMON_DIR)=([^\s;&|]*)/g)].map((m) => m[1]);
  let cwd = cwd0;
  let lexedEnd = 0;
  const dirStack = [];
  for (const { text, start } of segmentsOf(command)) {
    for (const m of text.matchAll(/>[>|&]?\s*([^\s;&|<>()]+)/g)) {
      if (m[0][1] === "&" && /^(\d+|-)$/.test(m[1])) continue;
      checkGuardWrite(m[1], cwd, "redirect");
    }
    const lexed = shellWords(command, start);
    // A segment that starts inside the previous command's quotes is text, not a command of its own.
    const insideQuotes = start < lexedEnd;
    lexedEnd = Math.max(lexedEnd, lexed.end);
    for (const word of lexed) checkEnvGlob(word, cwd);
    const quoted = programOf(lexed.map((w) => w.text));
    const plain = programOf(text.split(/\s+/));
    const head = lexed[quoted.dropped];
    if (!insideQuotes && head?.dynamic && /[$`]/.test(expandWord(head.text)))
      deny("The program name is built by the shell, so the guard can't read it; spell the program out.");

    const [first, ...args] = quoted.words;
    if (first === "cd" || first === "pushd") {
      const target = args.find((w) => !/^[-+]/.test(w));
      if (first === "pushd") dirStack.push(cwd);
      cwd = target ? resolveWord(target, cwd) : first === "cd" && args.length === 0 ? HOME : null;
      continue;
    }
    if (first === "popd") {
      cwd = dirStack.length ? dirStack.pop() : null;
      continue;
    }

    const context = { cwd, command, gitEnv, text };
    if (plain.words.join("\n") !== quoted.words.join("\n")) checkCommand(plain, null, context);
    checkCommand(quoted, lexed.slice(quoted.dropped), context);
  }
}

function checkFileTool(tool, input, cwd) {
  const target = input?.file_path ?? input?.notebook_path ?? input?.path ?? "";
  const name = target.split("/").pop() ?? "";
  if (ENV_NAME.test(name) && fold(name) !== ".env.example") deny("Env files hold secrets: their values never go into the transcript.");
  if (tool === "Read" || tool === "Grep" || tool === "Glob" || !target) return;
  if (isLiveGuardFile(real(path.resolve(cwd, target)))) deny("Guard rails change only through a PR from a worktree under .claude/worktrees.");
}

function checkMcp(tool, input) {
  const name = tool.split("__").pop();
  if (SQL_TOOLS.has(name)) {
    const ref = input?.project_id ?? input?.projectId ?? "";
    if (!NON_PRODUCTION_PROJECTS.has(ref)) ask(`SQL on ${ref || "this database"} needs the owner's yes in chat first: show the statement and wait for it.`);
  }
  if (ENV_VALUE_TOOLS.has(name)) deny(`${name} returns env values, which never go into the transcript.`);
  if (MCP_WRITE_TOOLS.has(name)) deny(`${name} changes a production service; a person does it.`);
  if (READ_ONLY_CONNECTORS.test(tool) && !CONNECTOR_READ.test(name)) deny(`${name} isn't a read, and agents only read from this connector.`);
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
