# Round 7 — Data-access/RLS, edition roles, submission lifecycle, content lifecycle, i18n

5 agents. The plumbing the refactor rests on.

## Data-access / RLS (agent 1)
- **`hackathon_sections` anon policy leaks draft editions**: `00036:34-35` has NO `to` clause (defaults to PUBLIC) and no `hackathons.status` gate. Contract for sections/partners/phases: `for select to anon, authenticated using (visible and not deleted and exists (hackathons.status <> 'draft'))`; writes service-role.
- **`hackathons_read using (true)` still exposes drafts** (00001:232) — the app filters in code; the data boundary is open. `using (status <> 'draft')` is safe (admins read via service-role). public_schedule shares the gap.
- **`submissions.data` grant gap**: 00018 scopes UPDATE to a fixed list; add `grant update (data) on submissions to authenticated` in 00037. hackathons.deliverables/prizes/registration_config need no grant (no authenticated UPDATE on hackathons anywhere — keep it service-role).
- AGENTS.md service-role rule is stale (~15 real call sites); codify: anon-key client for public/participant reads, service-role for admin/judge + all writes.
- `.select("*")` drift exists in 9+ spots; codify explicit columns, never `*` over the new jsonb.

## Edition-scoped roles (agent 2)
- **`requireEditionAdmin` is DEAD CODE**: defined at roles.ts:51, ZERO callers; all 13 edition surfaces gate on global `requireAdmin()` — an edition-scoped admin cannot pass any admin page. Swap `requireEditionAdmin(hackathon.id)` on every `/admin/h/[slug]/**` page + action; keep `requireAdmin` only on `/admin` index, people, create-edition.
- **Broken loop**: the header shows Admin/Editar links to `adminFor` users, but the routes redirect to `/` (requireAdmin-gated). Edition-scoped admins are under-granted, not over-granted — the risk is functional non-delivery.
- The grant UI cannot create scoped admins (hardcodes hackathon_id null for admin; label says "(jurado)").
- Judge onboarding gap: no judge invite; grantRole requires prior login; first-login routing ignores judgeFor.
- Judge model hardcoded two-round (triagem/final CHECKs) — derive a judging mode (judges|jury|community) from metadata.
- Role matrix: platform admin (all) / edition admin (composition, content, screening, judges, finalists for that edition) / judge / participant; enforcement lives in the action layer (swap), no new RLS required.

## Submission lifecycle (agent 3)
- **Team-size rules duplicated in 5 places AND disagree with config**: seed metadata says min 1, RPC enforces ≥2, accept_team_invite ≥4, handle_new_user <4, 00034 ≥4, UI ≥2. Read from metadata — the keys exist.
- `submissions.data` must land in the 00018 grant list; deliverables validation lives in submit_team (data is directly writable pre-lock via the 00022 policy).
- `teams.placement` needs a partial unique index + CHECK (two teams can be placement=1; placement on a non-finalist).
- **No audit trail**: only updated_at + last_edited_by (the trigger overwrites last_edited_by on every write — you know WHO, never WHAT). submissions_history by an after-update trigger, but the 800ms autosave would spam it — coalesce/cap.
- Status machine: placement on teams is correct; keep submissions.status team-owned; voting_opens/closes_at are dead columns; auto_lock_overdue publishes unvalidated drafts to public_submissions (near-empty gallery cards post-deadline).

## Content lifecycle (agent 4)
- **Availability is binary `published`; `scheduled_at` never gates anything** — a published item with a future date renders "disponível" immediately. Design `contentAvailability(item, now)`: deleted→hidden, !published→em-breve, published+future→upcoming, published+within window+live-capable→live-now, published+youtube_id→watchable, published+only external→media-only. Compare UTC instants.
- Publish guard blocks evento + link kinds (no exemption, no URL input). Allow: evento OR youtube_id OR external_url with media_type in (file,link).
- Soft-delete filter drift (service-role queries must hand-add .is(deleted_at, null)) — codify a contentBaseQuery().
- TZ asymmetry: fromLocalInput hardcodes -03:00, toLocalInput uses Intl — equivalent today, latent drift.
- Real live streaming NOT needed (YouTube owns it) — scheduled→live-now→replay + label suffices.

## i18n / copy (agent 5)
- ~70% of visible copy is chrome/code, ~30% data (and the data is already edition-scoped).
- Edition page copy is code (phase labels, section headings, deliverables, kind labels, CTAs); `metadata` jsonb is the natural home for per-edition overrides — it exists and is dead.
- **No per-edition locale/timezone**: 30+ hardcoded `America/Sao_Paulo`; needs locale+timezone columns feeding Intl.
- Emails fully pt-BR hardcoded (3 templates) — per-edition override via metadata.
- **Scope line**: per-edition copy model (data-driven copy now, chrome translation later); do NOT introduce next-intl/locale routing mid-refactor.

## Where round 8 focuses
The mergeable first milestone (the smallest slice that lands), event-ops readiness, the community/growth layer (Colosseum-style), observability/silent-death protection, and a focused security sweep.
