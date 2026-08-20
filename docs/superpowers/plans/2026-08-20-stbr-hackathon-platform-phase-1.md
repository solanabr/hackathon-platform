# STBR Hackathon Platform — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Superteam Brasil hackathon platform — multi-edition, STBR-branded — with sign-in, per-edition registration, team formation and the content pages live before the opening class on 31 Aug 2026.

**Architecture:** The existing single-event BH Onchain app becomes multi-edition. `HACKATHON_SLUG` is deleted and every page resolves its edition from the `[slug]` route segment. Roles move from an env allowlist into `platform_roles`. Per-event facts (Luma confirmation, terms) move off `users` into `hackathon_registrations`. Content is a generic `hackathon_contents` table, not a `lessons` table. The BH Onchain dark-purple theme is replaced by the Superteam Brasil palette and typography ported from the live landing page at `../stbr-lp`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4 (`@theme` in CSS, no config file), Supabase (Postgres + Auth + Storage), vitest, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-20-stbr-hackathon-platform-design.md`

## Global Constraints

- UI copy is **pt-BR**. Code, routes, identifiers, table and column names are **English**.
- **No code comments** unless they explain a WHY, never a WHAT.
- Supabase queries use `.maybeSingle()`, never `.single()` — `.single()` throws on zero rows.
- Every page under `src/app/(app)/` exports `export const dynamic = "force-dynamic"`.
- Do NOT add auth checks to `(app)/layout.tsx` — middleware gates auth; a layout check causes redirect loops.
- Tailwind v4: tokens live in `@theme` inside `src/app/globals.css`. There is no `tailwind.config.ts`.
- New tables need explicit `grant` statements — this database lineage lost its `ALTER DEFAULT PRIVILEGES` rows.
- Cross-table member mutations go through `SECURITY DEFINER` RPCs; admin mutations go through server actions gated by `requireAdmin()` writing via `createServiceRoleClient()`.
- Palette (from `../stbr-lp/tailwind.config.ts`): off-white `#f7eacb`, dark green `#1b231d`, emerald `#008c4c`, green `#2f6b3f`, yellow `#ffd23f`.
- Typography: Archivo (headings), Inter (body), both via `next/font/google`.
- Run `npm run build` before any commit that touches types or routes — it is what catches type errors.

---

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `supabase/migrations/00016_multi_edition.sql` | All schema changes: new tables, altered tables, RLS, grants, RPC updates |
| `supabase/migrations/00017_seed_solana_cursor.sql` | The Solana & Cursor edition and its six content rows |
| `src/lib/roles.ts` | Role resolution from `platform_roles`, with env bootstrap |
| `src/lib/registration.ts` | Per-edition registration reads and writes |
| `src/lib/content.ts` | Content queries and YouTube ID extraction |
| `src/hooks/use-entrance-animation.ts` | IntersectionObserver entrance animation, ported from the LP |
| `src/components/layout/edition-card.tsx` | Edition card for the public home |
| `src/components/content/content-embed.tsx` | YouTube iframe embed |
| `src/components/registration/registration-form.tsx` | Luma confirmation + terms |
| `src/components/admin/role-manager.tsx` | Grant/revoke admin and judge by email |
| `src/app/(public)/h/[slug]/page.tsx` | Edition landing |
| `src/app/(app)/h/[slug]/inscricao/page.tsx` | Registration |
| `src/app/(app)/h/[slug]/painel/page.tsx` | Participation dashboard |
| `src/app/(app)/h/[slug]/conteudos/page.tsx` | Content index |
| `src/app/(app)/h/[slug]/conteudos/[contentId]/page.tsx` | Content detail |
| `src/app/(app)/admin/pessoas/page.tsx` | Role management |
| `src/app/(app)/admin/pessoas/actions.ts` | `grantRole` / `revokeRole` server actions |
| `src/app/(app)/conta/page.tsx` | Global profile form |
| `src/app/(app)/conta/actions.ts` | `updateProfile` server action |

**Modified**

| File | Change |
|---|---|
| `src/types/db.ts` | New types; `HACKATHON_SLUG` deleted |
| `src/lib/hackathon.ts` | `getHackathonBySlug`, `listHackathons`, phase helpers |
| `src/lib/admin.ts` | Deleted; replaced by `src/lib/roles.ts` |
| `src/lib/user-state.ts` | Onboarding check drops per-event fields |
| `src/lib/team.ts` | `getTeamForHackathon(userId, hackathonId)` |
| `src/app/globals.css` | STBR tokens, component classes, keyframes |
| `src/app/layout.tsx` | Archivo + Inter; new metadata |
| `src/components/layout/header.tsx`, `footer.tsx`, `background.tsx` | STBR treatment |
| `src/components/ui/button.tsx`, `card.tsx`, `badge.tsx` | Restyled to STBR |
| `src/app/(public)/page.tsx` | Editions list, replacing the BH Onchain landing |
| `src/app/(app)/team/*` | Moved under `src/app/(app)/h/[slug]/time/` |
| `src/lib/supabase/middleware.ts` | Only the bare `/h/<slug>` landing is public |

**Deleted**

`public/brand/bh/`, `src/app/(app)/dashboard/`, `src/app/(app)/onboarding/`, `src/app/(public)/invite/[token]/`, `src/lib/admin.ts`.

---

### Task 1: Schema migration

**Files:**
- Create: `supabase/migrations/00016_multi_edition.sql`

**Interfaces:**
- Produces: tables `hackathon_registrations`, `hackathon_contents`, `platform_roles`; columns `hackathons.status`, `hackathons.community_url`, `teams.is_finalist`, `submissions.pitch_deck_url`, `submission_ratings.round`; RPC `submit_team(uuid)` reading `hackathon_registrations`.

- [ ] **Step 1: Write the migration**

```sql
-- Multi-edition: per-event registration, generic content, DB roles.

alter table hackathons
  add column tagline                text,
  add column status                 text not null default 'draft'
      check (status in ('draft','published','submissions_open','judging','closed')),
  add column cover_image_path       text,
  add column location_name          text,
  add column location_city          text,
  add column registration_closes_at timestamptz,
  add column finalists_announced_at timestamptz,
  add column voting_opens_at        timestamptz,
  add column voting_closes_at       timestamptz,
  add column finalists_count        integer not null default 20,
  add column prize_summary          text,
  add column rules_url              text,
  add column community_url          text,
  add column updated_at             timestamptz not null default now(),
  drop column is_active;

create trigger hackathons_touch_updated_at
  before update on hackathons
  for each row execute function touch_updated_at();

create table hackathon_registrations (
  id                uuid primary key default gen_random_uuid(),
  hackathon_id      uuid not null references hackathons(id) on delete cascade,
  user_id           uuid not null references users(id) on delete cascade,
  registered_at     timestamptz not null default now(),
  luma_confirmed_at timestamptz,
  terms_accepted_at timestamptz,
  unique (hackathon_id, user_id)
);

create index hackathon_registrations_user_idx
  on hackathon_registrations(user_id);

create table hackathon_contents (
  id               uuid primary key default gen_random_uuid(),
  hackathon_id     uuid not null references hackathons(id) on delete cascade,
  kind             text not null
      check (kind in ('aula','workshop','mentoria','material','link','evento')),
  title            text not null,
  speaker          text,
  description      text,
  youtube_id       text,
  external_url     text,
  location         text,
  scheduled_at     timestamptz,
  duration_minutes integer,
  position         integer not null default 0,
  published        boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index hackathon_contents_hackathon_idx
  on hackathon_contents(hackathon_id, position);

create trigger hackathon_contents_touch_updated_at
  before update on hackathon_contents
  for each row execute function touch_updated_at();

create table platform_roles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  role         text not null check (role in ('admin','judge')),
  hackathon_id uuid references hackathons(id) on delete cascade,
  granted_by   uuid references users(id),
  granted_at   timestamptz not null default now(),
  unique (user_id, role, hackathon_id),
  constraint judge_requires_hackathon
    check (role <> 'judge' or hackathon_id is not null)
);

create index platform_roles_user_idx on platform_roles(user_id);

-- NULL hackathon_id (admin) is exempt from the composite unique above, so a
-- second grant would insert a duplicate row. Dedupe admins explicitly.
create unique index platform_roles_admin_uk
  on platform_roles(user_id, role)
  where hackathon_id is null;

alter table teams
  add column is_finalist          boolean not null default false,
  add column finalist_notified_at timestamptz;

alter table submissions
  add column pitch_deck_url        text,
  add column github_access_granted boolean not null default false;

alter table submission_ratings rename column admin_id to judge_id;

alter table submission_ratings
  add column round  text not null default 'triagem'
      check (round in ('triagem','final')),
  add column scores jsonb;

alter table submission_ratings drop constraint submission_ratings_pkey;
alter table submission_ratings
  add primary key (submission_id, judge_id, round);

alter table users
  drop column luma_registered_at,
  drop column age_attestation_at;

alter table hackathon_registrations enable row level security;
alter table hackathon_contents      enable row level security;
alter table platform_roles          enable row level security;

create policy hackathon_registrations_select_own on hackathon_registrations
  for select using (user_id = auth.uid());
create policy hackathon_registrations_insert_own on hackathon_registrations
  for insert with check (user_id = auth.uid());
create policy hackathon_registrations_update_own on hackathon_registrations
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy hackathon_contents_select_published on hackathon_contents
  for select to authenticated using (published);

create policy platform_roles_select_own on platform_roles
  for select using (user_id = auth.uid());

grant select, insert, update on hackathon_registrations to authenticated;
grant select                 on hackathon_contents      to authenticated;
grant select                 on platform_roles          to authenticated;
grant all on hackathon_registrations, hackathon_contents, platform_roles to service_role;

-- Public schedule: the edition landing is a public page (anon client). The
-- view keeps youtube_id/external_url out of anon reach — an unlisted video is
-- only protected because its id never leaks. All rows are visible: the dates
-- are public information even before the recordings exist.
create view public_schedule as
select
  id, hackathon_id, kind, title, speaker, description,
  scheduled_at, location, position, published
from hackathon_contents;

alter view public_schedule enable row level security;

create policy public_schedule_select_anon on public_schedule
  for select to anon;
create policy public_schedule_select_auth on public_schedule
  for select to authenticated;

grant select on public_schedule to anon, authenticated;
grant all on public_schedule to service_role;
```

- [ ] **Step 2: Redefine `submit_team` in the same migration**

`submit_team` currently reads `users.luma_registered_at`, which Step 1 drops. Without this the function compiles but fails at runtime. Append to the same file:

```sql
create or replace function public.submit_team(p_team_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_leader_id uuid;
  v_locked boolean;
  v_deadline timestamptz;
  v_hackathon_id uuid;
  v_sub public.submissions%rowtype;
  v_missing_luma int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select t.leader_id, t.locked, t.hackathon_id, h.submission_deadline_at
    into v_leader_id, v_locked, v_hackathon_id, v_deadline
  from public.teams t
  join public.hackathons h on h.id = t.hackathon_id
  where t.id = p_team_id;

  if v_leader_id is null then raise exception 'team_not_found'; end if;
  if v_leader_id <> v_user_id then raise exception 'not_leader'; end if;
  if v_locked then raise exception 'already_locked'; end if;
  if v_deadline <= now() then raise exception 'deadline_passed'; end if;

  select * into v_sub from public.submissions where team_id = p_team_id;

  if v_sub.project_name is null or length(trim(v_sub.project_name)) = 0
     or v_sub.description is null or length(trim(v_sub.description)) = 0
     or v_sub.pitch_deck_url is null or length(trim(v_sub.pitch_deck_url)) = 0
     or v_sub.pitch_video_url is null or length(trim(v_sub.pitch_video_url)) = 0
     or v_sub.github_url is null or length(trim(v_sub.github_url)) = 0
     or v_sub.github_access_granted is not true then
    raise exception 'missing_required_fields';
  end if;

  select count(*) into v_missing_luma
  from public.team_members tm
  left join public.hackathon_registrations hr
    on hr.user_id = tm.user_id and hr.hackathon_id = v_hackathon_id
  where tm.team_id = p_team_id
    and tm.status = 'accepted'
    and hr.luma_confirmed_at is null;

  if v_missing_luma > 0 then raise exception 'members_missing_luma'; end if;

  update public.submissions
  set status = 'submitted', submitted_at = now()
  where team_id = p_team_id;

  update public.teams set locked = true where id = p_team_id;
end;
$$;

revoke execute on function public.submit_team(uuid) from anon, public;
grant  execute on function public.submit_team(uuid) to authenticated;
```

Note the deliberate change: `image_path` is no longer required (the project image is optional now) and `github_access_granted` is.

- [ ] **Step 3: Apply the migration**

Run it against the Supabase project (SQL editor, or `supabase db push` if the CLI is linked).
Expected: no errors.

- [ ] **Step 4: Verify the schema landed**

Run in the SQL editor:

```sql
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('hackathon_registrations','hackathon_contents','platform_roles');
```

Expected: three rows.

```sql
select column_name from information_schema.columns
where table_name = 'users' and column_name in ('luma_registered_at','age_attestation_at');
```

Expected: zero rows.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/00016_multi_edition.sql
git commit -m "feat(db): multi-edition schema — registrations, contents, roles"
```

---

### Task 2: Seed the Solana & Cursor edition

**Files:**
- Create: `supabase/migrations/00017_seed_solana_cursor.sql`

**Interfaces:**
- Consumes: tables from Task 1.
- Produces: one `hackathons` row with slug `solana-cursor-passo-fundo-2026` and six `hackathon_contents` rows.

- [ ] **Step 1: Write the seed**

All timestamps are America/São_Paulo (`-03`).

```sql
insert into hackathons (
  slug, name, tagline, description,
  status, starts_at, registration_closes_at, submission_deadline_at,
  finalists_announced_at, presential_at, voting_opens_at, voting_closes_at,
  finalists_count, location_name, location_city,
  luma_url, community_url, prize_summary
) values (
  'solana-cursor-passo-fundo-2026',
  'Hackathon Solana & Cursor',
  'Construa soluções reais com IA e blockchain. Não precisa ser expert.',
  'O Hackathon Solana & Cursor reúne estudantes, desenvolvedores, designers e entusiastas para explorar soluções reais com IA e blockchain. Aberto a todos, sem exigir experiência prévia. Fase 1 online de 31 de agosto a 7 de setembro; fase 2 presencial em 12 de setembro no UPF Parque, com Pitch Day, networking e premiação.',
  'published',
  '2026-08-31 09:00-03',
  '2026-09-07 23:59-03',
  '2026-09-09 12:00-03',
  '2026-09-10 12:00-03',
  '2026-09-12 09:00-03',
  '2026-09-12 14:00-03',
  '2026-09-12 17:30-03',
  20,
  'UPF Parque — Parque Científico e Tecnológico',
  'Passo Fundo, RS',
  'https://lu.ma/superteambrasil',
  'https://chat.whatsapp.com/KZcKC67KpTIHgSS3aiKc2i',
  'US$ 3.000 (Solana) · US$ 200 em créditos Cursor para os 3 primeiros · créditos Cursor para todas as equipes · merch kit para o 1º lugar · pré-incubação Apollo para os 4 primeiros'
);

insert into hackathon_contents
  (hackathon_id, kind, title, speaker, description, scheduled_at, position, published)
select h.id, v.kind, v.title, v.speaker, v.description, v.scheduled_at, v.position, false
from hackathons h,
(values
  ('aula','Abertura do hackathon','Draau','Regras, banca e critérios de avaliação. Aceleradoras falando sobre dores do mercado. Introdução a Solana e blockchain.','2026-08-31 19:00-03'::timestamptz,1),
  ('aula','Cursor Night','Marcelo · Daniel','Vibecoding com Marcelo e Cursor avançado com Daniel.','2026-09-01 19:00-03'::timestamptz,2),
  ('aula','Tema a definir','Solange',null,'2026-09-02 19:00-03'::timestamptz,3),
  ('aula','Desenvolvimento em Solana','Kauê','Solana na prática e aplicações.','2026-09-03 19:00-03'::timestamptz,4),
  ('aula','Business model + pitch','Aceleradora','Como estruturar o modelo de negócio e montar o pitch.','2026-09-04 19:00-03'::timestamptz,5),
  ('mentoria','Mentorias 1:1',null,'Suporte direto pelos grupos de WhatsApp ao longo do sábado. Horários e mentores a confirmar.','2026-09-05 10:00-03'::timestamptz,6)
) as v(kind,title,speaker,description,scheduled_at,position)
where h.slug = 'solana-cursor-passo-fundo-2026';
```

Every content row starts `published = false`: the schedule is real but the recordings do not exist yet. An admin flips each one when its YouTube link is pasted.

- [ ] **Step 2: Apply and verify**

```sql
select c.position, c.kind, c.title, c.published
from hackathon_contents c
join hackathons h on h.id = c.hackathon_id
where h.slug = 'solana-cursor-passo-fundo-2026'
order by c.position;
```

Expected: six rows, positions 1–6, all `published = false`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00017_seed_solana_cursor.sql
git commit -m "feat(db): seed Hackathon Solana & Cursor edition"
```

---

### Task 3: Types and edition queries

**Files:**
- Modify: `src/types/db.ts`
- Modify: `src/lib/hackathon.ts`
- Test: `src/lib/__tests__/hackathon.test.ts`

**Interfaces:**
- Produces:
  - `type Hackathon` with `status: HackathonStatus`, `slug`, `registration_closes_at`, `submission_deadline_at`, `voting_opens_at`, `voting_closes_at`, `community_url`, `cover_image_path`
  - `type HackathonContent`, `type HackathonRegistration`, `type PlatformRole`
  - `getHackathonBySlug(slug: string): Promise<Hackathon | null>`
  - `listHackathons(): Promise<Hackathon[]>`
  - `isRegistrationOpen(h: Hackathon, now?: Date): boolean`
  - `isSubmissionWindowOpen(h: Hackathon, now?: Date): boolean`
  - `isVotingOpen(h: Hackathon, now?: Date): boolean`
  - `editionStage(h: Hackathon, now?: Date): "upcoming" | "running" | "finished"`
- `HACKATHON_SLUG` is deleted.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import {
  isRegistrationOpen,
  isSubmissionWindowOpen,
  isVotingOpen,
  editionStage,
} from "../hackathon";
import type { Hackathon } from "@/types/db";

const base = {
  id: "h1",
  slug: "solana-cursor-passo-fundo-2026",
  name: "Hackathon Solana & Cursor",
  status: "published",
  starts_at: "2026-08-31T12:00:00Z",
  registration_closes_at: "2026-09-08T02:59:00Z",
  submission_deadline_at: "2026-09-09T15:00:00Z",
  voting_opens_at: "2026-09-12T17:00:00Z",
  voting_closes_at: "2026-09-12T20:30:00Z",
  presential_at: "2026-09-12T12:00:00Z",
} as unknown as Hackathon;

describe("hackathon phase helpers", () => {
  it("registration is open before the closing date", () => {
    expect(isRegistrationOpen(base, new Date("2026-09-01T10:00:00Z"))).toBe(true);
  });

  it("registration is closed after the closing date", () => {
    expect(isRegistrationOpen(base, new Date("2026-09-08T10:00:00Z"))).toBe(false);
  });

  it("registration is open when no closing date is set", () => {
    const open = { ...base, registration_closes_at: null } as Hackathon;
    expect(isRegistrationOpen(open, new Date("2030-01-01T00:00:00Z"))).toBe(true);
  });

  it("submission window closes exactly at the deadline", () => {
    expect(isSubmissionWindowOpen(base, new Date("2026-09-09T15:00:00Z"))).toBe(false);
    expect(isSubmissionWindowOpen(base, new Date("2026-09-09T14:59:00Z"))).toBe(true);
  });

  it("voting is only open inside its window", () => {
    expect(isVotingOpen(base, new Date("2026-09-12T16:00:00Z"))).toBe(false);
    expect(isVotingOpen(base, new Date("2026-09-12T18:00:00Z"))).toBe(true);
    expect(isVotingOpen(base, new Date("2026-09-12T21:00:00Z"))).toBe(false);
  });

  it("voting is closed when the window is unset", () => {
    const noWindow = { ...base, voting_opens_at: null, voting_closes_at: null } as Hackathon;
    expect(isVotingOpen(noWindow, new Date("2026-09-12T18:00:00Z"))).toBe(false);
  });

  it("stages the edition by its dates", () => {
    expect(editionStage(base, new Date("2026-08-01T00:00:00Z"))).toBe("upcoming");
    expect(editionStage(base, new Date("2026-09-05T00:00:00Z"))).toBe("running");
    expect(editionStage(base, new Date("2026-10-01T00:00:00Z"))).toBe("finished");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/lib/__tests__/hackathon.test.ts`
Expected: FAIL — `isRegistrationOpen is not a function`.

- [ ] **Step 3: Update the types**

In `src/types/db.ts`, delete `export const HACKATHON_SLUG`, remove `luma_registered_at` and `age_attestation_at` from `User`, and add:

```typescript
export type HackathonStatus =
  | "draft"
  | "published"
  | "submissions_open"
  | "judging"
  | "closed";

export type Hackathon = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  status: HackathonStatus;
  starts_at: string;
  registration_closes_at: string | null;
  submission_deadline_at: string;
  finalists_announced_at: string | null;
  presential_at: string | null;
  voting_opens_at: string | null;
  voting_closes_at: string | null;
  finalists_count: number;
  cover_image_path: string | null;
  location_name: string | null;
  location_city: string | null;
  luma_url: string | null;
  community_url: string | null;
  prize_summary: string | null;
  rules_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ContentKind =
  | "aula"
  | "workshop"
  | "mentoria"
  | "material"
  | "link"
  | "evento";

export type HackathonContent = {
  id: string;
  hackathon_id: string;
  kind: ContentKind;
  title: string;
  speaker: string | null;
  description: string | null;
  youtube_id: string | null;
  external_url: string | null;
  location: string | null;
  scheduled_at: string | null;
  duration_minutes: number | null;
  position: number;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type HackathonRegistration = {
  id: string;
  hackathon_id: string;
  user_id: string;
  registered_at: string;
  luma_confirmed_at: string | null;
  terms_accepted_at: string | null;
};

export type PlatformRole = {
  id: string;
  user_id: string;
  role: "admin" | "judge";
  hackathon_id: string | null;
  granted_by: string | null;
  granted_at: string;
};
```

Also add `pitch_deck_url: string | null` and `github_access_granted: boolean` to `Submission`, and `is_finalist: boolean` plus `finalist_notified_at: string | null` to `Team`.

- [ ] **Step 4: Write the implementation**

Replace `src/lib/hackathon.ts` with:

```typescript
import { createServerSupabaseClient } from "./supabase/server";
import type { Hackathon } from "@/types/db";

export async function getHackathonBySlug(slug: string): Promise<Hackathon | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("hackathons")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data as Hackathon | null;
}

export async function listHackathons(): Promise<Hackathon[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("hackathons")
    .select("*")
    .neq("status", "draft")
    .order("starts_at", { ascending: false });
  return (data as Hackathon[] | null) ?? [];
}

export function isRegistrationOpen(h: Hackathon, now: Date = new Date()): boolean {
  if (!h.registration_closes_at) return true;
  return new Date(h.registration_closes_at).getTime() > now.getTime();
}

export function isSubmissionWindowOpen(h: Hackathon, now: Date = new Date()): boolean {
  return new Date(h.submission_deadline_at).getTime() > now.getTime();
}

export function isVotingOpen(h: Hackathon, now: Date = new Date()): boolean {
  if (!h.voting_opens_at || !h.voting_closes_at) return false;
  const t = now.getTime();
  return (
    new Date(h.voting_opens_at).getTime() <= t &&
    new Date(h.voting_closes_at).getTime() > t
  );
}

export function editionStage(
  h: Hackathon,
  now: Date = new Date(),
): "upcoming" | "running" | "finished" {
  const t = now.getTime();
  if (new Date(h.starts_at).getTime() > t) return "upcoming";
  const endsAt = h.voting_closes_at ?? h.presential_at ?? h.submission_deadline_at;
  return new Date(endsAt).getTime() > t ? "running" : "finished";
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/lib/__tests__/hackathon.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add src/types/db.ts src/lib/hackathon.ts src/lib/__tests__/hackathon.test.ts
git commit -m "feat: resolve editions by slug, drop hardcoded hackathon"
```

The build will not pass yet — pages still import `HACKATHON_SLUG`. Task 16 closes that out.

---

### Task 4: Roles from the database

**Files:**
- Create: `src/lib/roles.ts`
- Delete: `src/lib/admin.ts`
- Test: `src/lib/__tests__/roles.test.ts`

**Interfaces:**
- Produces:
  - `resolveRoles(rows: PlatformRole[], email: string | null, bootstrapEmails: string[]): { isAdmin: boolean; judgeFor: string[] }`
  - `requireAdmin(): Promise<{ ok: true; state: AuthenticatedState } | { ok: false; reason: "unauthenticated" | "forbidden" }>`
  - `requireJudge(hackathonId: string): Promise<same shape>`
- Consumes: `resolveAuthenticatedUserState()` from `src/lib/user-state.ts`.

- [ ] **Step 1: Write the failing test**

`resolveRoles` is pure so the interesting rules are testable without a database.

```typescript
import { describe, it, expect } from "vitest";
import { resolveRoles } from "../roles";
import type { PlatformRole } from "@/types/db";

function role(partial: Partial<PlatformRole>): PlatformRole {
  return {
    id: "r1",
    user_id: "u1",
    role: "judge",
    hackathon_id: null,
    granted_by: null,
    granted_at: "2026-08-20T00:00:00Z",
    ...partial,
  } as PlatformRole;
}

describe("resolveRoles", () => {
  it("treats a global admin row as admin", () => {
    const out = resolveRoles([role({ role: "admin", hackathon_id: null })], "a@b.com", []);
    expect(out.isAdmin).toBe(true);
  });

  it("treats a bootstrap email as admin even with no rows", () => {
    const out = resolveRoles([], "gabriel@superteam.com.br", ["gabriel@superteam.com.br"]);
    expect(out.isAdmin).toBe(true);
  });

  it("matches bootstrap emails case-insensitively", () => {
    const out = resolveRoles([], "Gabriel@Superteam.com.br", ["gabriel@superteam.com.br"]);
    expect(out.isAdmin).toBe(true);
  });

  it("does not make a judge an admin", () => {
    const out = resolveRoles([role({ role: "judge", hackathon_id: "h1" })], "j@b.com", []);
    expect(out.isAdmin).toBe(false);
    expect(out.judgeFor).toEqual(["h1"]);
  });

  it("collects every edition a judge is assigned to", () => {
    const out = resolveRoles(
      [role({ id: "r1", hackathon_id: "h1" }), role({ id: "r2", hackathon_id: "h2" })],
      "j@b.com",
      [],
    );
    expect(out.judgeFor.sort()).toEqual(["h1", "h2"]);
  });

  it("returns nothing for an anonymous caller", () => {
    expect(resolveRoles([], null, ["gabriel@superteam.com.br"])).toEqual({
      isAdmin: false,
      judgeFor: [],
    });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/lib/__tests__/roles.test.ts`
Expected: FAIL — cannot find module `../roles`.

- [ ] **Step 3: Write the implementation**

```typescript
import { resolveAuthenticatedUserState, type AuthenticatedState } from "./user-state";
import { createServiceRoleClient } from "./supabase/server";
import type { PlatformRole } from "@/types/db";

type RoleCheck =
  | { ok: true; state: AuthenticatedState }
  | { ok: false; reason: "unauthenticated" | "forbidden" };

function bootstrapEmails(): string[] {
  return (process.env.ADMIN_EMAIL_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function resolveRoles(
  rows: PlatformRole[],
  email: string | null,
  bootstrap: string[],
): { isAdmin: boolean; judgeFor: string[] } {
  if (!email) return { isAdmin: false, judgeFor: [] };
  const isAdmin =
    bootstrap.includes(email.toLowerCase()) ||
    rows.some((r) => r.role === "admin");
  const judgeFor = rows
    .filter((r) => r.role === "judge" && r.hackathon_id)
    .map((r) => r.hackathon_id as string);
  return { isAdmin, judgeFor };
}

async function loadRoles(userId: string): Promise<PlatformRole[]> {
  const supabase = await createServiceRoleClient();
  const { data } = await supabase
    .from("platform_roles")
    .select("*")
    .eq("user_id", userId);
  return (data as PlatformRole[] | null) ?? [];
}

export async function requireAdmin(): Promise<RoleCheck> {
  const state = await resolveAuthenticatedUserState();
  if (!state) return { ok: false, reason: "unauthenticated" };
  const { isAdmin } = resolveRoles(
    await loadRoles(state.userId),
    state.email,
    bootstrapEmails(),
  );
  return isAdmin ? { ok: true, state } : { ok: false, reason: "forbidden" };
}

export async function requireJudge(hackathonId: string): Promise<RoleCheck> {
  const state = await resolveAuthenticatedUserState();
  if (!state) return { ok: false, reason: "unauthenticated" };
  const { isAdmin, judgeFor } = resolveRoles(
    await loadRoles(state.userId),
    state.email,
    bootstrapEmails(),
  );
  return isAdmin || judgeFor.includes(hackathonId)
    ? { ok: true, state }
    : { ok: false, reason: "forbidden" };
}
```

`AuthenticatedState` must be exported from `src/lib/user-state.ts` — it already is.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/__tests__/roles.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Point existing callers at the new module**

```bash
rm src/lib/admin.ts
grep -rn "lib/admin" src/
```

Every hit becomes `from "@/lib/roles"`. `src/app/(app)/admin/actions.ts` and `src/app/(app)/admin/page.tsx` are the expected callers.

- [ ] **Step 6: Commit**

```bash
git add src/lib/roles.ts src/lib/__tests__/roles.test.ts src/app/\(app\)/admin
git rm src/lib/admin.ts
git commit -m "feat: move admin and judge roles into the database"
```

---

### Task 5: Per-edition registration

**Files:**
- Create: `src/lib/registration.ts`
- Modify: `src/lib/user-state.ts`

**Interfaces:**
- Produces:
  - `getRegistration(userId: string, hackathonId: string): Promise<HackathonRegistration | null>`
  - `isProfileComplete(profile: User | null): boolean`
  - `isRegistrationComplete(reg: HackathonRegistration | null): boolean`
- Modifies: `resolveAuthenticatedUserState()` — `redirectPath` becomes `/conta` when the profile lacks a name, and `/` otherwise. Per-edition gating moves to the edition pages.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { isProfileComplete, isRegistrationComplete } from "../registration";
import type { User, HackathonRegistration } from "@/types/db";

describe("completion checks", () => {
  it("needs a full name for the profile to count as complete", () => {
    expect(isProfileComplete({ full_name: null } as User)).toBe(false);
    expect(isProfileComplete({ full_name: "  " } as User)).toBe(false);
    expect(isProfileComplete({ full_name: "Gabriel Thom" } as User)).toBe(true);
  });

  it("treats a missing profile as incomplete", () => {
    expect(isProfileComplete(null)).toBe(false);
  });

  it("needs both Luma confirmation and accepted terms", () => {
    const reg = {
      luma_confirmed_at: "2026-08-20T00:00:00Z",
      terms_accepted_at: null,
    } as HackathonRegistration;
    expect(isRegistrationComplete(reg)).toBe(false);
    expect(
      isRegistrationComplete({ ...reg, terms_accepted_at: "2026-08-20T00:00:00Z" }),
    ).toBe(true);
  });

  it("treats a missing registration as incomplete", () => {
    expect(isRegistrationComplete(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/lib/__tests__/registration.test.ts`
Expected: FAIL — cannot find module `../registration`.

- [ ] **Step 3: Write the implementation**

```typescript
import { createServerSupabaseClient } from "./supabase/server";
import type { HackathonRegistration, User } from "@/types/db";

export async function getRegistration(
  userId: string,
  hackathonId: string,
): Promise<HackathonRegistration | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("hackathon_registrations")
    .select("*")
    .eq("user_id", userId)
    .eq("hackathon_id", hackathonId)
    .maybeSingle();
  return data as HackathonRegistration | null;
}

export function isProfileComplete(profile: User | null): boolean {
  return Boolean(profile?.full_name && profile.full_name.trim().length > 0);
}

export function isRegistrationComplete(reg: HackathonRegistration | null): boolean {
  return Boolean(reg?.luma_confirmed_at && reg.terms_accepted_at);
}
```

- [ ] **Step 4: Simplify `user-state.ts`**

`needsOnboarding` currently reads the two dropped columns. Replace that block with:

```typescript
  const typed = profile as User | null;
  const needsProfile = !typed?.full_name;

  return {
    userId: user.id,
    email: user.email!,
    profile: typed,
    redirectPath: needsProfile ? "/conta" : "/",
  };
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run`
Expected: PASS — every suite, including the pre-existing token and security tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/registration.ts src/lib/user-state.ts src/lib/__tests__/registration.test.ts
git commit -m "feat: per-edition registration replaces global onboarding flags"
```

---

### Task 6: Superteam brand tokens, fonts and assets

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Create: `public/brand/stbr/elements/` (28 SVGs)
- Delete: `public/brand/bh/`

**Interfaces:**
- Produces: the token names every later task uses — `bg-surface`, `bg-surface-raised`, `text-ink`, `text-muted`, `bg-yellow`, `bg-emerald`, `border-green`, plus `font-heading` (Archivo) and `font-body` (Inter), and the classes `.btn-primary`, `.btn-secondary`, `.card-hover`, `.animate-fade-in`, `.animate-slide-up`.

- [ ] **Step 1: Copy the brand elements**

```bash
mkdir -p public/brand/stbr/elements
cp "/Users/thomgabriel/Desktop/superteam-brasil-brand-pack/Elements/svg/"*.svg public/brand/stbr/elements/
cp "/Users/thomgabriel/Desktop/superteam-brasil-brand-pack/Logo/HORIZONTAL/SVG/ST-DARK-GREEN-HORIZONTAL.svg" public/brand/stbr/logo/
cp "/Users/thomgabriel/Desktop/superteam-brasil-brand-pack/Logo/SYMBOL/SVG/SYMBOL-EMERALD-GREEN.svg" public/brand/stbr/logo/
rm -rf public/brand/bh
ls public/brand/stbr/elements | wc -l
```

Expected: 28.

- [ ] **Step 2: Replace the theme in `globals.css`**

Tailwind v4 has no config file — the LP's `theme.extend` becomes `@theme` here. Note `--color-green-*`: the LP overrides Tailwind's built-in green, and without declaring it explicitly the framework's own green leaks through.

```css
@import "tailwindcss";

@theme {
  --color-surface: #f7eacb;
  --color-surface-raised: #fffdf6;
  --color-ink: #1b231d;
  --color-muted: #2f6b3f;
  --color-emerald: #008c4c;
  --color-yellow: #ffd23f;
  --color-yellow-strong: #ffc107;
  --color-green: #2f6b3f;
  --color-green-dark: #1b231d;

  --font-heading: var(--font-archivo);
  --font-body: var(--font-inter);
}

body {
  background-color: var(--color-surface);
  color: var(--color-ink);
  font-family: var(--font-body);
}

a, button, [role="button"], summary { cursor: pointer; }

::selection {
  background-color: var(--color-yellow);
  color: var(--color-ink);
}

@layer components {
  .btn-primary {
    @apply inline-flex items-center justify-center gap-2 rounded-full bg-yellow px-6 py-3
           font-semibold text-ink transition-all duration-200 hover:bg-yellow-strong hover:shadow-lg;
  }

  .btn-secondary {
    @apply inline-flex items-center justify-center gap-2 rounded-full border-2 border-ink
           bg-transparent px-6 py-3 font-semibold text-ink transition-all duration-200
           hover:bg-ink hover:text-surface;
  }

  .card-hover {
    @apply transition-transform duration-300 ease-out;
  }

  .card-hover:hover {
    @apply -translate-y-1;
  }

  .stats-card {
    @apply rounded-2xl border border-green/10 bg-surface-raised/80 p-6 backdrop-blur-sm;
  }

  .service-card {
    @apply rounded-2xl bg-emerald p-6 text-surface;
  }
}

@layer utilities {
  .text-gradient {
    @apply bg-gradient-to-r from-yellow to-emerald bg-clip-text text-transparent;
  }

  .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
  .animate-slide-up { animation: slideUp 0.5s ease-out forwards; }
  .animate-float-a { animation: floatA 6s ease-in-out infinite; }
  .animate-float-b { animation: floatB 7s ease-in-out infinite; }
  .animate-float-c { animation: floatC 8s ease-in-out infinite; }
}

@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes slideUp {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes floatA {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes floatB {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-14px); }
}

@keyframes floatC {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
```

- [ ] **Step 3: Swap the fonts in `layout.tsx`**

The brand guide specifies Archivo **Semi Expanded**, which is the `wdth` axis of the variable font — requested through `axes`, not by substituting the normal width.

```typescript
import type { Metadata } from "next";
import { Inter, Archivo } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  axes: ["wdth"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hackathons · Superteam Brasil",
  description:
    "Plataforma de hackathons da Superteam Brasil. Participe, monte seu time e submeta seu projeto.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${inter.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Verify the theme compiles**

Run: `npm run dev` and open `http://localhost:3000`.
Expected: off-white background, dark green text. Pages will be broken in other ways (they still import `HACKATHON_SLUG`) — only the colours and fonts matter here.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx public/brand
git commit -m "feat(brand): Superteam Brasil palette, Archivo and Inter"
```

---

### Task 7: Entrance animation hook and UI primitives

**Files:**
- Create: `src/hooks/use-entrance-animation.ts`
- Modify: `src/components/ui/button.tsx`, `card.tsx`, `badge.tsx`
- Modify: `src/components/layout/background.tsx`

**Interfaces:**
- Produces:
  - `useEntranceAnimation<T extends HTMLElement>(opts?: { threshold?: number }): { ref: RefObject<T | null>; isVisible: boolean }`
  - `<Button variant="primary" | "secondary" | "ghost">`
  - `<Card>`, `<Badge tone="yellow" | "emerald" | "neutral">`

- [ ] **Step 1: Port the hook**

Ported from `../stbr-lp/src/hooks/useEntranceAnimation.ts`; it has no dependencies beyond React.

```typescript
"use client";

import { useEffect, useRef, useState } from "react";

export function useEntranceAnimation<T extends HTMLElement>(
  { threshold = 0.2 }: { threshold?: number } = {},
) {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}
```

- [ ] **Step 2: Restyle the button**

```typescript
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold text-muted transition-colors hover:text-ink",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`${variants[variant]} disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
```

- [ ] **Step 3: Restyle card and badge**

```typescript
export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-green/15 bg-surface-raised shadow-[0_8px_32px_rgba(0,140,76,0.08)] ${className}`}
    >
      {children}
    </div>
  );
}
```

```typescript
type Tone = "yellow" | "emerald" | "neutral";

const tones: Record<Tone, string> = {
  yellow: "bg-yellow text-ink",
  emerald: "bg-emerald text-surface",
  neutral: "bg-green/10 text-muted",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
```

Existing callers pass `tone="violet"`. Grep and convert: `grep -rn 'tone="violet"' src/` → `tone="emerald"`.

- [ ] **Step 4: Replace the background**

`background.tsx` draws the BH Onchain purple gradient. It becomes the organic shapes:

```typescript
import Image from "next/image";

const shapes = [
  { src: "/brand/stbr/elements/morth-05.svg", className: "left-[-8%] top-[6%] w-72 animate-float-a" },
  { src: "/brand/stbr/elements/morth-21.svg", className: "right-[-6%] top-[38%] w-96 animate-float-b" },
  { src: "/brand/stbr/elements/morth-12.svg", className: "bottom-[-4%] left-[18%] w-80 animate-float-c" },
];

export function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {shapes.map((shape) => (
        <Image
          key={shape.src}
          src={shape.src}
          alt=""
          width={400}
          height={400}
          className={`absolute opacity-[0.14] ${shape.className}`}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Verify**

Run: `npm run dev`, open any page.
Expected: three soft organic shapes drifting behind the content, buttons as yellow pills.

- [ ] **Step 6: Commit**

```bash
git add src/hooks src/components/ui src/components/layout/background.tsx
git commit -m "feat(ui): STBR primitives and organic-shape background"
```

---

### Task 8: Header and footer

**Files:**
- Modify: `src/components/layout/header.tsx`
- Modify: `src/components/layout/footer.tsx`

**Interfaces:**
- Consumes: `resolveAuthenticatedUserState()`.
- Produces: `<Header />` (server component) and `<Footer />`, used by both route group layouts.

- [ ] **Step 1: Rewrite the header**

Markup and classes follow `../stbr-lp/src/components/Header.tsx`, minus `next-intl` and the scroll listener the LP needs for its snap container.

```typescript
import Link from "next/link";
import Image from "next/image";
import { resolveAuthenticatedUserState } from "@/lib/user-state";

export async function Header() {
  const state = await resolveAuthenticatedUserState();

  return (
    <header className="sticky top-0 z-50 border-b border-green/10 bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/brand/stbr/logo/ST-DARK-GREEN-HORIZONTAL.svg"
            alt="Superteam Brasil"
            width={150}
            height={28}
            priority
          />
        </Link>

        <nav className="flex items-center gap-4 text-sm font-semibold">
          <Link href="/" className="text-muted transition-colors hover:text-ink">
            Hackathons
          </Link>
          {state ? (
            <>
              <Link href="/conta" className="text-muted transition-colors hover:text-ink">
                Minha conta
              </Link>
              <form action="/api/auth/signout" method="post">
                <button type="submit" className="text-muted transition-colors hover:text-ink">
                  Sair
                </button>
              </form>
            </>
          ) : (
            <Link href="/auth" className="btn-primary px-5 py-2 text-sm">
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Rewrite the footer**

Keep it to one line of credit plus the Superteam links; delete every BH Onchain reference.

```typescript
import Image from "next/image";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-green/10 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:px-6">
        <Image
          src="/brand/stbr/logo/SYMBOL-EMERALD-GREEN.svg"
          alt="Superteam Brasil"
          width={32}
          height={32}
        />
        <p className="text-sm text-muted">
          Plataforma de hackathons da Superteam Brasil.
        </p>
        <div className="flex gap-4 text-sm font-semibold text-muted">
          <a href="https://superteam.com.br" target="_blank" rel="noreferrer" className="hover:text-ink">
            superteam.com.br
          </a>
          <a href="https://wiki.superteam.com.br" target="_blank" rel="noreferrer" className="hover:text-ink">
            Wiki
          </a>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run dev`, open `/auth` (a page that does not depend on the deleted constant).
Expected: Superteam logo, "Entrar" as a yellow pill, footer with the emerald symbol.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/header.tsx src/components/layout/footer.tsx
git commit -m "feat(ui): Superteam header and footer"
```

---

### Task 9: Public home listing the editions

**Files:**
- Create: `src/components/layout/edition-card.tsx`
- Modify: `src/app/(public)/page.tsx`

**Interfaces:**
- Consumes: `listHackathons()`, `editionStage()` from Task 3; `useEntranceAnimation` from Task 7.
- Produces: `<EditionCard hackathon={h} coverUrl={string | null} index={number} />`.

- [ ] **Step 1: Write the card**

Structure and classes ported from `../stbr-lp/src/components/sections/EventsClient.tsx`: dark green card, off-white date badge top-left, cover under a gradient scrim, meta row, lift on hover.

```typescript
"use client";

import Link from "next/link";
import Image from "next/image";
import type { Hackathon } from "@/types/db";
import { useEntranceAnimation } from "@/hooks/use-entrance-animation";

const MONTHS = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];

export function EditionCard({
  hackathon,
  coverUrl,
  index,
}: {
  hackathon: Hackathon;
  coverUrl: string | null;
  index: number;
}) {
  const { ref, isVisible } = useEntranceAnimation<HTMLAnchorElement>();
  const start = new Date(hackathon.starts_at);

  return (
    <Link
      ref={ref}
      href={`/h/${hackathon.slug}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-green/30 bg-green-dark shadow-[0_8px_32px_rgba(0,140,76,0.12)] transition-all duration-500 hover:border-emerald/50 hover:shadow-[0_16px_48px_rgba(0,140,76,0.25)] ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
      style={{ transitionDelay: `${200 + index * 150}ms` }}
    >
      <div className="relative flex h-56 items-center justify-center overflow-hidden">
        {coverUrl && <Image src={coverUrl} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />}
        <div className="absolute inset-0 bg-gradient-to-t from-green-dark/85 via-green-dark/40 to-green-dark/20" />

        <div className="absolute left-3 top-3 rounded-xl bg-surface px-3 py-2 text-center shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald">
            {MONTHS[start.getMonth()]}
          </p>
          <p className="font-heading text-2xl font-bold leading-none text-ink">
            {start.getDate()}
          </p>
        </div>

        <h3 className="relative z-10 px-6 text-center font-heading text-xl font-bold leading-tight text-surface">
          {hackathon.name}
        </h3>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        {hackathon.tagline && (
          <p className="line-clamp-2 text-sm text-surface/70">{hackathon.tagline}</p>
        )}
        {hackathon.location_city && (
          <p className="text-xs font-semibold uppercase tracking-wider text-yellow">
            {hackathon.location_city}
          </p>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Rewrite the home page**

The 573-line BH Onchain landing is replaced wholesale.

```typescript
import { listHackathons, editionStage } from "@/lib/hackathon";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EditionCard } from "@/components/layout/edition-card";
import type { Hackathon } from "@/types/db";

export const dynamic = "force-dynamic";

const GROUPS = [
  { stage: "running" as const, title: "Acontecendo agora" },
  { stage: "upcoming" as const, title: "Em breve" },
  { stage: "finished" as const, title: "Encerrados" },
];

export default async function HomePage() {
  const hackathons = await listHackathons();
  const supabase = await createServerSupabaseClient();

  const coverFor = (h: Hackathon) =>
    h.cover_image_path
      ? supabase.storage.from("hackathon-covers").getPublicUrl(h.cover_image_path).data.publicUrl
      : null;

  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-heading text-4xl font-bold sm:text-6xl">
          Hackathons da <span className="text-emerald">Superteam Brasil</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Monte seu time, aprenda com quem constrói em Solana e submeta seu projeto.
        </p>

        {GROUPS.map(({ stage, title }) => {
          const list = hackathons.filter((h) => editionStage(h) === stage);
          if (list.length === 0) return null;
          return (
            <section key={stage} className="mt-16">
              <h2 className="font-heading text-2xl font-bold">{title}</h2>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((h, i) => (
                  <EditionCard key={h.id} hackathon={h} coverUrl={coverFor(h)} index={i} />
                ))}
              </div>
            </section>
          );
        })}

        {hackathons.length === 0 && (
          <p className="mt-16 text-muted">Nenhum hackathon publicado no momento.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the covers bucket**

In the Supabase dashboard, create a public bucket named `hackathon-covers`. Public read, service-role write.

- [ ] **Step 4: Verify**

Run: `npm run dev`, open `/`.
Expected: one card, "Hackathon Solana & Cursor", under "Em breve" (its `starts_at` is 31 Aug).

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/edition-card.tsx src/app/\(public\)/page.tsx
git commit -m "feat: public home lists every published edition"
```

---

### Task 10: Edition landing page

**Files:**
- Create: `src/app/(public)/h/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getHackathonBySlug()`, `isRegistrationOpen()`, and the `public_schedule` view (anon-readable, lists every content row).
- Produces: the public page at `/h/[slug]`; its CTA points at `/h/[slug]/inscricao` (Task 12).

- [ ] **Step 1: Write the page**

```typescript
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getHackathonBySlug, isRegistrationOpen } from "@/lib/hackathon";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { HackathonContent } from "@/types/db";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  timeZone: "America/Sao_Paulo",
});

export default async function EditionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon || hackathon.status === "draft") notFound();

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("public_schedule")
    .select("id, kind, title, speaker, description, scheduled_at, location, position")
    .eq("hackathon_id", hackathon.id)
    .order("position", { ascending: true });
  const schedule =
    (data as Pick<
      HackathonContent,
      "id" | "kind" | "title" | "speaker" | "description" | "scheduled_at" | "location" | "position"
    >[] | null) ?? [];

  const open = isRegistrationOpen(hackathon);

  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Badge tone={open ? "emerald" : "neutral"}>
          {open ? "Inscrições abertas" : "Inscrições encerradas"}
        </Badge>

        <h1 className="mt-4 font-heading text-4xl font-bold sm:text-5xl">{hackathon.name}</h1>
        {hackathon.tagline && <p className="mt-3 text-xl text-muted">{hackathon.tagline}</p>}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/h/${hackathon.slug}/inscricao`} className="btn-primary">
            {open ? "Quero participar" : "Ver detalhes"}
          </Link>
          {hackathon.luma_url && (
            <a href={hackathon.luma_url} target="_blank" rel="noreferrer" className="btn-secondary">
              Inscrição no Luma
            </a>
          )}
        </div>

        {hackathon.description && (
          <p className="mt-10 whitespace-pre-line text-muted">{hackathon.description}</p>
        )}

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Card className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Quando</p>
            <p className="mt-2 font-heading text-lg font-bold">
              {DATE.format(new Date(hackathon.starts_at))} —{" "}
              {DATE.format(new Date(hackathon.presential_at ?? hackathon.submission_deadline_at))}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Onde</p>
            <p className="mt-2 font-heading text-lg font-bold">
              {hackathon.location_name ?? "Online"}
            </p>
            {hackathon.location_city && (
              <p className="text-sm text-muted">{hackathon.location_city}</p>
            )}
          </Card>
        </div>

        {hackathon.prize_summary && (
          <Card className="mt-4 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Premiação</p>
            <p className="mt-2 text-ink">{hackathon.prize_summary}</p>
          </Card>
        )}

        {schedule.length > 0 && (
          <section className="mt-14">
            <h2 className="font-heading text-2xl font-bold">Programação</h2>
            <ul className="mt-6 divide-y divide-green/10">
              {schedule.map((item) => (
                <li key={item.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-4">
                  <span className="w-24 font-heading font-bold">
                    {item.scheduled_at ? DATE.format(new Date(item.scheduled_at)) : "—"}
                  </span>
                  <span className="flex-1 font-semibold">{item.title}</span>
                  {item.speaker && <span className="text-sm text-muted">{item.speaker}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
```

The schedule is read from the `public_schedule` view, which lists every content row — the dates are public information even before the recordings exist. The view keeps `youtube_id` and `external_url` out of anon reach — an unlisted video is only protected because its id never leaks.

- [ ] **Step 2: Verify**

Run: `npm run dev`, open `/h/solana-cursor-passo-fundo-2026`.
Expected: the edition renders with all six programme rows. Open `/h/nao-existe` and expect a 404.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(public)/h"
git commit -m "feat: public edition landing page"
```

---

### Task 11: Profile page and the public/private split in middleware

**Files:**
- Create: `src/app/(app)/conta/page.tsx`
- Create: `src/app/(app)/conta/actions.ts`
- Modify: `src/lib/supabase/middleware.ts`

**Interfaces:**
- Produces: server action `updateProfile(formData: FormData): Promise<{ error?: string }>` writing `full_name`, `github_url`, `twitter_url`, `linkedin_url`, `telegram_handle` on the caller's own `users` row; the `/conta` route that Task 5, Task 8 and Task 12 all redirect to.

- [ ] **Step 1: Fix the middleware allowlist**

`PUBLIC_ROUTES` matches by prefix, so adding `/h` would make `/h/<slug>/conteudos` public too — the exact opposite of what gates the unlisted videos. Only the bare edition landing is public.

```typescript
const PUBLIC_ROUTES = [
  "/",
  "/auth",
  "/auth/callback",
  "/api/cron/lock-submissions",
];

const PUBLIC_EDITION_LANDING = /^\/h\/[^/]+$/;
```

and in `updateSession`, replace the `isPublicRoute` expression with:

```typescript
  const isPublicRoute =
    PUBLIC_ROUTES.some((route) => path === route || path.startsWith(route + "/")) ||
    PUBLIC_EDITION_LANDING.test(path);
```

`/invite` leaves the list along with the route it protected (Task 14 deletes it).

- [ ] **Step 2: Prove the split by hand**

Run: `npm run dev`, signed out.
Expected: `/h/solana-cursor-passo-fundo-2026` renders; `/h/solana-cursor-passo-fundo-2026/conteudos` redirects to `/auth`.

- [ ] **Step 3: Write the profile action**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/user-state";
import { sanitizeUrl, sanitizeText } from "@/lib/security";

export async function updateProfile(formData: FormData): Promise<{ error?: string }> {
  const state = await requireUser();

  const fullName = sanitizeText(String(formData.get("full_name") ?? ""));
  if (!fullName) return { error: "Informe seu nome completo." };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("users")
    .update({
      full_name: fullName,
      github_url: sanitizeUrl(String(formData.get("github_url") ?? "")),
      twitter_url: sanitizeUrl(String(formData.get("twitter_url") ?? "")),
      linkedin_url: sanitizeUrl(String(formData.get("linkedin_url") ?? "")),
      telegram_handle: sanitizeText(String(formData.get("telegram_handle") ?? "")),
    })
    .eq("id", state.userId);

  if (error) return { error: "Não foi possível salvar. Tente novamente." };

  revalidatePath("/conta");
  return {};
}
```

Check the exact exported names in `src/lib/security.ts` before writing this — that module already holds the URL and text sanitizers and is covered by `src/lib/__tests__/security.test.ts`.

- [ ] **Step 4: Write the page**

`next` carries the caller back where they came from, which is how Task 12's redirect returns to registration.

```typescript
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile } from "./actions";
import { requireUser } from "@/lib/user-state";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const state = await requireUser();

  async function save(formData: FormData) {
    "use server";
    const result = await updateProfile(formData);
    if (!result.error && next?.startsWith("/")) redirect(next);
  }

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-heading text-3xl font-bold">Minha conta</h1>
        <p className="mt-2 text-muted">
          Esses dados valem para todos os hackathons da Superteam Brasil.
        </p>

        <Card className="mt-8 p-6 sm:p-8">
          <form action={save} className="space-y-4">
            <Input name="full_name" label="Nome completo" required defaultValue={state.profile?.full_name ?? ""} />
            <Input name="github_url" label="GitHub" defaultValue={state.profile?.github_url ?? ""} />
            <Input name="twitter_url" label="X / Twitter" defaultValue={state.profile?.twitter_url ?? ""} />
            <Input name="linkedin_url" label="LinkedIn" defaultValue={state.profile?.linkedin_url ?? ""} />
            <Input name="telegram_handle" label="Telegram" defaultValue={state.profile?.telegram_handle ?? ""} />
            <Button type="submit">Salvar</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
```

The `next` value is checked with `startsWith("/")` so it can only ever redirect inside this site.

Confirm `src/components/ui/input.tsx` takes a `label` prop; if it does not, pass the label as a wrapping `<label>` instead.

- [ ] **Step 5: Verify**

Run: `npm run dev`. Sign in with a fresh account, open `/conta?next=/h/solana-cursor-passo-fundo-2026/inscricao`, save a name.
Expected: it lands on the registration page. Reopening `/conta` shows the saved values.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/conta" src/lib/supabase/middleware.ts
git commit -m "feat: global profile page and public edition landing in middleware"
```

---

### Task 12: Registration for an edition

**Files:**
- Create: `src/app/(app)/h/[slug]/inscricao/page.tsx`
- Create: `src/app/(app)/h/[slug]/inscricao/actions.ts`
- Create: `src/components/registration/registration-form.tsx`

**Interfaces:**
- Consumes: `getHackathonBySlug()`, `getRegistration()`, `isProfileComplete()`, `requireUser()`.
- Produces: server action `registerForHackathon(hackathonId: string, formData: FormData): Promise<{ error?: string }>`, which upserts a `hackathon_registrations` row with both timestamps set.

- [ ] **Step 1: Write the server action**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/user-state";

export async function registerForHackathon(
  hackathonId: string,
  slug: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const state = await requireUser();

  const lumaConfirmed = formData.get("luma_confirmed") === "on";
  const termsAccepted = formData.get("terms_accepted") === "on";

  if (!lumaConfirmed || !termsAccepted) {
    return { error: "Confirme a inscrição no Luma e aceite as regras para continuar." };
  }

  const supabase = await createServerSupabaseClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from("hackathon_registrations").upsert(
    {
      hackathon_id: hackathonId,
      user_id: state.userId,
      luma_confirmed_at: now,
      terms_accepted_at: now,
    },
    { onConflict: "hackathon_id,user_id" },
  );

  if (error) return { error: "Não foi possível concluir a inscrição. Tente novamente." };

  revalidatePath(`/h/${slug}/painel`);
  return {};
}
```

The row is written by the user's own client, not the service role: the RLS policy from Task 1 already restricts inserts to `user_id = auth.uid()`.

- [ ] **Step 2: Write the form**

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { registerForHackathon } from "@/app/(app)/h/[slug]/inscricao/actions";

export function RegistrationForm({
  hackathonId,
  slug,
  lumaUrl,
}: {
  hackathonId: string;
  slug: string;
  lumaUrl: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await registerForHackathon(hackathonId, slug, formData);
          if (result.error) setError(result.error);
          else router.push(`/h/${slug}/painel`);
        })
      }
      className="space-y-5"
    >
      <label className="flex items-start gap-3">
        <input type="checkbox" name="luma_confirmed" className="mt-1" />
        <span className="text-sm">
          Confirmo que me inscrevi no evento pelo Luma
          {lumaUrl && (
            <>
              {" — "}
              <a href={lumaUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
                abrir o Luma
              </a>
            </>
          )}
          .
        </span>
      </label>

      <label className="flex items-start gap-3">
        <input type="checkbox" name="terms_accepted" className="mt-1" />
        <span className="text-sm">Li e aceito as regras do hackathon.</span>
      </label>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Confirmando..." : "Confirmar inscrição"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Write the page**

```typescript
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { RegistrationForm } from "@/components/registration/registration-form";
import { getHackathonBySlug } from "@/lib/hackathon";
import { getRegistration, isProfileComplete, isRegistrationComplete } from "@/lib/registration";
import { requireUser } from "@/lib/user-state";

export const dynamic = "force-dynamic";

export default async function RegistrationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const state = await requireUser();
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon || hackathon.status === "draft") notFound();

  if (!isProfileComplete(state.profile)) redirect(`/conta?next=/h/${slug}/inscricao`);

  const registration = await getRegistration(state.userId, hackathon.id);
  if (isRegistrationComplete(registration)) redirect(`/h/${slug}/painel`);

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link href={`/h/${slug}`} className="text-sm text-muted hover:text-ink">
          ← voltar
        </Link>
        <h1 className="mt-4 font-heading text-3xl font-bold">Inscrição · {hackathon.name}</h1>
        <p className="mt-2 text-muted">
          Falta pouco. Confirme os dois itens abaixo para liberar as aulas e a criação de time.
        </p>

        <Card className="mt-8 p-6 sm:p-8">
          <RegistrationForm
            hackathonId={hackathon.id}
            slug={slug}
            lumaUrl={hackathon.luma_url}
          />
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npm run dev`, sign in, open `/h/solana-cursor-passo-fundo-2026/inscricao`.
Expected: submitting with either box unticked shows the error; ticking both redirects to the dashboard route. Confirm one row landed:

```sql
select luma_confirmed_at, terms_accepted_at from hackathon_registrations;
```

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/h" src/components/registration
git commit -m "feat: per-edition registration flow"
```

---

### Task 13: Content pages

**Files:**
- Create: `src/lib/content.ts`
- Create: `src/components/content/content-embed.tsx`
- Create: `src/app/(app)/h/[slug]/conteudos/page.tsx`
- Create: `src/app/(app)/h/[slug]/conteudos/[contentId]/page.tsx`
- Test: `src/lib/__tests__/content.test.ts`

**Interfaces:**
- Produces:
  - `extractYouTubeId(input: string | null): string | null`
  - `listContents(hackathonId: string): Promise<HackathonContent[]>`
  - `getContent(id: string, hackathonId: string): Promise<HackathonContent | null>`

- [ ] **Step 1: Write the failing test**

Admins will paste whatever YouTube hands them — a share link, a watch URL, an embed URL, sometimes the bare ID. Storing a wrong ID means a blank iframe on the night of a class, so this is the one piece of content logic worth testing hard.

```typescript
import { describe, it, expect } from "vitest";
import { extractYouTubeId } from "../content";

describe("extractYouTubeId", () => {
  it("reads a watch URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=2pcm7ICRJKU")).toBe("2pcm7ICRJKU");
  });

  it("reads a share link", () => {
    expect(extractYouTubeId("https://youtu.be/2pcm7ICRJKU")).toBe("2pcm7ICRJKU");
  });

  it("reads an embed URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/embed/2pcm7ICRJKU")).toBe("2pcm7ICRJKU");
  });

  it("reads a live URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/live/2pcm7ICRJKU")).toBe("2pcm7ICRJKU");
  });

  it("ignores extra query parameters", () => {
    expect(extractYouTubeId("https://youtu.be/2pcm7ICRJKU?si=abc123&t=42")).toBe("2pcm7ICRJKU");
  });

  it("accepts a bare id", () => {
    expect(extractYouTubeId("2pcm7ICRJKU")).toBe("2pcm7ICRJKU");
  });

  it("rejects anything else", () => {
    expect(extractYouTubeId("https://vimeo.com/12345")).toBeNull();
    expect(extractYouTubeId("not a link")).toBeNull();
    expect(extractYouTubeId("")).toBeNull();
    expect(extractYouTubeId(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/lib/__tests__/content.test.ts`
Expected: FAIL — cannot find module `../content`.

- [ ] **Step 3: Write the implementation**

```typescript
import { createServerSupabaseClient } from "./supabase/server";
import type { HackathonContent } from "@/types/db";

const ID = /^[A-Za-z0-9_-]{11}$/;

export function extractYouTubeId(input: string | null): string | null {
  if (!input) return null;
  const value = input.trim();
  if (ID.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    return ID.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    const param = url.searchParams.get("v");
    if (param && ID.test(param)) return param;
    const match = url.pathname.match(/^\/(?:embed|live|shorts)\/([A-Za-z0-9_-]{11})/);
    if (match) return match[1];
  }

  return null;
}

export async function listContents(hackathonId: string): Promise<HackathonContent[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("hackathon_contents")
    .select("*")
    .eq("hackathon_id", hackathonId)
    .order("position", { ascending: true });
  return (data as HackathonContent[] | null) ?? [];
}

export async function getContent(
  id: string,
  hackathonId: string,
): Promise<HackathonContent | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("hackathon_contents")
    .select("*")
    .eq("id", id)
    .eq("hackathon_id", hackathonId)
    .maybeSingle();
  return data as HackathonContent | null;
}
```

RLS restricts `select` to `published` rows, so `listContents` returns only what an admin has released — no extra filter needed here.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/__tests__/content.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Write the embed component**

```typescript
export function ContentEmbed({ youtubeId, title }: { youtubeId: string; title: string }) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl bg-green-dark">
      <iframe
        className="h-full w-full"
        src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
```

- [ ] **Step 6: Write the index page**

```typescript
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getHackathonBySlug } from "@/lib/hackathon";
import { listContents } from "@/lib/content";
import { getRegistration, isRegistrationComplete } from "@/lib/registration";
import { requireUser } from "@/lib/user-state";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const WHEN = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export default async function ContentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const state = await requireUser();
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon || hackathon.status === "draft") notFound();

  const registration = await getRegistration(state.userId, hackathon.id);
  if (!isRegistrationComplete(registration)) redirect(`/h/${slug}/inscricao`);

  const contents = await listContents(hackathon.id);

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-heading text-3xl font-bold sm:text-4xl">Conteúdos</h1>
        <p className="mt-2 text-muted">
          As aulas ficam disponíveis aqui depois de cada encontro.
        </p>

        {contents.length === 0 ? (
          <Card className="mt-8 p-8 text-muted">
            Nenhum conteúdo liberado ainda. A primeira aula é em{" "}
            {WHEN.format(new Date(hackathon.starts_at))}.
          </Card>
        ) : (
          <div className="mt-8 grid gap-4">
            {contents.map((content) => (
              <Link key={content.id} href={`/h/${slug}/conteudos/${content.id}`}>
                <Card className="card-hover p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge tone={content.kind === "mentoria" ? "yellow" : "emerald"}>
                      {content.kind}
                    </Badge>
                    {content.scheduled_at && (
                      <span className="text-sm text-muted">
                        {WHEN.format(new Date(content.scheduled_at))}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 font-heading text-xl font-bold">{content.title}</h2>
                  {content.speaker && <p className="text-sm text-muted">{content.speaker}</p>}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Write the detail page**

```typescript
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ContentEmbed } from "@/components/content/content-embed";
import { getHackathonBySlug } from "@/lib/hackathon";
import { getContent } from "@/lib/content";
import { getRegistration, isRegistrationComplete } from "@/lib/registration";
import { requireUser } from "@/lib/user-state";

export const dynamic = "force-dynamic";

export default async function ContentPage({
  params,
}: {
  params: Promise<{ slug: string; contentId: string }>;
}) {
  const { slug, contentId } = await params;
  const state = await requireUser();
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon) notFound();

  const registration = await getRegistration(state.userId, hackathon.id);
  if (!isRegistrationComplete(registration)) redirect(`/h/${slug}/inscricao`);

  const content = await getContent(contentId, hackathon.id);
  if (!content) notFound();

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href={`/h/${slug}/conteudos`} className="text-sm text-muted hover:text-ink">
          ← todos os conteúdos
        </Link>

        <h1 className="mt-4 font-heading text-3xl font-bold">{content.title}</h1>
        {content.speaker && <p className="mt-1 text-muted">{content.speaker}</p>}

        {content.youtube_id && (
          <div className="mt-8">
            <ContentEmbed youtubeId={content.youtube_id} title={content.title} />
          </div>
        )}

        {content.description && (
          <p className="mt-8 whitespace-pre-line text-muted">{content.description}</p>
        )}

        {content.external_url && (
          <a
            href={content.external_url}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary mt-8"
          >
            Abrir material
          </a>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Verify with a real row**

Publish one seeded content row and give it a video:

```sql
update hackathon_contents
set published = true, youtube_id = '2pcm7ICRJKU'
where position = 1;
```

Open `/h/solana-cursor-passo-fundo-2026/conteudos`.
Expected: one card; the other five stay hidden because RLS filters unpublished rows. Open it and the video plays. Sign out and hit the same URL: you land on `/auth`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/content.ts src/lib/__tests__/content.test.ts src/components/content "src/app/(app)/h"
git commit -m "feat: content pages with login-gated video embeds"
```

---

### Task 14: Move the team flow under the edition

**Files:**
- Move: `src/app/(app)/team/page.tsx` → `src/app/(app)/h/[slug]/time/page.tsx`
- Move: `src/app/(app)/team/new/page.tsx` → `src/app/(app)/h/[slug]/time/novo/page.tsx`
- Move: `src/app/(app)/team/actions.ts` → `src/app/(app)/h/[slug]/time/actions.ts`
- Modify: `src/lib/team.ts`
- Create: `src/app/(app)/h/[slug]/painel/page.tsx`
- Delete: `src/app/(app)/dashboard/`, `src/app/(app)/onboarding/`, `src/app/(public)/invite/[token]/`

**Interfaces:**
- Produces: `getTeamForHackathon(userId: string, hackathonId: string): Promise<TeamSnapshot | null>` — the same `TeamSnapshot` shape as today, renamed from `getCurrentUserTeam`.

- [ ] **Step 1: Rename the team query**

In `src/lib/team.ts`, rename `getCurrentUserTeam` to `getTeamForHackathon`. The body already takes `hackathonId` and needs no other change. Update every import.

- [ ] **Step 2: Move the routes**

```bash
mkdir -p "src/app/(app)/h/[slug]/time/novo"
git mv "src/app/(app)/team/page.tsx"      "src/app/(app)/h/[slug]/time/page.tsx"
git mv "src/app/(app)/team/new/page.tsx"  "src/app/(app)/h/[slug]/time/novo/page.tsx"
git mv "src/app/(app)/team/actions.ts"    "src/app/(app)/h/[slug]/time/actions.ts"
rmdir "src/app/(app)/team/new" "src/app/(app)/team"
```

In both moved pages, read `slug` from `params`, resolve the edition with `getHackathonBySlug(slug)`, and replace the `getActiveHackathon()` call. Every internal link `/team` becomes `/h/${slug}/time`; every `/dashboard` becomes `/h/${slug}/painel`. Guard both pages with the same pair used in Task 13:

```typescript
const registration = await getRegistration(state.userId, hackathon.id);
if (!isRegistrationComplete(registration)) redirect(`/h/${slug}/inscricao`);
```

- [ ] **Step 3: Write the participation dashboard**

```typescript
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/ui/countdown";
import { getHackathonBySlug, isSubmissionWindowOpen } from "@/lib/hackathon";
import { getRegistration, isRegistrationComplete } from "@/lib/registration";
import { getTeamForHackathon } from "@/lib/team";
import { requireUser } from "@/lib/user-state";

export const dynamic = "force-dynamic";

export default async function PainelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const state = await requireUser();
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon || hackathon.status === "draft") notFound();

  const registration = await getRegistration(state.userId, hackathon.id);
  if (!isRegistrationComplete(registration)) redirect(`/h/${slug}/inscricao`);

  const snapshot = await getTeamForHackathon(state.userId, hackathon.id);
  const open = isSubmissionWindowOpen(hackathon);

  const steps = [
    { done: true, label: "Inscrição confirmada", href: null },
    {
      done: Boolean(snapshot),
      label: snapshot ? `Time: ${snapshot.team.name}` : "Monte seu time",
      href: snapshot ? `/h/${slug}/time` : `/h/${slug}/time/novo`,
    },
    {
      done: snapshot?.submission.status === "submitted",
      label: "Projeto submetido",
      href: snapshot ? `/h/${slug}/submissao` : null,
    },
  ];

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge tone={open ? "emerald" : "neutral"}>
              {open ? "Submissões abertas" : "Submissões encerradas"}
            </Badge>
            <h1 className="mt-3 font-heading text-3xl font-bold sm:text-4xl">
              Olá, {state.profile?.full_name?.split(" ")[0]}.
            </h1>
            <p className="mt-1 text-muted">{hackathon.name}</p>
          </div>
          <Card className="px-5 py-3">
            <p className="text-xs uppercase tracking-wider text-muted">Entrega em</p>
            <p className="font-heading text-xl font-bold">
              <Countdown deadlineIso={hackathon.submission_deadline_at} />
            </p>
          </Card>
        </header>

        <Card className="p-6 sm:p-8">
          <h2 className="font-heading text-xl font-bold">Sua participação</h2>
          <ul className="mt-5 space-y-4">
            {steps.map((step) => (
              <li key={step.label} className="flex items-center gap-3">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    step.done ? "bg-emerald text-surface" : "bg-green/10 text-muted"
                  }`}
                >
                  {step.done ? "✓" : "·"}
                </span>
                {step.href ? (
                  <Link href={step.href} className="font-semibold underline-offset-4 hover:underline">
                    {step.label}
                  </Link>
                ) : (
                  <span className={step.done ? "" : "text-muted"}>{step.label}</span>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Link href={`/h/${slug}/conteudos`} className="btn-primary">
            Ver conteúdos
          </Link>
          {hackathon.community_url && (
            <a href={hackathon.community_url} target="_blank" rel="noreferrer" className="btn-secondary">
              Entrar na comunidade
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
```

The submission link points at a route Phase 2 builds; until then the step renders as text because `snapshot.submission.status` is never `submitted`.

- [ ] **Step 4: Delete the superseded routes**

```bash
git rm -r "src/app/(app)/dashboard" "src/app/(app)/onboarding" "src/app/(public)/invite"
```

The token-based invite page goes with them: no new tokens have been generated since the manual add-member flow landed, and this is a fresh database with no legacy invites to honour.

- [ ] **Step 5: Verify**

Run: `npm run dev`. Sign in, register, then walk `/h/<slug>/painel` → `time/novo` → create a team → `time`.
Expected: the dashboard shows two of three steps done and the team page lists you as leader.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: team flow and participation dashboard scoped to an edition"
```

---

### Task 15: Admin — editions and people

**Files:**
- Modify: `src/app/(app)/admin/page.tsx`
- Create: `src/app/(app)/admin/pessoas/page.tsx`
- Create: `src/app/(app)/admin/pessoas/actions.ts`
- Create: `src/components/admin/role-manager.tsx`

**Interfaces:**
- Consumes: `requireAdmin()` from Task 4.
- Produces: server actions `grantRole(email: string, role: "admin" | "judge", hackathonId: string | null)` and `revokeRole(roleId: string)`.

- [ ] **Step 1: Write the actions**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/roles";

export async function grantRole(
  email: string,
  role: "admin" | "judge",
  hackathonId: string | null,
): Promise<{ error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: "Sem permissão." };

  if (role === "judge" && !hackathonId) {
    return { error: "Escolha o hackathon para o jurado." };
  }

  const supabase = await createServiceRoleClient();

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (!user) {
    return { error: "Ninguém com esse e-mail entrou na plataforma ainda. Peça para fazer login uma vez." };
  }

  const { error } = await supabase.from("platform_roles").upsert(
    {
      user_id: (user as { id: string }).id,
      role,
      hackathon_id: role === "admin" ? null : hackathonId,
      granted_by: gate.state.userId,
    },
    { onConflict: "user_id,role,hackathon_id" },
  );

  if (error) return { error: "Não foi possível salvar o papel." };

  revalidatePath("/admin/pessoas");
  return {};
}

export async function revokeRole(roleId: string): Promise<{ error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: "Sem permissão." };

  const supabase = await createServiceRoleClient();
  const { error } = await supabase.from("platform_roles").delete().eq("id", roleId);
  if (error) return { error: "Não foi possível remover o papel." };

  revalidatePath("/admin/pessoas");
  return {};
}
```

A role can only be granted to someone who has signed in at least once — there is no `users` row before that. The error message says so in plain pt-BR rather than failing silently.

- [ ] **Step 2: Write the role manager component**

```typescript
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { grantRole, revokeRole } from "@/app/(app)/admin/pessoas/actions";
import type { Hackathon } from "@/types/db";

type Row = { id: string; role: "admin" | "judge"; email: string; hackathonName: string | null };

export function RoleManager({
  rows,
  hackathons,
}: {
  rows: Row[];
  hackathons: Pick<Hackathon, "id" | "name">[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      <form
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            const result = await grantRole(
              String(formData.get("email") ?? ""),
              formData.get("role") === "admin" ? "admin" : "judge",
              (formData.get("hackathon_id") as string) || null,
            );
            if (result.error) setError(result.error);
          })
        }
        className="flex flex-wrap items-end gap-3"
      >
        <input
          name="email"
          type="email"
          required
          placeholder="e-mail"
          className="rounded-full border border-green/30 bg-surface-raised px-4 py-2"
        />
        <select name="role" className="rounded-full border border-green/30 bg-surface-raised px-4 py-2">
          <option value="admin">Admin</option>
          <option value="judge">Jurado</option>
        </select>
        <select name="hackathon_id" className="rounded-full border border-green/30 bg-surface-raised px-4 py-2">
          <option value="">— hackathon (jurado) —</option>
          {hackathons.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={pending}>
          Adicionar
        </Button>
      </form>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <ul className="divide-y divide-green/10">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-4 py-3">
            <span>
              <strong>{row.email}</strong> · {row.role === "admin" ? "Admin" : "Jurado"}
              {row.hackathonName && <span className="text-muted"> · {row.hackathonName}</span>}
            </span>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => startTransition(async () => void (await revokeRole(row.id)))}
            >
              Remover
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Write the page**

```typescript
import { redirect } from "next/navigation";
import { RoleManager } from "@/components/admin/role-manager";
import { requireAdmin } from "@/lib/roles";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const gate = await requireAdmin();
  if (!gate.ok) redirect(gate.reason === "unauthenticated" ? "/auth" : "/");

  const supabase = await createServiceRoleClient();

  const [{ data: roles }, { data: hackathons }] = await Promise.all([
    supabase
      .from("platform_roles")
      .select("id, role, hackathon_id, users(email), hackathons(name)")
      .order("granted_at", { ascending: true }),
    supabase.from("hackathons").select("id, name").order("starts_at", { ascending: false }),
  ]);

  type Joined = {
    id: string;
    role: "admin" | "judge";
    users: { email: string } | { email: string }[] | null;
    hackathons: { name: string } | { name: string }[] | null;
  };

  const rows = ((roles as Joined[] | null) ?? []).map((r) => {
    const user = Array.isArray(r.users) ? r.users[0] : r.users;
    const hackathon = Array.isArray(r.hackathons) ? r.hackathons[0] : r.hackathons;
    return {
      id: r.id,
      role: r.role,
      email: user?.email ?? "—",
      hackathonName: hackathon?.name ?? null,
    };
  });

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-heading text-3xl font-bold">Pessoas</h1>
        <p className="mt-2 text-muted">
          Admins enxergam tudo. Jurados só votam no hackathon em que foram indicados.
        </p>
        <div className="mt-8">
          <RoleManager rows={rows} hackathons={(hackathons as { id: string; name: string }[]) ?? []} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Make `/admin` list the editions**

Replace the whole body of `src/app/(app)/admin/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/roles";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Hackathon } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const gate = await requireAdmin();
  if (!gate.ok) redirect(gate.reason === "unauthenticated" ? "/auth" : "/");

  const supabase = await createServiceRoleClient();
  const { data } = await supabase
    .from("hackathons")
    .select("*")
    .order("starts_at", { ascending: false });
  const hackathons = (data as Hackathon[] | null) ?? [];

  const counts = await Promise.all(
    hackathons.map(async (h) => {
      const [registrations, teams] = await Promise.all([
        supabase
          .from("hackathon_registrations")
          .select("id", { count: "exact", head: true })
          .eq("hackathon_id", h.id),
        supabase
          .from("teams")
          .select("id", { count: "exact", head: true })
          .eq("hackathon_id", h.id),
      ]);
      return { id: h.id, registrations: registrations.count ?? 0, teams: teams.count ?? 0 };
    }),
  );

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-heading text-3xl font-bold">Administração</h1>
          <Link href="/admin/pessoas" className="btn-secondary px-5 py-2 text-sm">
            Pessoas
          </Link>
        </div>

        <div className="mt-8 grid gap-4">
          {hackathons.map((h) => {
            const c = counts.find((x) => x.id === h.id);
            return (
              <Card key={h.id} className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Badge tone={h.status === "closed" ? "neutral" : "emerald"}>{h.status}</Badge>
                    <h2 className="mt-2 font-heading text-xl font-bold">{h.name}</h2>
                    <p className="text-sm text-muted">/{h.slug}</p>
                  </div>
                  <p className="text-sm text-muted">
                    {c?.registrations ?? 0} inscritos · {c?.teams ?? 0} times
                  </p>
                </div>
              </Card>
            );
          })}
          {hackathons.length === 0 && <p className="text-muted">Nenhum hackathon criado ainda.</p>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Grant yourself the first role**

With `ADMIN_EMAIL_ALLOWLIST` still set in `.env.local` as the bootstrap, sign in and open `/admin/pessoas`, then add your own email as `admin`. Confirm the row:

```sql
select role, hackathon_id from platform_roles;
```

Expected: one `admin` row with a null `hackathon_id`. From here the env var can be removed.

- [ ] **Step 6: Verify the gate**

Sign in with a non-admin account and open `/admin/pessoas`.
Expected: redirect to `/`.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/admin" src/components/admin/role-manager.tsx
git commit -m "feat(admin): manage admins and judges from the UI"
```

---

### Task 16: Cut the last ties and go green

**Files:**
- Modify: whatever the greps below surface.

**Interfaces:** none — this task closes out the build.

- [ ] **Step 1: Find every remaining reference**

```bash
grep -rn "HACKATHON_SLUG\|getActiveHackathon\|getCurrentUserTeam\|luma_registered_at\|age_attestation_at\|admin_id\|bh-\|lib/admin" src/ middleware.ts
```

Expected at the end of this task: no output.

- [ ] **Step 2: Fix each hit**

`HACKATHON_SLUG` / `getActiveHackathon` → `getHackathonBySlug(slug)` from the route. `getCurrentUserTeam` → `getTeamForHackathon`. The two dropped user columns → `hackathon_registrations` via `getRegistration`. `bh-*` classes → the semantic tokens from Task 6. `lib/admin` → `lib/roles`.

- [ ] **Step 3: Generalize the cron endpoint**

`src/app/api/cron/lock-submissions/route.ts` assumes a single edition. It should walk every edition whose deadline has passed. The `auto_lock_overdue()` RPC already loops over `hackathons`, so the route only needs its `HACKATHON_SLUG` lookup removed.

- [ ] **Step 4: Run everything**

```bash
npm test
npm run build
```

Expected: all vitest suites pass; the build completes with no type errors.

- [ ] **Step 5: Walk the whole flow once, signed out to signed in**

`/` → edition card → `/h/<slug>` → "Quero participar" → `/auth` → GitHub → `/conta` (fill name) → `/h/<slug>/inscricao` → `/h/<slug>/painel` → `conteudos` → `time/novo`.
Expected: no redirect loops, no 500s, every page in Superteam colours.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: drop single-edition assumptions, build green"
```

---

## What Phase 1 does not cover

Deliberately deferred, each to its own plan:

- **Phase 2** (by 07 Sep) — submission editor with the new fields, Resend integration and the three emails, admin content management UI.
- **Phase 3** (by 09 Sep noon) — auto-lock verification, screening view, finalist selection, finalist email.
- **Phase 4** (by 12 Sep) — judge voting screen and results.

`/h/[slug]/submissao` and `/h/[slug]/votacao` do not exist after Phase 1. The dashboard links to the submission route only once a team exists, so the dead link is not reachable from a fresh account before Phase 2 lands.
