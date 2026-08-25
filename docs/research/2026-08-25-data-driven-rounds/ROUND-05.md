# Round 5 — Ground truth, deploy readiness, performance, editor fields, test matrix

5 agents. Key outcome: the rounds before this were DESIGN; this round established what's REAL.

## Ground truth (agent 1)
- **The in-flight work is RED**: `pnpm test` 1 failed/77 (roles.test.ts expects the old resolveRoles shape; the WIP added `adminFor`); `pnpm run build` fails typecheck with 4 errors (duplicate ScheduleRow, dropped HackathonContent import, deliverables kind, the sections case).
- **The type-set collision is still live**: SectionKind = markdown|phases|schedule|prizes, migration check + sections case include `deliverables`, and `page.tsx:207` falls back to `kind: "deliverables"`.
- 00036: table `hackathon_sections`, kind check, **no unique constraint**, RLS `visible and deleted_at is null` only (**draft leak stands**), grants ok, backfill seeds positions 1-4 hardcoded to the slug with "Passo Fundo" hardcoded, thumbnail_url added to hackathon_contents.
- The admin route `/admin/h/[slug]/sections` does NOT exist (dangling Editar link). react-markdown + .prose-lp present; **no h1 remap** in the markdown.
- The other Claude ALSO added: scoped admins (`adminFor`/`requireEditionAdmin`), page fallback sections. NOT fixed: collision, unique, RLS gate, admin route.

## Deploy + migration readiness (agent 2)
- **The DB is at 00035, not 00031**: public_submissions returns rows (00032), teams.placement exists (00033), pending_membership_for_edition exists (00034). 00036 NOT applied (PGRST205).
- **Deliverability is still the #1 pre-event risk**: RESEND_FROM = `onboarding@resend.dev` (sandbox, only reaches the owner), domain unverified, key is send-only restricted. Fix: verify superteam.com.br, set RESEND_FROM, test to a non-owner.
- **Apply-before-merge is one-directional**: page.tsx:183 calls listSections → the edition page 500s if 00036 isn't applied. But the current 00036 must be REWRITTEN first (round 3 plan).
- Deploy order: 00036 (post-rewrite)/00037/00039/00041 inert-safe; 00038 + 00040 ship WITH consuming UI (00040's kind-constraint drop is irreversible).
- Rollback: schema dump + saved submit_team body pre-batch.
- **Pre-event checklist (top 10)**: verify Resend + change RESEND_FROM; rewrite+apply 00036 before code; fix SectionKind; set NEXT_PUBLIC_SITE_URL on Vercel; publish content; get judge emails signed in; status-flip plan for 09/10; test create-edition; delete mock fixtures; rotate leaked secrets.

## Query performance (agent 3)
- Verified: duplicate auth state per render (header re-resolves; 2× getUser + 2× profile), `liveDashboardPath` runs when nothing needs it (only the auth flow consumes redirectPath), createServerSupabaseClient uncached (9 client constructions on the dashboard).
- Fix: cache() resolveAuthenticatedUserState + createServerSupabaseClient; split a light `resolveAuthIdentity` for requireUser/roles; skip liveDashboardPath outside the auth flow.
- Net: dashboard 17-19 → ~13-14; public authed 9-13 → ~6-7.
- No new data-driven queries to add (partners/prizes ride existing rows today).

## Editor fields + data flow (agent 4)
- **column↔data routing needs an explicit `column: string | null` marker per deliverable** — otherwise the design re-creates the coupling it removes.
- save() must MERGE data (hydrate from initial.data, write data: {...initial, ...dirty}) — a whole-object write drops sibling keys.
- Error surface: the exact-match maps fail the keyed code — route must `startsWith("missing_required_field:")`; editor needs the deliverables prop to map key→label + a ref to scroll/focus.
- **The dashboard checklist is a third hardcoded source** — must read deliverables + submissions.data or it silently disagrees.
- Hydration precedence: column-first-then-data, guard a data key shadowing a column.
- Downstream consumers (judge page, gallery detail, public_submissions view) must expose data fields — whitelist at render, not raw jsonb.

## Test matrix (agent 5)
- The refactor units DON'T EXIST yet (rounds 2-4 were design). The live suite is already red (roles.test.ts).
- The event-critical coverage: phaseBoundaries deadline-instant tests + the milestone chain (untested today) + the deliverables decision (extract missingRequiredDeliverables as a pure fn).
- Proposed matrix: buildPhases (N-phase, deadline instant, overrides), nextMilestone (both modes, submitted-skip), missingRequiredDeliverables, schemas validators, contentAvailability, defaultEditionConfig, RENDERERS exhaustiveness. ≈+40-50 tests → ~120-130.
- Integration/impersonation (Supabase MCP) for: the RPC, RLS, the serviceRole crash, remotePatterns on YT thumbnails.

## Where round 6 focuses
Home hub data-driven-ness, the dashboard composition, migration correctness (the planned ALTERs vs the real schema), multi-edition admin operations, and the notifications layer.
