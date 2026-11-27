#!/bin/bash
# Runs .claude/hooks/guard.mjs on real PreToolUse inputs and checks each decision.
# It builds a throwaway repository with a worktree, so the main-checkout and worktree layouts are real.
# Usage: bash scripts/guard-selftest.sh   (exits non-zero on any mismatch)
set -u
REPO=$(cd "$(dirname "$0")/.." && pwd)
HOOK=$REPO/.claude/hooks/guard.mjs
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
MAIN=$TMP/main
git init -q -b main "$MAIN"
git -C "$MAIN" -c user.email=t@t -c user.name=t commit -q --allow-empty -m init
WT=$MAIN/.claude/worktrees/w1
git -C "$MAIN" worktree add -q -b w1 "$WT"
OTHER=$MAIN/.claude/worktrees/w2
mkdir -p "$MAIN/.claude/hooks" && touch "$MAIN/.claude/hooks/guard.mjs" "$MAIN/.claude/settings.json"

pass=0; fail=0
t() { # project cwd expected label json
  local out got
  out=$(printf '%s' "$5" | CLAUDE_PROJECT_DIR=$1 node "$HOOK")
  got=$(printf '%s' "$out" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(s?JSON.parse(s).hookSpecificOutput.permissionDecision:"pass"))')
  if [ "$got" = "$3" ]; then pass=$((pass+1)); else fail=$((fail+1)); printf 'FAIL  expected %-5s got %-5s %s\n' "$3" "$got" "$4"; fi
}
bash_ev() { node -e 'console.log(JSON.stringify({tool_name:"Bash",cwd:process.argv[2],tool_input:{command:process.argv[1]}}))' "$1" "$2"; }
file_ev() { node -e 'console.log(JSON.stringify({tool_name:process.argv[1],cwd:process.argv[3],tool_input:{file_path:process.argv[2]}}))' "$1" "$2" "$3"; }
mcp_ev() { node -e 'console.log(JSON.stringify({tool_name:process.argv[1],tool_input:JSON.parse(process.argv[2])}))' "$1" "$2"; }
b() { t "$MAIN" "${3:-$MAIN}" "$1" "$2" "$(bash_ev "$2" "${3:-$MAIN}")"; }   # b expected command [cwd]
f() { t "${4:-$MAIN}" "$MAIN" "$1" "$2 $3" "$(file_ev "$2" "$3" "$MAIN")"; }   # f expected tool path [project]
m() { t "$MAIN" "$MAIN" "$1" "$2" "$(mcp_ev "$2" "$3")"; }                    # m expected tool json

# Database connectors: SQL asks Gabriel, other production writes are refused.
m ask  mcp__dbd5cdaf-3f5f-4789-9ff5-decf5836df3d__execute_sql '{"project_id":"dqxeukfkjnoqljovkage","query":"select 1"}'
m ask  mcp__plugin_supabase_supabase__apply_migration '{"project_id":"pywhtmidcrptomrabbrw","name":"x","query":"select 1"}'
m ask  mcp__dbd5cdaf-3f5f-4789-9ff5-decf5836df3d__run_notebook '{"project_id":"dqxeukfkjnoqljovkage"}'
m pass mcp__dbd5cdaf-3f5f-4789-9ff5-decf5836df3d__list_tables '{"project_id":"dqxeukfkjnoqljovkage"}'
m deny mcp__vercel__create_record '{}'
m deny mcp__resend__send-email '{}'
m deny mcp__cloudflare__d1_database_delete '{}'
m pass mcp__Claude_Browser__navigate '{"url":"https://example.com"}'

# Pushes: main is matched on the destination, in every shape.
b deny 'git push'
b deny 'git push origin @'
b deny 'git push --dry-run origin HEAD:main' "$WT"
b deny 'git push origin main' "$WT"
b deny 'git push origin refs/heads/main' "$WT"
b deny 'git push origin "HEAD:main"' "$WT"
b deny 'git push origin :main' "$WT"
b deny 'git push --force origin main' "$WT"
b deny 'git -c k=v push origin HEAD:main' "$WT"
b deny 'env FOO=1 git push origin main' "$WT"
b deny 'bash -c "git push origin main && echo ok"' "$WT"
b deny 'if true; then git push origin main; fi' "$WT"
b deny '{ git push origin main; }' "$WT"
b deny '(git push origin main)' "$WT"
b deny 'git push --all origin' "$WT"
b deny 'git push --mirror origin' "$WT"
b ask  'git push --force-with-lease' "$WT"
b pass 'git push -u origin w1' "$WT"
b pass 'git push origin @' "$WT"
b pass 'git push origin feature/main' "$WT"
b pass 'git push origin main:my-branch' "$WT"

# GitHub: merges, access, secrets, releases, workflows and the token.
b deny 'gh pr merge 125 --squash'
b deny 'gh -R owner/repo pr merge 1'
b deny 'gh pr -R owner/repo merge 1'
b deny 'echo $(gh pr merge 5)'
b deny 'echo `gh pr merge 5`'
b deny "gh api graphql -f query='mutation { mergePullRequest(input:{pullRequestId:\"x\"}) { clientMutationId } }'"
b deny "gh api graphql -f query='mutation { createCommitOnBranch(input:{}) { commit { oid } } }'"
b deny 'gh api graphql -F query=@m.graphql'
b ask  "gh api graphql -f query='mutation { resolveReviewThread(input:{threadId:\"x\"}) { thread { id } } }'"
b pass "gh api graphql -f query='query { viewer { login } }'"
b deny 'gh api -X DELETE repos/o/r/git/refs/heads/x'
b deny 'gh api repos/o/r/git/refs/heads/main -X PATCH -f sha=abc'
b deny 'gh api repos/o/r/contents/README.md -X PUT -f message=x'
b deny 'gh api repos/o/r/collaborators/u -X PUT'
b deny 'gh api repos/o/r/actions/secrets/X -X PUT -f encrypted_value=y'
b deny 'gh api repos/o/r/branches/main/protection -X PUT --input p.json'
b ask  'gh api -X POST repos/o/r/issues -f title=x'
b pass 'gh api repos/o/r/pulls'
b deny 'gh secret set X'
b deny 'gh variable set X'
b deny 'gh repo delete o/r --yes'
b deny 'gh repo edit --visibility public'
b deny 'gh release create v1'
b deny 'gh workflow run deploy.yml'
b deny 'gh auth token'
b deny 'gh auth status --show-token'
b pass 'gh auth status'
b pass 'gh pr view 1'

# Vercel, however it's invoked.
b deny 'npx vercel env pull --help'
b deny 'vercel --prod'
b deny 'vc env ls'
b deny 'pnpm dlx vercel --prod'
b deny 'bunx vercel env pull'
b deny 'npx -y vercel promote dpl_x'
b deny 'vercel deploy --target=production'
b deny 'vercel pull --environment=production'
b deny 'vercel pull'
b pass 'vercel ls'
b pass 'vercel deploy'

# Live guard rails (the main checkout's, since sessions run its hook) can't be written; worktree copies can.
f deny Edit "$MAIN/.claude/hooks/guard.mjs"
f deny Write "$MAIN/.claude/settings.json"
f deny Edit "$MAIN/.mcp.json"
f deny Edit "$HOME/.claude/settings.json"
f deny Edit "$HOME/.claude.json"
f pass Edit "$OTHER/.claude/hooks/guard.mjs"
f pass Read "$MAIN/.claude/settings.json"
b deny 'cat x > .claude/hooks/guard.mjs'
b deny 'head -c0 /dev/null > .claude/settings.json'
b deny 'echo x >> .claude/hooks/guard.mjs'
b deny 'echo x > .clau*/hooks/guard.mjs'
b deny 'echo x > .c[l]aude/settings.json'
b deny 'echo x > .c*/h*/g*.mjs'
b deny 'sed -i s/a/b/ .c*/h*/g*.mjs'
b deny 'sed -i s/a/b/ "$CLAUDE_PROJECT_DIR/.claude/hooks/guard.mjs"'
b deny 'cd .claude && sed -i s/a/b/ hooks/guard.mjs'
b deny 'sed -i s/a/b/ "$SOMEVAR/.claude/hooks/guard.mjs"'
b deny 'rm -rf .claude'
b deny 'mv .claude /tmp/x'
b deny 'rm -rf .'
b pass "sed -i '' s/a/b/ $OTHER/.claude/settings.json"
b pass 'cat .claude/settings.json'
b pass 'echo ok > /tmp/out.txt 2>&1'
b pass 'rm -rf build'

# The main checkout's HEAD and files don't move; worktrees are free.
b deny 'git checkout -b x'
b deny 'git switch w1'
b deny 'git stash'
b deny 'git checkout -- .claude'
b deny 'git pull'
b pass 'git pull --ff-only'
b pass 'git fetch'
b deny "git -C $MAIN checkout x" "$WT"
b pass 'git checkout -b y' "$WT"
b pass 'git checkout -- .claude' "$WT"

# A session rooted at a worktree, if one ever runs that worktree's own hook.
f deny Edit "$WT/.claude/hooks/guard.mjs" "$WT"
f deny Edit "$MAIN/.claude/settings.json" "$WT"
f pass Edit "$OTHER/.claude/hooks/guard.mjs" "$WT"

# A project-scoped Supabase connector sends no project_id: SQL still asks Gabriel.
m ask  mcp__supabase-hackathon__execute_sql '{"query":"select 1"}'
m ask  mcp__supabase-hackathon__apply_migration '{"name":"x","query":"select 1"}'

# A worktree's own guard copy is editable; a symlink from a worktree into the main checkout is still the main checkout.
ln -s "$MAIN/.claude" "$WT/linked-claude"
f pass Edit "$WT/.claude/hooks/guard.mjs"
f deny Edit "$WT/linked-claude/hooks/guard.mjs"
b deny "echo x > $WT/linked-claude/settings.json"

# Secrets and ordinary work.
b deny 'head .env.local'
b pass 'cat .env.example'
b deny 'printenv'
b pass 'npm test'
f pass Edit "$MAIN/src/app/page.tsx"

# A hook that can't run must refuse: the settings command exits 2, which blocks the call.
cmd=$(node -e 'console.log(require(process.argv[1]).hooks.PreToolUse[0].hooks[0].command)' "$REPO/.claude/settings.json")
printf '{}' | CLAUDE_PROJECT_DIR=$TMP/no-hook sh -c "$cmd" >/dev/null 2>&1
if [ $? -eq 2 ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL  a missing hook didn't exit 2"; fi

echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
