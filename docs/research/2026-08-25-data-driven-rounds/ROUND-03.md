# Round 3 — Migration plan, phases, registration config, admin composition, rendering architecture

5 agents, seeded by Round 2. Audit base: feat/home-lp-hub (note: /tmp/audit-lp snapshot predates the uncommitted in-flight 00036; the live repo carries it).

## Migration sequence plan (agent 1)
- **Rewrite the in-flight 00036 in place** (uncommitted, never deployed) rather than stacking a rename. Collapses to 00036-00041:
  - 00036 `hackathon_sections` (type check hero|timeline|schedule|prizes|content|partners|finalists|custom, position, heading, subtitle, body_md, config, visible, deleted_at) + unique(hackathon_id, position) + RLS public read gated on `status <> 'draft'` + grants.
  - 00037 `hackathons.deliverables jsonb` + `submissions.data jsonb`.
  - 00038 rewrite `submit_team` to loop deliverables (raise `missing_required_field:<key>`) + read team_size from config.
  - 00039 `hackathons.prizes jsonb` + `hackathon_partners` (role parceiro|apoiador) + backfills (bh-onchain from metadata->prizes; solana-cursor handcrafted — the regex is unreliable).
  - 00040 archive: `thumbnail_url` + `media_type check(none|file|link)` + kind remap (workshop→aula, mentoria→live, material→documento) — kind constraint drop is IRREVERSIBLE, must deploy with the archive UI.
  - 00041 edition config via metadata jsonb (registration + phases overrides).
- Sequence: 00036+00037 land together (inert-safe); 00038+00039+00040 deploy WITH their consuming UI; 00041 last. No dependency on the unapplied 00032-00035 (only 00001-00016 objects referenced).
- **In-flight 00036 conflicts (all real)**: `kind` vs `type` contract, SectionKind type-set collision (will not compile: `case "deliverables"` on a union without it), no unique constraint, RLS leaks draft sections, thumbnail_url belongs in 00040, seeded subtitle hardcodes "Passo Fundo".

## Phases timeline (agent 2)
- The 4-phase contract is hardcoded at 3 layers (phaseBoundaries, `lg:grid-cols-4`, duplicated label blocks in the public page AND the dashboard).
- **Normalized `hackathon_phases` table (not jsonb)**: (id, hackathon_id FK, key, label, description, starts_at null, ends_at null, position) + unique(key) + unique(position) + CHECK ends_at > starts_at. RLS select anon, writes service-role.
- **Derived-with-override**: null dates resolve from the hackathon columns (per bound key) so editing submission_deadline_at flows to the timeline and can't diverge from the enforced deadline. Custom keys must set both dates.
- `buildPhases(h, overrides?)` replacing phaseBoundaries; N-card renderer via `lg:grid-cols-[repeat(auto-fit,minmax(230px,1fr))]`; admin phases editor; backfill 4 phases with null dates (renders identically today).

## Registration + team-size config (agent 3)
- team_size hardcoded at 11 sites (RPC min 2, dashboard, delete-team gate; max in accept_team_invite, handle_new_user, 00034, addMemberByEmail, team page, "convidar até 3 pessoas"). metadata is EMPTY for the production edition (00017 inserts no metadata).
- Registration is Luma-only, no abstraction; `isRegistrationComplete` requires luma_confirmed_at (4 gate pages call it).
- **Typed `hackathons.registration_config jsonb`** (not metadata — it's unvalidated and mixes prizes): `{method: luma|native|external|null, url, copy, requires_luma_confirmation, team_size_min, team_size_max}`. method null = waitlist-only. RPC reads team_size_min from config (coalesce 2); the luma gate becomes `coalesce(requires_luma_confirmation, true)`. Form branches by method. Backfill luma/min2/max4.

## Admin composition surface (agent 4)
- No composition surface exists; reorder under a unique constraint MUST be a single security-definer RPC (`move_section(id, direction)` 3-step swap) — PostgREST can't span a transaction across two calls, and the current moveContent (two sequential awaits) collides once unique exists.
- Domain sections (timeline/schedule/content/finalists) render data owned elsewhere — editors expose only heading/order/visibility + deep-link to existing screens.
- One actions file per concern (sections/actions.ts, partners/actions.ts), requireAdmin + service-role + revalidatePath both admin and public paths.
- Nav gains a 5th "Página pública" link; admin route `/admin/h/[slug]/pagina`.

## Rendering architecture (agent 5)
- **`lib/edition.ts` `getEditionContext(slug)`**: the N-fetch consolidation (hackathon + public_schedule + gated finalists) exactly once; `sections.tsx` stays a SERVER module mapping sorted visible sections to `RENDERERS: Record<SectionType, (s, ctx) => ReactNode>`; only Countdown is a client leaf.
- **Deliverables**: `hackathons.deliverables` is the single source; the public DELIVERABLES block, dashboard checklist, and editor all render from it (generic field renderer in the editor).
- **buildPhases is duplicated verbatim** in the public page and dashboard — extract to lib.
- **Two divergent next-milestone derivations** (edition countdownTarget vs dashboard hero) — unify `nextMilestone(hackathon, now)`.
- Type the models (Section, Deliverable, Prize, Partner, Phase) in db.ts; make RENDERERS exhaustive over SectionType (compile-time).
- KIND_LABEL duplicated; `Date.now()` computed 3× per render — thread one `now` from context.

## Where round 4 focuses
The create-edition flow (the missing first step), the concrete per-section RENDERERS, the getEditionContext builder, the archive deep-spec, and the validation layer for all the new jsonb.
