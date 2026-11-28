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

# The hook always prints JSON: a decision, or `{}` to leave it to the permission flow. No output means it didn't run.
DECISION='let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(s?JSON.parse(s).hookSpecificOutput?.permissionDecision??"pass":"no output"))'

pass=0; fail=0
t() { # project cwd expected label json
  local out got
  out=$(printf '%s' "$5" | CLAUDE_PROJECT_DIR=$1 node $NODE_ARGS "$HOOK")
  got=$(printf '%s' "$out" | node -e "$DECISION")
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

# A program word built by the shell can't be read.
b deny 'g=gh; $g pr merge 5'
b deny '"$GH" pr merge 5'
b deny 'X=git; $X push origin main'
b deny '$(which gh) pr merge 5'
b deny '`which gh` pr merge 5'
b pass '"$CLAUDE_PROJECT_DIR/scripts/run.sh"'
b pass 'FOO=$(date) npm test'
b pass 'echo "done; $(date)"'

# A shell that reads its commands from stdin, a heredoc, a here-string or a substitution.
b deny "echo 'gh pr merge 5' | sh"
b deny "printf 'npm test' | bash"
b deny "sh <<< 'npm test'"
b deny $'bash <<EOF\nnpm test\nEOF'
b deny 'bash -s < x.sh'
b deny 'bash /dev/stdin'
b deny 'bash <(echo npm test)'
b deny 'source /dev/stdin'
b deny '. <(echo npm test)'
b deny 'echo npm test | zsh'
b deny 'echo npm test | dash'
b deny 'echo npm test | ksh'
b pass 'bash scripts/guard-selftest.sh'
b pass "sh -c 'git status'"
b pass 'source scripts/setup.sh'

# gh aliases can stand for a refused command.
b deny "gh alias set m 'pr merge'"
b deny 'gh alias import aliases.yml'
b pass 'gh alias list'

# In the main checkout a write target built by the shell can be a live guard file.
for cmd in \
  'f=.claude/settings.json; echo x > $f' \
  'f=.claude/settings.json; echo x > "$f"' \
  'f=.claude/hooks/guard.mjs; rm $f' \
  'cp /dev/null $f' \
  'echo x | tee $f' \
  "sed -i '' s/a/b/ \$f" \
  ': > $f' \
  'ls .claude/hooks/*.mjs | while read f; do rm "$f"; done' \
  'echo x > $TARGET' \
  'echo x >> "$OUT"' \
  'echo x >| $OUT'; do
  b deny "$cmd"
  # From a worktree only a command that names a guard word is refused.
  case $cmd in *.claude*) b deny "$cmd" "$WT" ;; *) b pass "$cmd" "$WT" ;; esac
done
b pass "awk '{print \$1}' notes.txt"
b pass 'echo "$USER" > out.txt'

# Vercel arguments that come from stdin can't be read.
b deny 'echo --prod | xargs vercel'
b deny 'echo env pull | xargs vercel'
b deny 'echo --prod | xargs npx vercel'
b deny 'xargs vercel < args.txt'
b deny 'xargs -n1 vercel deploy'
b pass 'echo hi | xargs echo'

# The main checkout takes read-only git, fetch, worktree commands, `switch main` and the fast-forward pull.
b deny 'git sparse-checkout set docs'
b deny 'git commit -m x'
b deny 'git add .'
b deny 'git config core.worktree /tmp'
b deny 'git config core.hooksPath x'
b deny 'git replace HEAD w1'
b deny 'git gc --prune=now'
b deny 'git lfs pull'
b deny 'git branch feature'
b deny 'git stash'
b deny 'git reflog expire --all'
b pass 'git stash list'
b pass 'git stash show'
b pass 'git worktree add -b feat/x .claude/worktrees/x main'
b pass 'git worktree list'
b pass 'git switch main'
b pass 'git pull --ff-only origin main'
b pass 'git status'
b pass 'git log --oneline -3'
b pass 'git branch'
b pass 'git branch --list "feat/*"'
b pass 'git remote -v'
b pass 'git config --get user.name'
b pass 'git ls-remote origin'
b pass 'git commit -m x' "$WT"
b pass 'git add src' "$WT"

# From any checkout, a target built by the shell is refused when the command names the main checkout or a guard word.
b deny "f=$MAIN/.claude/settings.json; echo x > \$f" "$WT"
b deny "f=$MAIN/.claude/hooks/guard.mjs; rm \$f" "$WT"
b deny "f=$MAIN/.claude/hooks/guard.mjs; cp /dev/null \$f" "$WT"
b deny "d=$MAIN/.claude; rm -rf \$d" "$WT"
b deny "f=$MAIN/.claude/settings.json; echo x >> \"\$f\"" "$WT"
b deny "d=$MAIN; rm -rf \$d/src" "$WT"
b deny 'f=x/Settings.JSON; echo x > $f' "$WT"
b deny 'echo x > $OUT # hooks' "$WT"
b pass 'out=/tmp/x; echo hi > $out' "$WT"
b pass 'rm -rf "$tmp"' "$WT"
b pass 'for f in src/*.ts; do sed -i "" s/a/b/ "$f"; done' "$WT"
# The same through `~` and `$HOME`, with the home folder set to the folder that holds the main checkout.
h() { local out got
  out=$(bash_ev "$2" "$WT" | HOME=$TMP CLAUDE_PROJECT_DIR=$MAIN node $NODE_ARGS "$HOOK")
  got=$(printf '%s' "$out" | node -e "$DECISION")
  if [ "$got" = "$1" ]; then pass=$((pass+1)); else fail=$((fail+1)); printf 'FAIL  expected %-5s got %-5s %s (home)\n' "$1" "$got" "$2"; fi
}
h deny 'd=~/main; rm -rf $d/src'
h deny 'd=$HOME/main; rm -rf $d/src'
h deny 'd=${HOME}/main; echo x > $d/x'
h pass 'd=~/other; rm -rf $d/src'

# git commands that only read pass in the main checkout; ones that create or delete stay refused.
for cmd in 'git tag' 'git tag -l' "git tag --list 'v*'" 'git count-objects -v' 'git notes list' 'git cherry' 'git show-branch' \
  'git range-diff main~1...main' 'git fsck' 'git whatchanged -1'; do
  b pass "$cmd"
done
for cmd in 'git tag v1' 'git tag -d v1' 'git tag -a v1 -m x' 'git notes add -m x' 'git fsck --lost-found' 'git branch -d feature' 'git branch feature'; do
  b deny "$cmd"
done

# A hook that can't run, is empty or can't be read must refuse: the settings command exits 2, which blocks the call.
commands=$(node -e 'const h=require(process.argv[1]).hooks.PreToolUse; console.log(new Set(h.map(x=>x.hooks[0].command)).size)' "$REPO/.claude/settings.json")
if [ "$commands" = 1 ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL  the PreToolUse matchers run different commands"; fi
cmd=$(node -e 'console.log(require(process.argv[1]).hooks.PreToolUse[0].hooks[0].command)' "$REPO/.claude/settings.json")
run_settings() { # expected-exit label project-dir
  local code
  bash_ev 'npm test' "$MAIN" | CLAUDE_PROJECT_DIR=$3 sh -c "$cmd" >/dev/null 2>&1
  code=$?
  if [ "$code" = "$1" ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL  $2: expected exit $1, got $code"; fi
}
for kind in missing empty unreadable working; do
  mkdir -p "$TMP/hook-$kind/.claude/hooks"
  case $kind in
    empty) : > "$TMP/hook-$kind/.claude/hooks/guard.mjs" ;;
    unreadable) cp "$HOOK" "$TMP/hook-$kind/.claude/hooks/guard.mjs"; chmod 000 "$TMP/hook-$kind/.claude/hooks/guard.mjs" ;;
    working) cp "$HOOK" "$TMP/hook-$kind/.claude/hooks/guard.mjs" ;;
  esac
done
run_settings 2 "a missing hook" "$TMP/hook-missing"
run_settings 2 "an empty hook" "$TMP/hook-empty"
run_settings 2 "an unreadable hook" "$TMP/hook-unreadable"
run_settings 0 "a working hook" "$TMP/hook-working"
chmod 600 "$TMP/hook-unreadable/.claude/hooks/guard.mjs"

echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
