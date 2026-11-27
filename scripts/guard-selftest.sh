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
mkdir -p "$MAIN/.claude/hooks" && touch "$MAIN/.claude/hooks/guard.mjs" "$MAIN/.claude/settings.json" "$MAIN/.env.local"
git -C "$MAIN" config branch.main.remote origin
git -C "$MAIN" config branch.main.merge refs/heads/main
# Removes fs.globSync before the hook loads, which is how the hook runs on Node older than 22.
NO_GLOB="--import data:text/javascript,import%20fs%20from%20%27node:fs%27;delete%20fs.globSync"
NODE_ARGS=

pass=0; fail=0
t() { # project cwd expected label json
  local out got
  out=$(printf '%s' "$5" | CLAUDE_PROJECT_DIR=$1 node $NODE_ARGS "$HOOK")
  got=$(printf '%s' "$out" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(s?JSON.parse(s).hookSpecificOutput.permissionDecision:"pass"))')
  if [ "$got" = "$3" ]; then pass=$((pass+1)); else fail=$((fail+1)); printf 'FAIL  expected %-5s got %-5s %s\n' "$3" "$got" "$4"; fi
}
bash_ev() { node -e 'console.log(JSON.stringify({tool_name:"Bash",cwd:process.argv[2],tool_input:{command:process.argv[1]}}))' "$1" "$2"; }
file_ev() { node -e 'console.log(JSON.stringify({tool_name:process.argv[1],cwd:process.argv[3],tool_input:{file_path:process.argv[2]}}))' "$1" "$2" "$3"; }
mcp_ev() { node -e 'console.log(JSON.stringify({tool_name:process.argv[1],tool_input:JSON.parse(process.argv[2])}))' "$1" "$2"; }
b() { t "$MAIN" "${3:-$MAIN}" "$1" "$2" "$(bash_ev "$2" "${3:-$MAIN}")"; }   # b expected command [cwd]
f() { t "${4:-$MAIN}" "$MAIN" "$1" "$2 $3" "$(file_ev "$2" "$3" "$MAIN")"; }   # f expected tool path [project]
m() { t "$MAIN" "$MAIN" "$1" "$2" "$(mcp_ev "$2" "$3")"; }                    # m expected tool json

# Database connectors: SQL asks the owner, other production writes are refused.
m ask  mcp__dbd5cdaf-3f5f-4789-9ff5-decf5836df3d__execute_sql '{"project_id":"dqxeukfkjnoqljovkage","query":"select 1"}'
m ask  mcp__plugin_supabase_supabase__apply_migration '{"project_id":"pywhtmidcrptomrabbrw","name":"x","query":"select 1"}'
m ask  mcp__dbd5cdaf-3f5f-4789-9ff5-decf5836df3d__run_notebook '{"project_id":"dqxeukfkjnoqljovkage"}'
m pass mcp__dbd5cdaf-3f5f-4789-9ff5-decf5836df3d__list_tables '{"project_id":"dqxeukfkjnoqljovkage"}'
m deny mcp__vercel__create_record '{}'
m deny mcp__resend__send-email '{}'
m deny mcp__cloudflare__d1_database_delete '{}'
m pass mcp__Claude_Browser__navigate '{"url":"https://example.com"}'
m deny mcp__plugin_supabase_supabase__rebase_branch '{}'

# The Vercel and Resend connectors are read-only: every tool that isn't a named read is refused, and so are env values.
VERCEL=mcp__7efec743-30e5-4693-a26b-1cad3dfd0a8c
RESEND=mcp__876859bb-c158-4a73-bfba-84ae344dfa0a
m deny mcp__plugin_vercel_vercel__deploy_to_vercel '{}'
m deny mcp__plugin_vercel_vercel__buy_domain '{}'
m deny mcp__plugin_vercel_vercel__web_fetch_vercel_url '{}'
m deny ${VERCEL}__get_project_env '{}'
m deny ${VERCEL}__filter_project_envs '{}'
m deny ${VERCEL}__get_shared_env_var '{}'
m deny ${RESEND}__send-broadcast '{}'
m deny ${RESEND}__update-contact '{}'
m pass ${RESEND}__list-emails '{}'
m pass ${RESEND}__get-email '{}'
for tool in $(node -e 'for (const t of require(process.argv[1]).permissions.allow) if (/^mcp__(plugin_vercel_vercel|7efec743)/.test(t)) console.log(t)' "$REPO/.claude/settings.json"); do
  m pass "$tool" '{}'
done

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
b deny 'git push origin HEAD:heads/main' "$WT"
b deny "git push origin 'refs/heads/*:refs/heads/*'" "$WT"
b deny 'git push origin refs/heads/ma*:refs/heads/ma*' "$WT"
b deny 'git push origin mai{n,n}' "$WT"
b pass 'git push origin HEAD@{1}:w1' "$WT"
b deny 'git push -o x origin'
b pass 'git push -o x origin w1' "$WT"
b deny $'git push origin \\\nmain' "$WT"
b deny "git push -o 'a;b' origin main" "$WT"
b deny "X='a;b' git push origin main" "$WT"
b deny 'git push>/dev/null origin main' "$WT"

# The program is found behind wrappers, a folder, a backslash and a lone `&`.
b deny 'env git push origin main' "$WT"
b deny '/usr/bin/env git push origin main' "$WT"
b deny '\git push origin main' "$WT"
b deny '/usr/bin/git push origin main' "$WT"
b deny 'exec git push origin main' "$WT"
b deny 'eval git push origin main' "$WT"
b deny 'nice -n 5 git push origin main' "$WT"
b deny 'timeout -s KILL 5 git push origin main' "$WT"
b deny '/bin/sh -c "git push origin main"' "$WT"
b deny 'true & git push origin main' "$WT"
b deny 'sleep 0 & gh pr merge 5'
b deny 'x & vercel env pull'
b pass 'npm run dev &'
b pass 'npm test &> /tmp/out.txt'
b pass 'npm test >& /tmp/out.txt'
b pass 'docker ps'

# GitHub: merges, access, secrets, releases, workflows and the token.
b deny 'gh pr merge 125 --squash'
b deny 'gh -R owner/repo pr merge 1'
b deny 'gh pr -R owner/repo merge 1'
b deny 'gh pr --repo=owner/repo merge 1'
b deny '\gh pr merge 5'
b deny 'env gh pr merge 5'
b deny "GH_REPO='a;b' gh pr merge 5"
b deny 'echo $(gh pr merge 5)'
b deny 'echo `gh pr merge 5`'
b deny "gh api graphql -f query='mutation { mergePullRequest(input:{pullRequestId:\"x\"}) { clientMutationId } }'"
b deny "gh api graphql -f query='mutation { createCommitOnBranch(input:{}) { commit { oid } } }'"
b deny 'gh api graphql -F query=@m.graphql'
b ask  "gh api graphql -f query='mutation { resolveReviewThread(input:{threadId:\"x\"}) { thread { id } } }'"
b ask  "gh api graphql -f query='mutation(\$id:ID!) { resolveReviewThread(input:{threadId:\$id}) { thread { id } } }' -f id=abc"
b ask  $'gh api graphql -f query=\'\n  mutation { resolveReviewThread(input:{threadId:"x"}) { thread { id } } }\''
b deny "gh api -H 'X-Foo: 1' graphql -f query='mutation { mergePullRequest(input:{}) { clientMutationId } }'"
b deny "gh api /graphql -f query='mutation { mergePullRequest(input:{}) { clientMutationId } }'"
b deny "gh api graphql -f a='x;' -f query='mutation { mergePullRequest(input:{}) { clientMutationId } }'"
b deny 'gh api graphql -f query="$(cat m.graphql)"'
b deny 'gh api graphql -f query="$Q"'
b deny 'gh api graphql --input q.json'
b pass "gh api graphql -f query='query { viewer { login } }'"
b deny 'gh api -X DELETE repos/o/r/git/refs/heads/x'
b deny 'gh api repos/o/r/git/refs/heads/main -X PATCH -f sha=abc'
b deny 'gh api repos/o/r/contents/README.md -X PUT -f message=x'
b deny 'gh api repos/o/r/collaborators/u -X PUT'
b deny 'gh api repos/o/r/actions/secrets/X -X PUT -f encrypted_value=y'
b deny 'gh api repos/o/r/branches/main/protection -X PUT --input p.json'
# REST writes pass only for issues, comments, labels and a PR's own text.
b pass 'gh api -X POST repos/o/r/issues -f title=x'
b pass 'gh api repos/o/r/issues/5 -X PATCH -f state=closed'
b pass 'gh api repos/o/r/issues/5/comments -F body=@reply.md'
b pass "gh api repos/o/r/issues/5/comments -f body='two words; and more'"
b pass 'gh api repos/o/r/issues/5/labels -f "labels[]=bug"'
b pass 'gh api repos/o/r/issues/comments/9 -X PATCH -F body=@c.md'
b pass 'gh api -X PATCH repos/o/r/pulls/125 -F body=@body.md'
b pass 'gh api repos/o/r/pulls/125/comments/4722994039/replies -F body=@reply.md'
b pass 'gh api repos/o/r/labels -f name=bug'
b pass 'gh api repos/{owner}/{repo}/issues/5/comments -f body=x'
b pass 'gh api repos/o/r/pulls/5/comments --paginate'
b deny 'gh api repos/o/r/merges -fbase=main -fhead=feat'
b deny 'gh api repos/o/r/merges --field=base=main --raw-field=head=feat'
b deny 'gh api repos/o/r/merges --input=body.json'
b deny "gh api -f title='a repos/o/r/issues b' repos/o/r/merges -f base=main"
b deny 'gh api repos/o/r/issues/../merges -f base=main'
b deny 'gh api -X PATCH repos/o/r -f default_branch=x'
b deny 'gh api repos/o/r/actions/workflows/deploy.yml/dispatches -f ref=main'
b deny 'gh api repos/o/r/dispatches -f event_type=x'
b deny 'gh api repos/o/r/releases -f tag_name=v1'
b deny 'gh api repos/o/r/pulls/1/reviews -f event=APPROVE'
b deny 'gh api -X PUT repos/o/r/pulls/1/merge'
b deny 'gh api -X POST repos/o/r/pulls/1 -f title=x'
b deny 'gh api -X DELETE repos/o/r/issues/comments/5'
b deny 'gh api -X "$M" repos/o/r/issues/5 -f state=closed'
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
b deny 'vercel --scope x env pull'
b deny 'vercel --token t env pull'
b deny 'pnpm vercel env ls'
b deny 'bun x vercel env pull'
b deny './node_modules/.bin/vercel env pull'
b deny 'npx -p vercel vc env pull'
b deny 'env vercel env pull'
b deny 'vercel deploy --target "production"'
b pass 'vercel deploy --target=preview'
b pass 'npm install vercel'
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
b deny 'echo x >| .claude/settings.json'
b deny 'echo x >& .claude/settings.json'
b deny 'echo x &> .claude/settings.json'
b deny 'echo x > >(tee .claude/settings.json)'
b deny 'dd if=/dev/null of=.claude/settings.json'
b deny 'cd .claude && dd if=/dev/null of=settings.json'
b deny 'cd -P .claude && sed -i s/a/b/ hooks/guard.mjs'
b deny 'find .claude -name "*.json" -delete'
b deny 'ls -d .claude | xargs rm -rf'
b deny 'git diff --output=.claude/settings.json'
b deny "git -c core.pager='tee .claude/settings.json' log"
b deny 'python3 -c "open(\".claude/settings.json\",\"w\")"'
if [ "$(uname)" = Darwin ]; then # file names match without case there
  f deny Edit "$MAIN/.claude/Settings.json"
  b deny 'echo x > .CLAUDE/hooks/guard.mjs'
  b deny 'rm -rf .Claude'
fi
b pass "sed -i '' s/a/b/ $OTHER/.claude/settings.json"
b pass 'cat .claude/settings.json'

# Reading a guard file, or naming one in text for GitHub, is not a write.
b pass 'git diff .claude'
b pass 'git log -- .claude/hooks/guard.mjs'
b pass 'jq . .claude/settings.json'
b pass 'find .claude -name "*.json"'
b pass "gh api repos/o/r/issues/5/comments -f body='see .claude/hooks/guard.mjs and $MAIN/.claude/settings.json'"

# Without fs.globSync a glob can't be expanded, so a glob write target is refused whatever it looks like.
NODE_ARGS=$NO_GLOB
b deny 'echo x > .c*/h*/g*.mjs'
b deny 'echo x > out*.txt'
b deny "sed -i 's/a.*b/c/' notes.txt"
b deny 'rm -rf build/*'
b pass 'echo x > out.txt'
b pass 'rm -rf build'
NODE_ARGS=
b pass 'echo ok > /tmp/out.txt 2>&1'
b pass 'rm -rf build'

# The main checkout's HEAD and files don't move; worktrees are free.
b deny 'git checkout -b x'
b deny 'git switch w1'
b deny 'git stash'
b deny 'git checkout -- .claude'
b deny 'git apply p.diff'
b deny 'git checkout-index -f -a'
b deny 'git read-tree -u --reset HEAD'
b deny 'git am x.patch'
b deny 'git bisect start'
b deny 'git pull'
b deny 'git pull --ff-only . w1'
b deny 'git pull --ff-only origin w1'
b deny 'git pull --ff-only --rebase'
b pass 'git pull --ff-only origin main'
b pass 'git pull --ff-only'
b pass 'git fetch'
b deny "git -C $MAIN checkout x" "$WT"
b pass 'git checkout -b y' "$WT"
b pass 'git checkout -- .claude' "$WT"
b pass 'git reset --hard HEAD' "$WT"
b pass 'git apply p.diff' "$WT"
b deny 'git apply --unsafe-paths p.diff' "$WT"

# A worktree can't aim git at the main checkout through options, variables or a folder change.
b deny "git --git-dir=$MAIN/.git reset --hard HEAD" "$WT"
b deny "git --work-tree $MAIN checkout -- ." "$WT"
b deny "GIT_DIR=$MAIN/.git git reset --hard HEAD" "$WT"
b deny "export GIT_WORK_TREE=$MAIN; git checkout -- ." "$WT"
b deny "pushd $MAIN && git reset --hard HEAD" "$WT"
b pass "pushd $MAIN && popd && git checkout -b z" "$WT"
b deny 'git -C "$SOMEWHERE" reset --hard HEAD' "$WT"

# A session rooted at a worktree, if one ever runs that worktree's own hook.
f deny Edit "$WT/.claude/hooks/guard.mjs" "$WT"
f deny Edit "$MAIN/.claude/settings.json" "$WT"
f pass Edit "$OTHER/.claude/hooks/guard.mjs" "$WT"

# A project-scoped Supabase connector sends no project_id: SQL still asks the owner.
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
b deny 'head .env*'
b deny 'grep . .env*'
b deny 'cat .e*'
b deny 'cat .ENV.local'
b pass 'ls .g*'
b pass "grep -o '.*' notes.txt"
b deny 'printenv'
b deny 'env'
b deny 'env -0'
b deny '/usr/bin/env'
b pass 'env FOO=1 npm test'
b pass 'npm test'
f pass Edit "$MAIN/src/app/page.tsx"

# An archive unpacked over the main checkout replaces the live guard files.
b deny 'git archive w1 | tar -x'
b deny 'tar -xf a.tar'
b deny 'tar xzf a.tgz'
b deny 'unzip a.zip'
b deny 'tar -xf a.tar -C "$DEST"'
b pass 'tar -xf a.tar' "$WT"
b pass "tar -xf a.tar -C $TMP/out"
b pass 'tar -czf a.tgz src'
b pass 'tar tf a.tar'
b pass 'unzip -l a.zip'

# Code run by an interpreter can't be read, so a guard path inside it is refused.
b deny "python3 -c \"import os;os.remove('.claude/hooks/guard.mjs')\""
b deny "node -e \"require('fs').rmSync('.claude/settings.json')\""
b deny "python3 <<EOF
import os
os.remove('.claude/hooks/guard.mjs')
EOF"
b deny "echo \"os.remove('.claude/settings.json')\" | python3"
b pass 'node scripts/build.mjs'
b pass 'node --test'
b pass 'node .claude/hooks/guard.mjs' "$WT"
b deny 'echo x >| .claude/settings.json'
if [ "$(uname)" = Darwin ]; then
  b deny 'echo x > .claude/Settings.json'
  b deny 'echo x >| .claude/HOOKS/guard.mjs'
fi

# The main branch moves only through a fast-forward pull, from any checkout.
b deny 'git fetch -u . w1:main'
b deny 'git fetch -u . w1:main' "$WT"
b deny 'git fetch origin "refs/heads/*:refs/heads/*"' "$WT"
b deny 'git update-ref refs/heads/main w1'
b deny 'git update-ref refs/heads/main w1' "$WT"
b deny 'git update-ref HEAD w1'
b deny 'git update-ref --stdin' "$WT"
b deny 'git symbolic-ref HEAD refs/heads/w1'
b deny 'git branch -f main w1'
b deny 'git branch -f main w1' "$WT"
b deny 'git branch -M other'
b deny 'git branch -D main' "$WT"
b pass 'git branch -f feature main' "$WT"
b pass 'git branch -D feature' "$WT"
b pass 'git branch --list'
b pass 'git symbolic-ref HEAD'
b pass 'git fetch origin'
b pass 'git fetch origin "+refs/heads/*:refs/remotes/origin/*"'
b pass 'git switch main'
b pass 'git checkout main'
b pass 'git switch -q main'
b deny 'git switch w1'
b deny 'git checkout main -- .'
b deny 'git switch -f main'

# Pushes to main that hide the destination in a variable, an escape, config, an alias or stdin.
b deny 'b=main; git push origin HEAD:$b' "$WT"
b deny 'git push origin HEAD:ma\in' "$WT"
b deny 'git config remote.origin.push HEAD:main && git push' "$WT"
b deny 'git config alias.p "push origin HEAD:main"' "$WT"
b deny 'git config set push.default matching' "$WT"
b deny "git -c alias.p='push origin HEAD:main' p" "$WT"
b deny 'echo HEAD:main | xargs git push origin' "$WT"
b deny 'echo push origin HEAD:main | xargs git' "$WT"
b pass 'git config --get remote.origin.push' "$WT"
b pass 'git config user.name' "$WT"
b pass 'git push -u origin w1' "$WT"
git -C "$MAIN" config alias.shipit 'push origin HEAD:main'
git -C "$MAIN" config alias.shell '!git push origin HEAD:main'
b deny 'git shipit' "$WT"
b deny 'git shell' "$WT"
git -C "$MAIN" config --unset alias.shipit
git -C "$MAIN" config --unset alias.shell
git -C "$MAIN" config remote.origin.push HEAD:main
b deny 'git push' "$WT"
b deny 'git push origin' "$WT"
git -C "$MAIN" config --unset remote.origin.push
b pass 'git push origin' "$WT"

# A hook that can't run must refuse: the settings command exits 2, which blocks the call.
cmd=$(node -e 'console.log(require(process.argv[1]).hooks.PreToolUse[0].hooks[0].command)' "$REPO/.claude/settings.json")
printf '{}' | CLAUDE_PROJECT_DIR=$TMP/no-hook sh -c "$cmd" >/dev/null 2>&1
if [ $? -eq 2 ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL  a missing hook didn't exit 2"; fi

echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
