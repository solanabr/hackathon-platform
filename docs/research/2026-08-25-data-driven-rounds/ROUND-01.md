# Round 1 — Baseline: hardcoded vs data across the whole app

10 parallel agents swept the entire application at feat/home-lp-hub (LP theme, migrations through 00035).
This round is the baseline; later rounds deepen the data-driven theme iteratively.

## What is data today
`hackathons` (identity, dates, status, prize_summary text, metadata jsonb), `hackathon_contents`
(schedule/recordings, kinds), registrations, teams, submissions, platform_roles. Admin CRUD exists for
editions and content.

## What is HARDCODED in code (should become data)

### HIGH-IMPACT
1. **Submission deliverables** hardcoded in 3 places: RPC `00029:36-43` requires
   `project_name, description, pitch_deck_url, pitch_video_url, github_url, github_access_granted`;
   mirrored in `dashboard/page.tsx:50-57` (REQUIRED) and `submission-editor.tsx`. A future edition with
   different deliverables edits RPC + form + dashboard.
2. **Team-size limits** hardcoded (`00029:49` min 2, `00025:47` max 4, team actions + copy) while
   `hackathons.metadata` already carries `team_size_min/max` that nothing reads.
3. **Edition-page sections/partners are code**: DELIVERABLES/PARTNERS/SUPPORTERS blocks
   (`(public)/h/[slug]/page.tsx:52-76`) are hardcoded JSX keyed by slug; section ORDER and visibility
   exist only as JSX. A new edition with a different page = code change.
4. **Prize parsing is fragile**: `prize_summary` split on "·" then " - " (`page.tsx:435-441`), regex in
   `lib/hackathon.ts:138-146`; structured `prizes` already modeled in `00001:75-87` but never read.
5. **Content archive is not an archive**: no bare-link kind (external_url only written by file upload),
   no thumbnails, no kind filter/search, single-column list; kinds misaligned (workshop/mentoria vs
   material/documento overlap); no "ao vivo" concept.

### SHOULD-FIX
- Phase timeline: labels/details hardcoded; fixed `lg:grid-cols-4` breaks a 1- or 3-phase edition.
- Edition-assuming pt-BR copy throughout the edition page (hero CTAs, schedule headings, phase labels).
- `hackathon.name.split(" ")[0]` breaks single-word names.
- Kind labels duplicated in 2 places.

### NITS
- `metadata` jsonb dead (never read/written); status CHECK is a fixed 5-state lifecycle.

## Cross-cutting (from the other dimensions, data-driven relevance)
- **Admin has no create-edition route** — only seeded rows editable; no way to compose a new page.
- **No per-edition health overview** (submissions, content readiness, judging progress).
- **Deliverability risk**: RESEND_FROM is the sandbox `onboarding@resend.dev` (docs/HANDOFF says domain
  unverified) — all emails lost except to the owner.
- **No notifications layer** beyond 3 transactional emails; no deadline reminders.
- **Operational single points of failure**: finalists visibility needs a manual status flip on 09/10;
  Fase-1 content seeds unpublished.
- Migrations 00032-00035 unapplied (deploy-order risk); `/api/*` still redirects to /auth (401s unreachable).

## Where round 2 focuses
The data-driven core: deliverables model, sections table + renderers, content archive model, prizes/partners
structure, and the full map of edition-specific code that should become data.
