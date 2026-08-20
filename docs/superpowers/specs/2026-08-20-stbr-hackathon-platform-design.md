# Superteam Brasil — Hackathon Platform

**Date:** 2026-08-20
**Owner:** Superteam Brasil
**Domain:** hackathon.superteam.com.br
**First edition:** Hackathon Solana & Cursor — Passo Fundo/RS, 31 Aug → 12 Sep 2026
**Status:** Design
**Supersedes:** `2026-05-14-bh-onchain-submission-design.md` (single-event, BH Onchain)

---

## 1. Purpose

Turn the single-event BH Onchain submission app into Superteam Brasil's standing
hackathon platform: one deploy, one domain, many editions. Each edition brings its
own content, dates, cover art, judges and prizes without a code change.

The platform carries a participant from signup to the pitch stage:

1. Sign in with GitHub, fill a profile once (the profile is global, not per event).
2. Register for an edition (Luma registration is confirmed inside the platform).
3. Watch the edition's content — recorded classes, workshops, materials.
4. Form a team; the leader adds members by email.
5. Submit one project per team, editable until the deadline.
6. If selected as a finalist, get notified by email and pitch on the final day.

Organizers run the whole cycle from `/admin`: create the edition, publish content,
screen submissions, pick the finalists, notify them, and open judge voting.

---

## 2. Out of scope

- **Team matchmaking.** Teams are formed by the leader, who knows who they want.
- **Public / audience voting.** Only the appointed judges vote.
- **Prize disbursement.** Prizes are paid outside the platform.
- **Video hosting.** Content is unlisted YouTube, embedded behind login.
- **Certificates, badges, on-chain anything.**
- **i18n.** pt-BR only. (The Superteam LP uses `next-intl`; this app does not.)
- **Native mobile.** Responsive web.

---

## 3. Roles

| Role | Source of truth | Can |
|---|---|---|
| Visitor | — | See the public home and each edition's landing page |
| Participant | `hackathon_registrations` | Content, own team, own submission |
| Team leader | `teams.leader_id` | Add/remove members, edit and submit the project |
| Judge | `platform_roles` (`judge`, scoped to a `hackathon_id`) | Score submissions in the rounds that are open |
| Admin | `platform_roles` (`admin`, global) | Everything, including granting roles |

Roles move from the env allowlist into the database. `ADMIN_EMAIL_ALLOWLIST` is kept
for one release as a **bootstrap only**: a user in the env list is treated as admin
even with no `platform_roles` row, so the first admin can grant themselves a real row
via `/admin/pessoas` and the env var can then be dropped.

---

## 4. Architecture

### 4.1 Stack

Unchanged from the current app: Next.js 16 App Router, React 19, TypeScript,
Tailwind v4, Supabase (Postgres + Auth + Storage), Vercel, vitest.

New dependency: **Resend** for transactional email.

### 4.2 Routes

Public — `src/app/(public)/`:

| Route | Purpose |
|---|---|
| `/` | Superteam-branded home listing every edition: happening now, upcoming, past |
| `/h/[slug]` | Edition landing: cover, dates, phases, prizes, schedule, judges, CTA |
| `/auth` | GitHub OAuth |
| `/auth/callback` | OAuth callback |

Authenticated — `src/app/(app)/`, gated by middleware:

| Route | Purpose |
|---|---|
| `/conta` | Global profile (name, GitHub, socials, avatar) |
| `/h/[slug]/inscricao` | Per-edition registration: confirm Luma, accept rules |
| `/h/[slug]/painel` | Participation dashboard: what's due, when, current status |
| `/h/[slug]/conteudos` | Content index for the edition |
| `/h/[slug]/conteudos/[contentId]` | Embedded video / material detail |
| `/h/[slug]/time` | Team panel (members, add by email) |
| `/h/[slug]/time/novo` | Create team |
| `/h/[slug]/submissao` | Submission editor |
| `/h/[slug]/votacao` | Judge scoring screen (judges and admins only) |

Admin — `src/app/(app)/admin/`:

| Route | Purpose |
|---|---|
| `/admin` | List editions, create a new one |
| `/admin/pessoas` | Grant / revoke admin and judge roles by email |
| `/admin/h/[slug]` | Edition overview: registrations, teams, submissions |
| `/admin/h/[slug]/conteudos` | CRUD content, publish / unpublish |
| `/admin/h/[slug]/finalistas` | Screening scores, mark the finalists, send the email |
| `/admin/h/[slug]/jurados` | Assign judges to this edition |

`HACKATHON_SLUG` is deleted. Every page resolves its edition from the route via
`getHackathonBySlug(slug)`. Middleware is unchanged — `(app)/` requires a session,
which is what keeps the unlisted video IDs out of public reach.

### 4.3 Data model

Existing tables kept: `users`, `hackathons`, `teams`, `team_members`, `submissions`,
`submission_ratings`. Changes below.

**`users` — narrowed to a profile.** `luma_registered_at` and `age_attestation_at`
are dropped; they are per-edition facts and would wrongly carry over to the next
event. Nothing is backfilled — the Supabase project is new and empty.

**`hackathons` — gains the fields the code currently hardcodes.**

```sql
alter table hackathons
  add column tagline               text,
  add column status                text not null default 'draft'
      check (status in ('draft','published','submissions_open','judging','closed')),
  add column cover_image_path      text,
  add column location_name         text,
  add column location_city         text,
  add column registration_closes_at timestamptz,
  add column finalists_announced_at timestamptz,
  add column voting_opens_at       timestamptz,
  add column voting_closes_at      timestamptz,
  add column finalists_count       integer not null default 20,
  add column prize_summary         text,
  add column rules_url             text,
  add column community_url         text,
  add column updated_at            timestamptz not null default now();
```

`status` is what lets an admin open and close phases without a deploy. Dates drive
the countdowns and the auto-lock cron; `status` drives what the UI offers.

**`hackathon_registrations` — new.** Separates "has an account" from "is in this
edition".

```sql
create table hackathon_registrations (
  id               uuid primary key default gen_random_uuid(),
  hackathon_id     uuid not null references hackathons(id) on delete cascade,
  user_id          uuid not null references users(id) on delete cascade,
  registered_at    timestamptz not null default now(),
  luma_confirmed_at timestamptz,
  terms_accepted_at timestamptz,
  unique (hackathon_id, user_id)
);
```

**`hackathon_contents` — new.** Deliberately not called `lessons`: the first edition
has recorded classes, a live 1:1 mentoring day and side events, and the next edition
will have something else again.

```sql
create table hackathon_contents (
  id            uuid primary key default gen_random_uuid(),
  hackathon_id  uuid not null references hackathons(id) on delete cascade,
  kind          text not null
      check (kind in ('aula','workshop','mentoria','material','link','evento')),
  title         text not null,
  speaker       text,
  description   text,
  youtube_id    text,
  external_url  text,
  location      text,
  scheduled_at  timestamptz,
  duration_minutes integer,
  position      integer not null default 0,
  published     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

`published` lets a class be listed with its date before the recording exists, then
go live the moment the YouTube link is pasted — no deploy.

**`platform_roles` — new.**

```sql
create table platform_roles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  role         text not null check (role in ('admin','judge')),
  hackathon_id uuid references hackathons(id) on delete cascade,
  granted_by   uuid references users(id),
  granted_at   timestamptz not null default now(),
  unique (user_id, role, hackathon_id)
);
```

`hackathon_id` is null for a global admin and required for a judge. A judge sees the
voting screen of their own edition and nothing else.

**`teams` — finalist flag.**

```sql
alter table teams
  add column is_finalist          boolean not null default false,
  add column finalist_notified_at timestamptz;
```

`finalist_notified_at` is what makes the notification idempotent: pressing the button
twice never sends twice.

**`submissions` — aligned to the actual deliverables** (pitch deck of 10 slides,
3-minute demo video, private GitHub repo).

```sql
alter table submissions
  add column pitch_deck_url         text,
  add column github_access_granted  boolean not null default false;
```

`pitch_video_url` is repurposed as the demo video URL. `demo_video_url` stays for
historical rows. Because repos are private, `github_access_granted` is the team's
attestation that they added the organizers' GitHub account as a collaborator —
without it, a judge opens the link on the final day and gets a 404.

**`submission_ratings` — two rounds.**

```sql
alter table submission_ratings
  add column round  text not null default 'triagem'
      check (round in ('triagem','final')),
  add column scores jsonb;

alter table submission_ratings drop constraint submission_ratings_pkey;
alter table submission_ratings
  add primary key (submission_id, admin_id, round);
```

The column is still named `admin_id`; it is renamed to `judge_id` in the same
migration, since judges — not only admins — now write rows.

`grade` stays the 0–10 overall score. `scores` holds per-criterion values once the
criteria are defined, without another migration. One rating surface serves both
screening the field down to the finalists and scoring them on the final day.

### 4.4 Access control

- Single-table reads/writes: RLS, as today.
- Cross-table member flows: the existing `SECURITY DEFINER` RPCs, extended to take a
  `hackathon_id` instead of assuming the active edition.
- Admin/judge mutations: server actions gated by `requireAdmin()` / `requireJudge()`
  writing through the service-role client — the pattern already used by
  `upsertRating`.
- `submission_ratings` keeps RLS-on-no-policies (service role only).
- `platform_roles` is readable by its owner, writable only by service role.

### 4.5 Email (Resend)

`src/lib/email.ts` wraps the Resend client. Three messages:

1. **Added to a team** — sent when a leader adds an email. Today that person is told
   nothing and only finds out by logging in on their own; this closes a real hole.
2. **Finalist selected** — the one from the brief. `notifyFinalists(hackathonId)` is
   an admin server action: it selects teams with `is_finalist = true` and
   `finalist_notified_at is null`, sends, stamps the timestamp, and reports how many
   went out and which failed.
3. **Submission received** — confirmation when a team submits.

Sending requires a verified domain in Resend (DNS records) and a decided sender
address. Until that exists, Resend only delivers to the account owner.

### 4.6 Phase automation

The existing `/api/cron/lock-submissions` endpoint generalizes: it walks every
edition, locks teams whose `submission_deadline_at` has passed, and advances
`status` from `submissions_open` to `judging`. Still bearer-authed with `CRON_SECRET`.

---

## 5. Brand and visual language

The reference is the live Superteam Brasil landing page (`../stbr-lp`) plus the
brand guide in `superteam-brasil-brand-pack/`.

### 5.1 Palette

| Token | Value | Use |
|---|---|---|
| `off-white` | `#f7eacb` | Page background |
| `dark-green` | `#1b231d` | Text, dark cards |
| `emerald` | `#008c4c` | Primary accent, highlight cards |
| `green` | `#2f6b3f` | Borders, secondary text |
| `yellow` | `#ffd23f` | Primary action |

The brand guide prints off-white as `#f5e8ca` and the live LP uses `#f7eacb`. We
follow the LP, since it is what is shipped.

The current `--color-bh-*` tokens are renamed to semantic ones (`surface`, `ink`,
`muted`, `accent`, `emerald`) rather than re-pointed, so no component ends up with a
class named `bh-violet` rendering green.

### 5.2 Typography

Archivo for headings, Inter for body, both via `next/font/google`. The guide
specifies Archivo **Semi Expanded**; Archivo is a variable font with a `wdth` axis,
so the width is requested through `next/font` instead of substituting the normal
width. Space Grotesk is dropped.

### 5.3 Shapes and assets

The 28 organic `morth-*.svg` shapes are part of the brand language and become the
page background, replacing the BH Onchain gradient in `background.tsx`. The full set
is copied into `public/brand/stbr/elements/`; `public/brand/bh/` is deleted.

### 5.4 Edition cards

The home mirrors the LP's `EventsClient.tsx` card: dark-green card, off-white date
badge top-left, cover image under a gradient scrim, host badges, location and time
row, lift on hover. The data source is our database rather than the Luma API.

### 5.5 Edition art vs platform chrome

Event artwork will often clash with the Superteam palette — the Solana & Cursor
flyer is dark neon purple and green. The rule: platform chrome (header, background,
buttons, type) is Superteam; the edition's own art appears as the card cover and the
landing hero. Each edition stores its own cover, so a new event gets its identity
with no CSS change.

### 5.6 Porting from the landing page

The LP is Next 14 / Tailwind 3 / `next-intl`; this app is Next 16 / Tailwind v4 /
pt-BR only. The visual result is meant to be indistinguishable, but the route is a
port, not a copy.

Copied verbatim: every `@keyframes` and animation utility (float, shimmer, wave,
gradient-blink), the component classes (`.btn-primary`, `.btn-secondary`,
`.service-card`, `.stats-card`, `.card-hover`), the `useEntranceAnimation` hook, and
the `next/font` setup for Inter and Archivo.

Ported mechanically: `tailwind.config.ts` `theme.extend` becomes `@theme` in
`globals.css`. Note that the LP overrides Tailwind's built-in `green` scale, so
`--color-green-*` must be declared explicitly or the framework's green leaks through.
`Header`, `Footer` and the `EventsClient` card keep their markup and classes;
`useTranslations` becomes literal pt-BR copy and `@/i18n/navigation` becomes
`next/link`.

Not ported: `next-intl`, and the Luma API data source behind `Events.tsx` — our
cards come from the database.

**No snap-scroll anywhere.** The LP's full-viewport snap sections are a marketing
device; they fight a working page and are the fiddliest thing to get right on mobile.
Every page here scrolls normally. The entrance animations stay — they carry most of
the LP's feel on their own.

---

## 6. Non-functional

- Every `(app)/` page stays `dynamic = 'force-dynamic'`.
- `.maybeSingle()` over `.single()`.
- No comments in code unless they explain a *why*.
- UI copy pt-BR; code, routes and identifiers English.
- Unit tests in `src/lib/__tests__` covering: YouTube ID extraction, submission URL
  validation, finalist selection and rating aggregation, and the idempotency guard on
  finalist notification. No DB integration tests, per existing convention.
- Storage: `project-images` bucket keeps its `{team_id}/...` path convention; a new
  `hackathon-covers` bucket holds edition art (admin-write, public-read).

---

## 7. Decisions and tradeoffs

| Decision | Why | Cost |
|---|---|---|
| Full multi-edition now, not later | The platform is meant to outlive this event; retrofitting slugs later is worse | Largest of the three scoping options, on an 11-day runway |
| Roles in the database, not env | Judges and future admins are added by people, not deploys | One more table, one bootstrap path |
| Generic `hackathon_contents` | This edition alone mixes recorded classes, live mentoring and side events | A `kind` check constraint to maintain |
| Registration split from profile | Otherwise last event's participants look pre-registered for the next | Extra table and an onboarding step per edition |
| Leader adds members by email | Already built, already works | Leader must know the exact login email |
| Pitch as an external link | Chosen over PDF upload | We cannot enforce the 10-slide limit; over-length decks are removed by hand |
| Unlisted YouTube behind login | Truly private videos cannot be embedded at all | A logged-in participant can forward a link |
| One ratings table, two rounds | Screening and final judging are the same mechanic | Composite PK migration |

---

## 8. Open questions

Blocking the seed, not the build:

1. Exact judge emails for Cokinha, Marcelo, Apollo and Ronaldo.
2. Judging criteria and their weights, for both rounds.
3. Sender domain and address for Resend, plus DNS access.
4. The organizers' GitHub account that teams add as a collaborator.
5. Whether the Semana Solana & Cursor side events (09–11 Sep) appear as
   `kind: 'evento'` content or stay off the platform.
6. Whether non-finalists receive a notification too.
7. Whether teams see their own scores or the ranking after the event.

---

## 9. Implementation phases

**Phase 1 — before 31 Aug (opening class).** Migrations and seed; role system; brand
retheme; public home and edition landing; registration; team flow; content pages.
This is what the first class needs.

**Phase 2 — before 07 Sep.** Participation dashboard, submission editor, email
notifications, admin content management.

**Phase 3 — before 09 Sep noon.** Auto-lock, screening view, finalist selection and
the finalist email.

**Phase 4 — before 12 Sep.** Judge voting screen and results view.

Ordering note: Phases 3 and 4 are used weeks after launch. If the run-up to 31 Aug
gets tight, the cut comes from there — never from what the opening class depends on.

---

## 10. Seed — Hackathon Solana & Cursor

Slug `solana-cursor-passo-fundo-2026`. All times America/São_Paulo.

| Field | Value |
|---|---|
| Name | Hackathon Solana & Cursor |
| Location | UPF Parque, Passo Fundo/RS |
| Phase 1 (online) | 31 Aug → 07 Sep |
| Registration closes | 07 Sep, 23:59 |
| Submission deadline | **09 Sep, 12:00** |
| Finalists announced | 10 Sep |
| Phase 2 (in person) | 12 Sep, 09:00–18:00 |
| Judge voting | 12 Sep, 14:00–17:30 |
| Community | https://chat.whatsapp.com/KZcKC67KpTIHgSS3aiKc2i |
| Prizes | US$ 3,000 (Solana) · US$ 200 Cursor credits for the top 3 · Cursor credits for every team · merch kit for 1st · Apollo pre-incubation for the top 4 |
| Finalists | 20 |

Content (`kind: 'aula'` unless noted):

| Date | Title | Speaker |
|---|---|---|
| 31 Aug | Abertura do hackathon — regras, aceleradoras, intro a Solana | Draau |
| 01 Sep | Cursor Night — vibecoding e Cursor avançado | Marcelo, Daniel |
| 02 Sep | A definir | Solange |
| 03 Sep | Desenvolvimento em Solana | Kauê |
| 04 Sep | Business model + pitch | Aceleradora |
| 05 Sep | Mentorias 1:1 (`kind: 'mentoria'`) | — |

Judges: Cokinha (business web3), Marcelo (tech AI), Apollo (dores locais),
Ronaldo (tech Solana).

Deliverables shown to teams: pitch deck of 10 slides, 3-minute demo video, private
GitHub repo with the organizers' account added as collaborator.
