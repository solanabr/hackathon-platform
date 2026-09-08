# Colosseum Campaign Growth Implementation Plan

> **For agentic workers:** Use the available `executing-plans` or `subagent-driven-development` skill when implementing this plan task by task. Checkboxes describe future implementation; completed assessment work is listed separately below.

**Goal:** Produce a joint preview combining Laura's design, accurate campaign copy, reliable registration measurement and a bounded assistant with a clear WhatsApp handoff.

**Architecture:** Keep Next.js, Supabase and the existing registration/qualification flow. The website assistant uses OpenRouter through the Next.js server, with approved retrieval and bounded read-only tools. Felix owns behavior, integration and measurement; Laura owns presentation and the final mount points. CRM/WhatsApp is an independent workstream. Consider the purchased managed EvoCRM when its API/channel constraints fit; evaluate a separate host only if self-hosting is justified.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, Supabase, PostHog, GTM, Vitest, Vercel and server-side OpenRouter; optional EvoCRM/WhatsApp integration.

---

## Inputs, ownership and time box

Read [audit](../../proposals/2026-09-08-growth-audit.md), [screen inventory](../../proposals/2026-09-08-route-inventory.md), [facts/copy](../../proposals/2026-09-08-campaign-facts-and-copy.md), [measurement plan](../../proposals/2026-09-08-measurement-plan.md), [OpenRouter assistant spec](../specs/2026-09-08-openrouter-assistant-design.md), [technical readiness](../../proposals/2026-09-08-technical-readiness.md) and [Evolution feasibility](../../proposals/2026-09-08-evolution-feasibility.md).

The initial assessment and private questionnaire are ready separately from implementation. A **4–6 hour joint preview** is feasible with two contributors, prompt owner answers and a ready preview environment. That estimate covers copy/design, targeted tracking fixes, and a demonstrable assistant surface/handoff. A custom live LLM plus CRM synchronization, durable queues, authenticated webhooks and production messaging validation needs a separately estimated second sprint. Do not silently count a fixture demonstration as live integration.

| Elapsed time | Felix | Laura | Review evidence |
| --- | --- | --- | --- |
| 0:00–0:20 | Resolve urgent questionnaire items; confirm conversion and access owners | Confirm visual direction and shared-file owner | Agreed scope and credible demo target |
| 0:20–1:40 | Atomic milestone/analytics fixes; approved copy handoff | Hero, page order, forms and responsive layout | Correct steps and stable event IDs |
| 1:40–3:20 | Attribution/consent QA; assistant controller and safe fallback | Assistant panel, footer and mobile integration | One conversation across two entry points |
| 3:20–4:30 | Conditional provider smoke test or labelled fixture; WhatsApp destination | Keyboard/mobile/error states | Demonstrable end-to-end preview |
| 4:30–6:00 | Integrate branches, checks, event evidence and demo script | Joint visual verification | Preview ready for Kuka |

Critical inputs for the preview: goal/target audience, official and Brazil-specific URLs/facts, preview Supabase access, analytics project/container ownership and person approving release. Live AI additionally needs its OpenRouter project key/budget, approved knowledge and a durable usage ledger. A WhatsApp number is needed only for that optional destination; CRM access and a VPS are not website AI dependencies. Missing provider access does not block copy, route inventory, questionnaire or fixture UI. It does block claiming a working live integration.

## Task 1: Agree boundaries and create integration workspace (15–20 min)

**Files:** this plan; existing `src/app/(public)/page.tsx`, `src/app/(public)/pre-registro/prereg-form.tsx`, `src/app/globals.css` as shared boundaries.

- [ ] Record owner answers in the private workroom, never in public git if they include private information.
- [ ] Resolve the technical-readiness matrix: actual Supabase organization plan and project compute, Vercel preview ownership, staging database and secure credential handoff. Public source does not establish billing status. Record CRM/VPS ownership separately without delaying the page work.
- [ ] Confirm Laura publishes `laura`. It returned 404 from GitHub on September 8 during the assessment; do not invent a remote ref or overwrite her work.
- [ ] Agree Laura edits LP markup, CSS and assistant panel. Felix provides copy by stable section/CTA IDs and edits action/library/controller files. Coordinate the small `prereg-form.tsx` analytics change before either cherry-picks it.
- [ ] Fetch and compare bases with `git fetch origin`, `git log --oneline --left-right origin/main...origin/laura` once published.
- [ ] Keep `feat/felix-growth-ai` isolated. Later create `integration/colosseum-preview` from the agreed base, merge the two branches there and resolve shared markup with Laura. Do not merge to `main` as part of preparing the demo.

## Task 2: Integrate approved copy into Laura's layout (30–45 min, parallel)

**Files:** modify `src/app/(public)/page.tsx`, `src/app/(public)/pre-registro/page.tsx`; review `src/components/campaign/mobile-cta-bar.tsx`, `mobile-steps.tsx`. Copy source: `docs/proposals/2026-09-08-campaign-facts-and-copy.md`.

- [ ] Apply the hero/metadata and named local/official registration distinction from the copy document.
- [ ] Replace prize/guarantee language using the supplied investment and form-state copy. Remove unverified numeric claims until evidence is supplied.
- [ ] Reorder supporting information according to Laura's design and preserve existing anchor destinations or update their links together.
- [ ] Keep incomplete qualification/save-later/return states from PR #96.
- [ ] Review anonymous, authenticated and locally registered CTAs against the route inventory. The direct `/auth` URL, callback and `next` behavior must remain usable even if Laura adds a modal entry.
- [ ] Run `npm run lint`; visually review mobile and desktop. No new unit tests are needed for wording alone.

## Task 3: Make conversion milestones reliable (60–90 min)

**Files:** modify `src/app/(public)/pre-registro/actions.ts`, `prereg-form.tsx`, `src/components/analytics/google-tag-manager.tsx`; create `src/lib/registration-milestones.ts`, `src/lib/__tests__/registration-milestones.test.ts`. If an RPC is selected, create the next unused migration after fetching current main (candidate `supabase/migrations/00064_registration_milestones.sql`; never reuse a number taken by another branch).

- [ ] Add behavioral tests for first completion, already completed, repeated external declaration and persistence failure; verify they fail before changing the action contract.
- [ ] Extract the milestone persistence boundary. Choose database conditional write/insert-conflict handling or an authenticated RPC. Preserve first-touch attribution and require the current authenticated user; do not accept an arbitrary user ID as authority.
- [ ] Use `newly_completed: boolean` in the successful action result. A duplicate/re-save returns success with false. A persistence error returns a field/general error without capture.
- [ ] Emit `registration_completed` and GTM `inscricao_concluida_hackathon` only for the first successful completion. Extend GTM properties with an explicit allowlist; preserve event names.
- [ ] Apply external self-confirmation only where `luma_confirmed_at IS NULL`; track only a changed row. Keep self-report language in UI/reporting.
- [ ] Run `npm test -- src/lib/__tests__/registration-milestones.test.ts`. Expect first/duplicate/error cases to pass.
- [ ] On a disposable Supabase database, issue two concurrent completions for the same user/edition and inspect the single milestone/unchanged original attribution. Unit mocks do not prove database atomicity. If no disposable DB is available, record this gate as pending and do not label the fix production-verified.
- [ ] Commit the behavior change separately using an English message, e.g. `fix: count campaign registration milestones once`.

## Task 4: Attribution and consent environment pass (45–60 min)

**Files:** modify `src/components/analytics/attribution-capture.tsx`, `src/lib/attribution.ts`, `src/lib/__tests__/attribution.test.ts`, `src/components/analytics/google-tag-manager.tsx`, `.env.example`, `docs/TRACKING.md`; inspect `src/app/layout.tsx`, `src/instrumentation-client.ts` and current consent component before editing its integration.

- [ ] Test existing first-touch TTL, malformed values and blocked storage; add only missing behavior cases.
- [ ] Trigger attribution capture on relevant navigation changes, using Next's routing primitives with required Suspense boundaries where applicable. Preserve first-touch semantics and schema.
- [ ] Add environment controls for GTM and preview telemetry. Decide container-load policy with the owner and verify actual tags under accept/deny/withdraw states.
- [ ] Add stable `edition`, CTA/resource/question IDs at existing call sites; keep legacy dashboard values where required.
- [ ] Verify automatic pageview URL capture strips callback/invitation/query secrets and provide an accessible privacy-preferences entry through the existing consent UI.
- [ ] Run `npm test -- src/lib/__tests__/attribution.test.ts`, then the browser cases in the measurement plan. Record vendor delivery only when confirmed in the dedicated QA project/container.
- [ ] Update `docs/TRACKING.md` with actual behavior and commit separately.

## Task 5: OpenRouter assistant surface (60–100 min for fixture preview)

**Files:** create `src/components/campaign-assistant/{assistant-controller,assistant-panel}.tsx`, `src/lib/campaign-assistant/{contracts,knowledge}.ts`; mount via `src/app/(public)/page.tsx`. Live work adds `{retrieval,prompt,openrouter,controller,budget}.ts` in that library directory, `src/app/api/campaign-assistant/route.ts` and behavior tests under `src/lib/__tests__/`.

- [ ] Use the OpenRouter spec's typed reply contract as the boundary with Laura. The user has selected direct website AI; no EvoCRM widget/channel decision remains for this surface.
- [ ] Build the shared controller with open/close/send/error/retry states. Laura implements the panel and two entry controls; only `/` receives the initial assistant.
- [ ] Demonstrate shared state, keyboard focus, Escape, screen-reader completion announcements and mobile CTA/cookie coexistence using fixtures clearly labelled in preview. Add categorical telemetry without message text or personal identifiers.
- [ ] Prepare a versioned, approved public source bundle and a retriever interface. Do not ingest private stakeholder responses wholesale. Start with lexical/topic retrieval; introduce hybrid search only if evaluation demonstrates a need.
- [ ] Version the system prompt and create 30 reviewed evaluation cases from the spec's categories. Keep exact dates and local offers pending until approved.
- [ ] Before paid generation, implement server-only key handling, session/input validation, atomic durable usage reservations, idempotency, privacy-compatible provider routing and validated source/action rendering. Budget store failure must disable paid calls.
- [ ] Implement the bounded controller: initial retrieval, at most one additional lookup, at most three application OpenRouter requests including fallback/repair, 20-second total deadline. Do not render unvalidated model text.
- [ ] Compare the three catalog candidates on the same approved corpus and cases. Measure actual quality, P50/P95 latency and cost; select primary and fallback only after critical-case acceptance. Catalog availability and example cost arithmetic are not benchmark results.
- [ ] Test no-evidence, injection, private-data requests, stale sources, duplicate submissions, provider timeout/429, invalid response, storage failure and budget exhaustion. Run concurrent ledger tests on a disposable store before enabling live access.
- [ ] Commit the preview surface separately from live enablement. Live RAG/model evaluation is an additional estimated block unless its dependencies and acceptance evidence are already ready; a fixture is not a provider smoke test.

## Task 6: WhatsApp destination and account evidence (20–40 min; account dependent)

**Files:** create `src/lib/campaign-assistant/handoff.ts`, test `src/lib/__tests__/campaign-handoff.test.ts`; modify Laura's assistant panel and campaign resource mount; update `docs/proposals/2026-09-08-evolution-feasibility.md` with non-sensitive verified status only.

- [ ] Obtain the tenant panel URL and read subscription activation, available campaign sends, channel allowance, token entitlement and connected provider. QR alone does not prove unofficial mode.
- [ ] Ask about an existing CRM and host before choosing installation. For Community, confirm region, capacity, architecture/image compatibility, Docker/admin access, DNS, isolated storage, backups and an operator; use the technical-readiness decision tree. An organization-controlled existing number may qualify for migration/coexistence; a new number is not inherently required.
- [ ] Read actual Meta account/quality/limit and approved-template/billing state for the selected business number. Listing inboxes cannot prove these items.
- [ ] Build a direct WhatsApp URL from an owner-confirmed E.164 business number with fixed nonpersonal greeting text; distinguish it from the existing community invite. Test invalid number, encoding and missing-number fallback.
- [ ] Add `whatsapp_handoff_clicked` with placement/edition only. Do not send or import contacts during this read-only assessment.
- [ ] For a later live CRM handoff, first obtain a validated conversation body and webhook authentication contract. Add contact binding, durable idempotency and receipt handling before writes; use only necessary consented fields.
- [ ] Report the current 10,000/month allowance as verified or pending at account level. If access is missing, preserve “unverified”; do not interpret elapsed time as account approval.

## Task 7: Joint preview and review (45–60 min)

**Files:** both branches' changed files; final verification record below.

- [ ] Integrate on `integration/colosseum-preview` only once `origin/laura` exists and the shared base is agreed. Review `git diff --check` and the conflict resolutions.
- [ ] Use Node 24 (`nvm use` when available), then `npm run lint` and `npm test`.
- [ ] Run the CI-equivalent compile gate: `NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key SUPABASE_SERVICE_ROLE_KEY=placeholder-service-role-key npm run build`. These are placeholders, not production credentials.
- [ ] In the real preview environment, walk anonymous → auth → local contact → partial qualification → resumed qualification → next steps → external link/self-report. Verify RLS/role and edition regressions from the inventory; never submit a production participant entry for QA.
- [ ] Check desktop/mobile, keyboard, loading/error/empty states, stable tracking IDs, assistant fallback and separate support/community actions.
- [ ] Prepare Kuka's five-minute demo: event explanation; registration distinction; save/resume; assistant and sources; measured handoff; source-based counts. Explicitly identify fixtures and pending account permissions.
- [ ] Record preview URL and remaining gates. Request release review of the concrete preview before production deployment; no main merge is included in this assessment.

## Second sprint: live automation

After account and campaign approval: choose the five journeys, define eligibility/stop conditions, validate templates and permitted contacts, create durable outbox/receipt storage with RLS and explicit grants, integrate provider-confirmed webhook authentication, and test idempotent retries/opt-out/operator takeover. Validate one owner-requested controlled exchange before scheduling any campaign. Installation of a persistent Evolution server is conditional on a demonstrated need and an identified host; the managed service path does not require it.

Estimate this work after tenant API validation. It is not safely promised inside the same six-hour preview window. Monthly allowance does not guarantee any particular daily delivery volume.

## Verification record for the assessment

- Repository cloned and isolated branch created from `fae614a`.
- Complete source inventory: 33 page templates, five route handlers, 63 migrations.
- Node 24; dependency lock unchanged; **212 tests in 18 files passed**; **ESLint passed**.
- **Production compile/build passed** with CI placeholder Supabase values; no live database or provider integration was exercised.
- Existing build warnings: parent lockfile causes workspace-root inference; middleware and Sentry option deprecations. No unrelated dependency/framework refactor performed.
- Grok Heavy advisory review completed via local Delegate, model `x-ai/grok-4.20-multi-agent`; follow-up API/plan evidence was checked independently.
- Independent review of the revised OpenRouter spec, implementation plan and technical-readiness matrix: approved with no blocking issues. The review explicitly limits the 4–6-hour estimate to the fixture preview; live inference and CRM retain separate dependencies and estimates.
- No production database writes, infrastructure installation, outbound campaign or contact import performed.

Future implementation checkboxes remain unchecked intentionally: this commit is the assessed work process and integration design, not a claim of a completed redesign or live assistant.
