# Participant flow audit — Hackathon Solana & Cursor

**Date:** 2026-08-21
**Branch audited:** `feat/lp-redesign` @ `53d035d`, plus the uncommitted working tree
**Scope:** anonymous visitor → submitted project, as implemented today. No code changed.
**Note:** `(public)/h/[slug]/page.tsx` was being redesigned in the working tree while this
audit ran (hero, `PhaseTimeline`, deliverables, partners). Citations to that file reflect
the working-tree version; everything else is committed code.
**Event clock:** Fase 1 online 31/08–07/09 · registration closes 07/09 23:59 · submission
deadline 09/09 12:00 · finalists 10/09 · Pitch Day 12/09 (UPF Parque), judging 14:00–17:30.

Everything below is measured against what a real participant does on a phone during
those twelve days, not against the plan document.

---

## 1. The state machine as built

Gates are evaluated top-down inside each page; the first failing gate redirects.

| # | State | Entry condition | What the user sees | What the app does | To advance |
|---|---|---|---|---|---|
| S0 | Visitor / home | none | Edition gallery with filters, "Como funciona" 4 steps, CTA | `(public)/page.tsx` renders; `listHackathons()` hides `draft` | Click a card → `/h/[slug]` |
| S1 | Edition landing | none (public route, `routes.ts:8`) | Badge open/closed, hero + cover, Quando/Onde/Prêmios, "Quero participar", Luma link, 4-phase timeline, Fase 1 schedule from `public_schedule`, deliverables, partners | `(public)/h/[slug]/page.tsx` (working tree) | Click "Quero participar" → `/h/[slug]/inscricao` |
| S2 | Auth wall | no session on any non-public path | Redirect, then Google/GitHub card | `lib/supabase/middleware.ts:35-40` sets `?redirect=<path>`; `auth-form.tsx:26-28` forwards it to the callback | Complete OAuth |
| S3 | Post-callback routing | session exists | — | `auth/callback/route.ts:21` → `redirect` param, else `state.redirectPath` (`user-state.ts:32`: `/conta` if no `full_name`, else `/`) | — |
| S4 | Profile | `full_name` empty, or user visits `/conta` | Name + GitHub/X/LinkedIn/Telegram form | `conta/page.tsx`; `updateProfile` redirects to `next` when present (`conta/actions.ts:33-34`) | Save |
| S5 | Edition registration | registered? no | Two checkboxes: "me inscrevi no Luma" + "aceito as regras", Luma link | `inscricao/page.tsx:21` bounces to `/conta?next=…` if profile incomplete; `:24` bounces to `/painel` if already registered | Tick both → `hackathon_registrations` upsert → `/painel` |
| S6 | Dashboard (painel) | registration complete | Open/closed badge, "Entrega em <relative countdown>", 3-step checklist, "Ver conteúdos" + WhatsApp | `painel/page.tsx:24` bounces to `/inscricao` when unregistered | Click a step |
| S7 | Content index | registered | 6 items — **today: empty state**, see B1 | `conteudos/page.tsx:32` gate; `listContents` returns only `published` rows (RLS `00016:121-122`) | Click an item |
| S8 | Content detail | registered | Title, speaker, YouTube embed, description, external link | `conteudos/[contentId]/page.tsx` | Back link to index |
| S9 | No team | registered, no accepted membership | "Você não está em um time" + "Criar time" | `time/page.tsx:31-47` | Create, or wait to be added |
| S10 | Create team | registered, no team, **submission window open** | Name + one-line description, "Passo 2 de 3" | `time/novo/page.tsx:27` redirects to painel once `submission_deadline_at` passes | `create_team_with_leader` RPC → `/time` |
| S11 | Team panel | accepted member | Team name, lock badge, members (x/4), add-by-email form (leader, unlocked, <4) | `time/page.tsx` | Add members / go to submission |
| S12 | Added-but-never-logged-in | leader typed an email with no account | *Nothing.* No email is sent. Row is `pending`, `user_id null` | `time/actions.ts:83-91` inserts a ghost row; `handle_new_user` (`00012`) links it **only at signup** | The person must be told out of band, then sign up with that exact address |
| S13 | Submission draft | accepted member with a team | Form (name, description, deck, demo video, GitHub, @kauenet checkbox, socials, cover image), "Salvar rascunho"; leader also gets "Submeter" | `submissao/page.tsx:31` sends teamless users back to painel | Fill required fields |
| S14 | Submitted | leader pressed Submeter and `submit_team` passed | Badge "Submetido", fieldset disabled, both buttons greyed | `api/submit` → RPC (`00016:151-205`) sets `status='submitted'` and `teams.locked` | — |
| S15 | Locked by deadline | cron `auto_lock_overdue` or `submission_deadline_at` passed | "Prazo encerrado. As edições estão bloqueadas" | `submissao/page.tsx:66-70` | — |
| S16 | Finalist / Pitch Day | 10/09, 12/09 | **Does not exist.** `teams.is_finalist`, `finalists_announced_at`, `presential_at`, `voting_opens_at` are never read by any participant page | — | — |

Two structural facts fall out of the table:

- **There is no authenticated edition home.** `/h/[slug]` is a public route
  (`routes.ts:8`), so a logged-in, registered participant who types the domain gets the
  marketing page with a "Quero participar" CTA, not their painel.
- **The only cross-page navigation for a participant is the painel.** The header
  (`header.tsx:23-45`) links to `/`, `/conta`, `Sair`, and `/admin` for admins — never to
  the painel, the content, the team or the submission.

---

## 2. Gaps, ranked by damage to a real participant

### G1. The leader cannot see who is blocking the submission
**Where:** `00016_multi_edition.sql:189-197` (RPC counts accepted members with
`luma_confirmed_at is null`), surfaced as one flat string in
`submission-editor.tsx:66-67` and `api/submit/route.ts:14-17`.
**Impact:** at 11:40 on 09/09 the leader presses "Submeter projeto" and reads
"Todos os integrantes precisam confirmar a inscrição no Luma antes da submissão."
It does not say who, and `time/page.tsx:80-93` shows only `accepted`/`pending`/`Sem
conta` — never registration state. The leader has to WhatsApp four people and guess. If
one is asleep, the team does not submit.
**Fix:** join `hackathon_registrations` into `getTeamForHackathon` (`lib/team.ts:29-38`)
and render a per-member column on the team panel and on the painel ("Ana — inscrição
pendente"). Return the offending names in the RPC error (or pre-check them server-side
in `submissao/page.tsx`) and disable the submit button with the list, before the deadline
rather than at it.

### G2. No authenticated page states the actual deadline
**Where:** `painel/page.tsx:57-60` ("Entrega em" + relative `Countdown`) and
`submissao/page.tsx:58-64` (same) are the only two places a logged-in participant sees
the deadline, and both are relative.
**Impact:** "09 set, 12:00" is printed once, in the phase timeline of the **public**
marketing page (`(public)/h/[slug]/page.tsx:98`, working tree). Behind the login — where
someone actually plans their week — the deadline is "2d 7h", which nobody can schedule
around, and which renders as `—` until hydration (`countdown.tsx:92`). Same for the
registration cut-off: `registration_closes_at` reaches the participant only via the home
card (`edition-card.tsx:100-103`) and the landing's Fase 1 phase (`:91`); `/inscricao`
and `/painel` never mention it.
**Fix:** every countdown gets its absolute companion, server-rendered and pinned to
`America/Sao_Paulo`: "Entrega até **09/09, 12:00** — faltam 2d 7h". Put both deadlines on
the painel and the registration deadline on `/inscricao`. The landing's `PhaseTimeline`
is the right component; the painel should reuse it rather than invent a second one.

### G3. The painel does not answer "where am I"
**Where:** `painel/page.tsx:29-41`.
**Impact:** three static steps — inscrição (always `done: true`), team, submitted. It
never shows: which of the 6 content items are out, whether the user is leader or member,
how many teammates are missing registration, which required submission fields are still
empty, when Fase 1 ends, what the regulamento says, that Pitch Day is 12/09 at UPF
Parque, or anything at all after submission. A participant who opens the platform on
04/09 learns nothing they did not already know.
**Fix:** rebuild the painel as the timeline of *this* edition, reusing the landing's
`components/edition/phase-timeline.tsx` so both sides tell the same story: phase strip
(Fase 1 → inscrições fecham → entrega → finalistas → Pitch Day) with the current phase marked;
"Conteúdos 3/6"; team card with per-member registration state; submission card listing
the missing required fields with a direct link; a post-submission card carrying the
10/09 and 12/09 dates and the venue.

### G4. Nobody tells the person who was added to a team
**Where:** `time/actions.ts:83-91` inserts the row and returns; no email exists in the
repo (no Resend dependency in `package.json`; spec §4.5 defers it to Phase 2).
`add-member-form.tsx:57-61` tells the *leader* the invitee has no account, but never
tells them "we did not notify anyone — send them the link yourself".
**Impact:** the invisible half of the flow. The invitee's entire experience is: someone
tells them on WhatsApp, they sign in, land on `/` (`user-state.ts:32`), see a gallery of
editions with no sign they belong to a team, and have to find the edition → "Quero
participar" → registration before they ever see the team. Many will simply not.
**Fix (no email needed):** (a) change the leader-facing copy to "Envie o link para
ela: hackathon.superteam.com.br/h/<slug> — a plataforma não envia e-mail"; (b) after
login, if the user has a pending or accepted membership in a live edition, send them to
that edition's painel instead of `/` (`user-state.ts:26-33`); (c) show a banner on the
painel for a member whose team exists but who has not registered yet. Resend closes it
properly later.

### G5. A wrong email is unrecoverable, and so is a wrong team
**Where:** `time/actions.ts:56-91` (ghost row keyed on the typed email);
`00012_link_pending_team_members.sql:25-37` (links **only** on `auth.users` insert);
`api/team/member/route.ts:24-32` (only the leader deletes, and never themselves); no
route deletes a team or leaves one.
**Impact:** three failure modes with no UI escape.
1. Leader types an address the person does not use to sign in → ghost row never links →
   "Sem conta" forever, and the person is not in the team at submission time.
2. The person **already had an account** under a different address → the ghost row is
   dead on arrival, because the linking trigger only fires at signup.
3. The person gets impatient and creates their own team → the unique index
   (`00001:133-135`) makes them un-addable; `time/actions.ts:71-79` answers the leader
   with *"Essa pessoa já está no time X"* and there is no "sair do time" or "excluir
   time" anywhere. Only SQL fixes it.
**Fix:** add "Sair do time" for non-leader members and "Excluir time" for a leader whose
team has no other accepted member and is unlocked; make the leader-side add form warn
explicitly that it must be the exact login address; when adding an email that matches no
account, offer a "já tem conta com outro e-mail?" hint.

### G6. The participant cannot find out which email their account uses
**Where:** `conta/page.tsx:15-27` and `profile-form.tsx:13-35` never render
`state.email`, which is already loaded (`user-state.ts:30`). The header shows no
identity either (`header.tsx:23-45`).
**Impact:** the one fact the whole team flow depends on — "tell your leader the exact
email you signed up with" (`time/page.tsx:37`) — cannot be looked up in the product. With
GitHub OAuth the address is frequently one the user does not remember picking.
**Fix:** show the email read-only at the top of `/conta` with a "copiar" affordance, and
put it on the team panel next to the current user's row.

### G7. Luma host approval is never explained
**Where:** `registration-form.tsx:32-46`.
**Impact:** registration on Luma requires host approval; the checkbox says only
"Confirmo que me inscrevi no evento pelo Luma". A participant whose Luma request is still
pending ticks it truthfully, the platform records `luma_confirmed_at`, and the mismatch
surfaces only when an organizer cross-checks the CSV — by then the person may be counted
as a valid team member. There is also no admin screen that lists registrations, so the
cross-check has no home in the product (`/admin` shows counts only, `admin/page.tsx:59-61`).
**Fix:** one line under the checkbox: "A inscrição no Luma passa por aprovação do
organizador — confirme aqui só depois de receber o e-mail de confirmação." Link the Luma
event next to it (already available as `hackathon.luma_url`).

### G8. "Li e aceito as regras" links to nothing
**Where:** `registration-form.tsx:48-51`; `hackathons.rules_url` exists
(`types/db.ts:42`) and is read by no page (`grep rules_url src/` → types only).
**Impact:** the user accepts a regulamento they cannot open. The deliverables that shape
the whole week (10-slide deck, 3-minute demo, private repo + `@kauenet` as collaborator)
now appear on the public landing's deliverables block, but behind the login they surface
only inside the submission form — which a participant typically opens for the first time
on 08/09.
**Fix:** render `rules_url` as a link in the checkbox label and on the painel; seed it for
this edition; repeat the three deliverables on the painel from day one.

### G9. Post-deadline the painel sends you to a page that bounces you back
**Where:** `painel/page.tsx:32-35` always links step 2 to `/time/novo` when there is no
team; `time/novo/page.tsx:27` redirects to the painel once the submission window closes.
**Impact:** after 09/09 12:00 a teamless participant taps "Monte seu time", the screen
flashes and returns to the painel with no message. Same round trip from
`time/page.tsx:40-43`. Classic invisible dead end — the user assumes the site is broken.
**Fix:** compute `isSubmissionWindowOpen` in the painel and render the step as disabled
with the reason ("Prazo de formação de times encerrado em 09/09 12:00"); make
`/time/novo` render an explanation instead of redirecting.

### G10. Registration keeps working after registration closes
**Where:** `inscricao/page.tsx:19-24` — checks `draft`, profile and existing
registration, never `isRegistrationOpen(hackathon)` (`lib/hackathon.ts:24-27`, unused by
every `(app)` page). The public landing flips its badge to "Inscrições encerradas"
(`(public)/h/[slug]/page.tsx:146`) yet keeps the CTA pointing at the same route, relabelled
"Ver detalhes" (`:187-189`) — which lands on a fully working registration form.
**Impact:** on 08/09 someone registers on the platform, creates a team, starts building —
and is not on the Luma list, which is the real roster. Organizer pain, participant
heartbreak.
**Fix:** gate `/inscricao` on `isRegistrationOpen` with a proper closed state ("Inscrições
encerradas em 07/09 23:59"), and change the landing CTA to match when closed.

### G11. `hackathon.status` drives nothing
**Where:** every page tests only `status === "draft"`;
`isVotingOpen` (`lib/hackathon.ts:33-40`) has no caller anywhere.
**Impact:** the spec's premise — "status is what lets an admin open and close phases
without a deploy" (spec §4.3) — is not wired. Organizers cannot pause registration, open
judging, or mark the edition closed from the product; the participant UI cannot phrase
"estamos em julgamento" or "resultado saiu".
**Fix:** one `editionPhase(hackathon, now)` helper combining `status` + the date columns,
consumed by the painel banner, the landing badge and the registration gate.

### G12. No surface at all for finalists or Pitch Day
**Where:** nothing reads `teams.is_finalist`, `finalists_announced_at`, `presential_at`,
`voting_opens_at` (grep across `src/`: only `types/db.ts` and the two public date
formatters). Spec §9 defers this to Phases 3–4, which are not built.
**Impact:** the platform goes silent exactly when engagement peaks. On 10/09 a team has
no way to learn it is a finalist; on 12/09 nothing tells anyone where to be, at what time,
with what to bring. All of that reverts to WhatsApp, which is where people lose
information.
**Fix (cheap version, no admin CRUD):** a painel card after submission that always shows
the fixed schedule — "Finalistas: 10/09 · Pitch Day: 12/09, 09:00, UPF Parque, Passo
Fundo/RS" — plus a conditional "Seu time é finalista" block keyed on `teams.is_finalist`,
which an organizer can flip with one SQL update until `/admin/h/[slug]/finalistas` exists.

### G13. Content is the whole of Fase 1 and there is no way to publish it
**Where:** `00017_seed_solana_cursor.sql:31` seeds all six items with
`published = false`; the participant read path is filtered by RLS
(`00016:121-122`); there is no `/admin/h/[slug]/conteudos` route (spec §4.2 lists it,
Phase 1 plan defers it). See also B1 for the consequence.
**Impact:** the six aulas are the entire online phase. Publishing them requires a SQL
console — during the event, at 21:00, from a phone. Nothing in the product uploads a
YouTube id.
**Fix:** the smallest possible admin form (list rows, edit `youtube_id`, toggle
`published`) is worth more than any other admin screen for this event.

### G14. Missing and mismatched feedback on the actions that matter
- `conta/actions.ts:32-35`: saving the profile without a `next` param returns `{}` — the
  button flips back to "Salvar" and nothing else happens. No confirmation, and `/conta`
  has no link onward, so a user who reaches it from the header is parked.
- `submission-editor.tsx:64-66`: the missing-fields message says "(incluindo a imagem do
  projeto)" but the current RPC (`00016:180-187`) does not require `image_path`, and the
  client's own `allRequiredFilled` (`:140-146`) does not either. The user is told to
  supply something that is optional.
- `submission-editor.tsx:304-305`: the submit button is disabled until every required
  field is filled, with only a `title` tooltip to explain — invisible on touch. The
  leader sees a dead button and no reason.
- `member-row.tsx:39` / `submission-editor.tsx:115`: native `alert`/`confirm` for
  removal and for the irreversible submit. The submit confirmation is one line of text
  for the most consequential action in the product.
- `registration-form.tsx:22-29`: a thrown server action rejects inside `startTransition`
  with no catch — a network blip leaves the button on "Confirmando..." forever.
**Fix:** inline success states; correct the required-field copy; replace the disabled
button with a visible checklist of what is missing; make the submit confirmation a real
dialog that states what freezes (team membership and all fields, for everyone).

### G15. Mobile
The layout itself is responsive (`grid`, `flex-wrap`, `sm:` breakpoints throughout) and
the viewport meta is Next's default — no bug there. What hurts on a phone:
- **No navigation.** `conteudos/page.tsx` has no back link at all (compare
  `time/page.tsx:56-58`, `submissao/page.tsx:47-49`); `/conta` has none either. On mobile
  the browser back button is the only way out, and after an OAuth round trip the history
  is not what the user expects.
- **Deep pages are unreachable in one hop.** Header → painel → conteúdos is the only
  path; there is no persistent per-edition nav (Painel · Conteúdos · Time · Submissão).
- **The submission form is long and its action bar is not sticky**
  (`submission-editor.tsx:291-311`): on a phone the leader scrolls past ten fields to
  reach "Salvar rascunho", with no autosave — a lost tab is a lost draft.
- **iOS photo uploads.** `image-upload.tsx:16` accepts only `image/jpeg|png|webp`.
  Picking a HEIC from Files (rather than the camera roll, which Safari converts) fails
  with "Use JPG, PNG ou WEBP" and no way forward. Low frequency, total blocker when it
  hits.
- The `Countdown` renders `—` until hydration (`countdown.tsx:92`), so the deadline is
  blank for the first paint on a slow connection — one more reason to print the absolute
  date server-side (G2).

---

## 3. Bugs (correctness, not taste)

### B1. The content pages will be empty for every participant
`00017_seed_solana_cursor.sql:31` inserts all six items with `published = false`, and
`hackathon_contents_select_published` (`00016:121-122`) filters unpublished rows out of
the `authenticated` role's reads. `listContents` (`lib/content.ts:35-43`) therefore
returns `[]` and `conteudos/page.tsx:44-48` shows "Nenhum conteúdo liberado ainda".
Meanwhile the **public** landing lists the same six items, because `public_schedule`
(`00016:141-146`) is a postgres-owned view that bypasses RLS. Logged-out visitors see the
programação; registered participants see an empty page. Nothing in the product can flip
the flag (G13). Also, the empty-state text points at
`WHEN.format(hackathon.starts_at)` = 31/08 **09:00**, while the first aula is seeded at
19:00 — the copy will name the wrong hour.

### B2. `authenticated` can write `submissions.status` directly
`00006_batch1_hardening.sql:137-143` deliberately revokes `update (status, submitted_at)`
and re-grants a column list. `00009_restore_table_grants.sql:11-16` then runs
`grant select, insert, update, delete on … public.submissions to authenticated`, a
table-level grant that covers every column, including the two just revoked and any added
later. The surviving guard is RLS `submissions_member_update` (`00005:72-83`), which has
no `WITH CHECK` and only requires membership, `locked = false` and deadline not passed.
Net effect: any accepted member can `PATCH /rest/v1/submissions?team_id=eq.…` with
`{"status":"submitted"}` from the browser console, skipping the leader check, the required
fields and the Luma check in `submit_team`. It does not lock the team (that column is not
granted), so the painel and admin views can show a "submitted" project that never passed
validation. Re-apply the revoke after 00009 in a new migration.

### B3. Expired sessions make the API routes report success
Middleware redirects any non-public path, including `/api/*`, to `/auth`
(`lib/supabase/middleware.ts:35-40`; `/api/submit` and `/api/team/member` are not in
`routes.ts:1-6`). A 307 preserves the method, the login page renders 200, and the callers
only test `res.ok` (`submission-editor.tsx:127`, `member-row.tsx:37`). A member removal
with a stale cookie therefore reports success and does nothing; a submit reports success
and pushes to the painel. API paths should return 401 JSON instead of redirecting.

### B4. The submitted state looks broken rather than finished
`submissao/page.tsx:74-83` keeps rendering the editor after `status === "submitted"`:
the fieldset is disabled and both buttons are visible but greyed
(`submission-editor.tsx:296-309`). There is no "submetido em <data/hora>" — `savedAt`
tracks `updated_at`, not `submitted_at` (`:76`) — and no statement of what comes next.
The most important confirmation in the product is a greyed-out form.

### B5. Auto-accept picks a team for the user
`handle_new_user` (`00012:30-37`) accepts the **oldest** pending invite at signup. Anyone
invited by two teams is silently placed in the first one and, per that migration's own comment, the
second row stays pending forever with no notice to either leader. With no "leave team"
(G5) the choice is final.

### B6. Team-size copy contradicts the enforcement
`time/page.tsx:77` prints `Integrantes ({acceptedCount}/4)` counting only accepted rows,
while the cap counts accepted + pending (`:51`, and server-side `time/actions.ts:49`). A
leader with 2 accepted and 2 ghosts reads "2/4", tries to add a third, and is told the
team is full.

*Not a bug, noted:* `Header` calls `resolveAuthenticatedUserState()` and `isAdminFor()`
on every render (`header.tsx:7-8`) while each page independently calls `requireUser()` —
two to three redundant round trips per navigation. Fine at this scale, worth a `cache()`
wrapper if the painel gets heavier.

---

## 4. Recommended flow changes

Ordered by what to do first if there is one day of work before 31/08.

**1 — Make the painel the edition's control tower** (G1, G2, G3, G12).
One page rewrite, no schema change. Phase strip with the four real dates written out;
"Conteúdos 3/6"; team card listing each member with registration state; submission card
listing missing required fields; post-submission card with 10/09 and 12/09. Everything it
needs is already in `hackathons`, `hackathon_registrations` and `submissions`.

**2 — Land a per-edition nav and an authenticated edition entry** (G15, S1).
A four-item nav (Painel · Conteúdos · Time · Submissão) in the `(app)/h/[slug]` layout,
plus: after login, if the user is registered in a live edition, `redirectPath` goes to
that painel rather than `/` (`user-state.ts:26-33`); and the public landing shows
"Ir para o meu painel" instead of "Quero participar" for a registered user.

**3 — Close the teammate hole without email** (G4, G5, G6).
Show the account email on `/conta`; tell the leader the platform sends nothing and give
them a link to copy; add "Sair do time" and "Excluir time"; warn on the exact-address
requirement at the point of typing.

**4 — Say the dates and the rules out loud** (G2, G7, G8, G10).
Absolute deadlines beside every countdown; the Luma approval caveat under the checkbox;
`rules_url` linked from the terms and the painel; `/inscricao` gated on
`isRegistrationOpen` with a real closed state.

**5 — Ship a minimal content admin** (G13, B1) — and, until it exists, publish the six
rows manually before 31/08, otherwise Fase 1 has no content for anyone who logged in.

**6 — Fix the correctness items** (B2, B3, B4, B6) — B2 is a migration, B3 is a middleware
branch on `/api/`, B4 is a render branch, B6 is a one-line count.

**7 — After the event, revisit** the deferred phases: Resend (added-to-team, submission
received, finalist), `/admin/h/[slug]/conteudos|finalistas`, and the judge screen. They
are the difference between this platform running an event and merely recording one.
