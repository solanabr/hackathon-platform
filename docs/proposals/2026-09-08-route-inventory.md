# Route and screen inventory

Snapshot: `fae614a`, September 8, 2026. Discovery used the codebase graph first. Its `Route` nodes included fixture URLs and did not represent all App Router entry points; this inventory instead uses all indexed `page.tsx` and `route.ts` files, plus middleware/configuration. There are **33 pages and five route handlers**. A parameterized route is one template, not one screen per database row.

## Pages

Source paths below are relative to `src/app/`. Parenthesized folders do not appear in URLs. Edition-specific role, registration, team and availability guards are applied inside the page/actions in addition to middleware authentication.

| URL | Source | Audience / purpose | Essential review states | Sprint |
| --- | --- | --- | --- | --- |
| `/` | `(public)/page.tsx` | Campaign LP | Anonymous; signed in; locally registered; missing edition config; mobile CTA | P0 |
| `/auth` | `(public)/auth/page.tsx` | Shared authentication | Google/GitHub; OTP requested; eight-digit code; cooldown; error; returning session; `next` | P0 |
| `/pre-registro` | `(public)/pre-registro/page.tsx` | Campaign contact / qualification / next steps | Anonymous redirects to auth; steps 2/3/4; partial interest; self-confirmed external registration | P0 |
| `/h` | `(public)/h/page.tsx` | Editions hub | Current / future / past editions; external links; empty state | Regression |
| `/h/[slug]` | `(public)/h/[slug]/page.tsx` | Edition landing | Markdown; sponsors; date-gated finalists; draft/unavailable; external edition | Regression |
| `/h/[slug]/projetos` | `(public)/h/[slug]/projetos/page.tsx` | Public gallery | No published projects; finalist/winner overlays; invalid edition | Regression |
| `/h/[slug]/projetos/[submissionId]` | `(public)/h/[slug]/projetos/[submissionId]/page.tsx` | Public project details | Published project; missing/unpublished; external asset/link | Regression |
| `/u/[id]` | `(public)/u/[id]/page.tsx` | Public builder profile | Valid profile; no visible projects; invalid ID; draft-edition exclusion | Regression |
| `/guias/do-earn-ao-pix` | `(public)/guias/do-earn-ao-pix/page.tsx` | Public educational guide | Long text; mobile; outbound links | Outside sprint |
| `/privacidade` | `(public)/privacidade/page.tsx` | Privacy information | Analytics/attribution/assistant/channel description | P1 |
| `/termos` | `(public)/termos/page.tsx` | Terms | Consistent links from auth and registration | Regression |
| `/account` | `(app)/account/page.tsx` | Authenticated account/profile | Incomplete profile; avatar; contact edits; registrations and teams | Regression |
| `/h/[slug]/register` | `(app)/h/[slug]/register/page.tsx` | Local edition registration | Profile gate; open/closed registration; existing registration; external mode | Regression |
| `/h/[slug]/dashboard` | `(app)/h/[slug]/dashboard/page.tsx` | Participant edition dashboard | Incomplete registration; no team; existing team; external-submission panel; deadlines | Regression |
| `/h/[slug]/team/new` | `(app)/h/[slug]/team/new/page.tsx` | Create team | Complete registration; platform-team mode; already has team; validation | Regression |
| `/h/[slug]/team` | `(app)/h/[slug]/team/page.tsx` | Membership and invitations | Leader/member; pending invite; ghost invite; locked team; no team | Regression |
| `/h/[slug]/team-up` | `(app)/h/[slug]/team-up/page.tsx` | Recruiting board | Openings/seekers; filters; application; recruiting unavailable; empty | Regression |
| `/h/[slug]/submission` | `(app)/h/[slug]/submission/page.tsx` | Project editor | Leader/member; missing required fields; uploads; locked; external mode | Regression |
| `/h/[slug]/mentorship` | `(app)/h/[slug]/mentorship/page.tsx` | Book mentoring | Edition feature off; no team; leader/member; availability/booked | Regression |
| `/h/[slug]/content` | `(app)/h/[slug]/content/page.tsx` | Edition resources | Registration gate; published/empty content; external mode | Regression |
| `/h/[slug]/content/[contentId]` | `(app)/h/[slug]/content/[contentId]/page.tsx` | Resource detail | Published/missing; video/file/external link | Regression |
| `/judge` | `(app)/judge/page.tsx` | Judge entry point | No judge role; assigned editions; empty assignments | Outside sprint |
| `/judge/h/[slug]` | `(app)/judge/h/[slug]/page.tsx` | Judging queue | Assigned round; deadlines; completed/unrated items | Outside sprint |
| `/judge/h/[slug]/[submissionId]` | `(app)/judge/h/[slug]/[submissionId]/page.tsx` | Scoring screen | Assignment gate; ratings; save/error; wrong edition | Outside sprint |
| `/admin` | `(app)/admin/page.tsx` | Administration index | Global/scoped admin; no permission; missing service configuration | Outside sprint |
| `/admin/people` | `(app)/admin/people/page.tsx` | Platform role management | Global admin; role grant/revoke; error | Outside sprint |
| `/admin/h/[slug]` | `(app)/admin/h/[slug]/page.tsx` | Edition operations | Scoped admin; registrations; teams; status; configuration | Read/QA |
| `/admin/h/[slug]/page` | `(app)/admin/h/[slug]/page/page.tsx` | Markdown page editor | Edit/preview/save; too large; permission denied | Outside sprint |
| `/admin/h/[slug]/content` | `(app)/admin/h/[slug]/content/page.tsx` | Content management | Publish/draft; upload; ordering; soft deletion | Outside sprint |
| `/admin/h/[slug]/sponsors` | `(app)/admin/h/[slug]/sponsors/page.tsx` | Sponsors | Tiers; logo upload; ordering | Outside sprint |
| `/admin/h/[slug]/judges` | `(app)/admin/h/[slug]/judges/page.tsx` | Judges and assignments | Role selection; round; per-project assignment | Outside sprint |
| `/admin/h/[slug]/finalistas` | `(app)/admin/h/[slug]/finalistas/page.tsx` | Finalist selection | Ranking; placement; announcement timing | Outside sprint |
| `/admin/h/[slug]/mentorship` | `(app)/admin/h/[slug]/mentorship/page.tsx` | Mentor configuration | Catalog; private booking URL; bookings; archive | Outside sprint |

## Handlers, transports and redirects

| Method / path | Source | Purpose / gate |
| --- | --- | --- |
| GET `/auth/callback` | `(public)/auth/callback/route.ts` | Supabase PKCE exchange, safe return path and cookie handling |
| POST `/api/auth/signout` | `api/auth/signout/route.ts` | End session and 303 redirect |
| POST `/api/submit` | `api/submit/route.ts` | Invoke `submit_team`; server authorization/deadline enforcement |
| DELETE `/api/team/member` | `api/team/member/route.ts` | Invoke `remove_team_member`; leader/lock checks in RPC |
| GET `/admin/h/[slug]/export` | `(app)/admin/h/[slug]/export/route.ts` | Scoped admin CSV export; participant data |
| `/relay-hx9/static/:path*`, `/relay-hx9/:path*` | `next.config.ts` | PostHog proxy rewrites, excluded from auth middleware |
| `/sentry-tunnel` | `next.config.ts`, Sentry plugin | Generated error-reporting transport, excluded from middleware |
| `/_next/*`, image/static assets | Next.js / `public/` | Framework/assets, not extra application pages |
| Any path on `vibe.superteam.com.br` | `next.config.ts` | Redirect to the Vibeathon edition landing |
| Trailing slash; `/?code=...` | `src/middleware.ts` | Canonical redirect; recover OAuth callback |

There is **no `/api/cron/lock-submissions` handler** in this checkout despite historical documentation; deadline locking uses PostgreSQL `pg_cron`. Server actions in `actions.ts` are framework POST transports, not separate route files. No `robots.ts` or `sitemap.ts` was found in the graph inventory.

## Campaign screen states for Laura

| Surface | Current content / behavior | Proposed handoff |
| --- | --- | --- |
| Hero | Financial headline; cheque; mobile steps; primary registration CTA | Explain the event and the local offer immediately; preserve a clear primary action |
| `#solana` | Network statistics before the event explanation | Move supporting network context after participation explanation |
| `#cases` | Cloak and Bido | Verify amounts, dates, attribution and authorization; label as prior outcomes |
| `#jornada` | Three participation steps | Show local registration, official event entry, build/submit; community as support |
| `#calendario` | Dates and deadlines in code | Confirm exact cutoff/time zone; separate Brazil track schedule |
| `#trilha-brasil` | General Earn sponsor page | Use the actual listing when available, with rules and prize source |
| `#recursos` | WhatsApp, YouTube, Wiki, Earn, Academy, Discord | Stable analytics resource IDs independent of button wording |
| `#faq` | Ten questions in three groups | Correct claims; concise answers; measure question IDs |
| Before footer | Hub link | Assistant section and final registration CTA; preserve hub navigation |
| Floating assistant | Does not exist | One shared conversation with the footer section; avoid mobile CTA/cookie overlap |
| Auth | Standalone `/auth` | Laura chooses presentation; preserve direct URL, callback, OTP and keyboard operation |
| Contact | Name, WhatsApp, city/state, role, terms | Name the local registration; explain contact purpose |
| Qualification | Project/team intent, details; save and continue/later | Keep partial save and return paths; no extra lead form duplicate |
| Next steps | Local confirmation, external account/entry, group link | Separate self-reported registration from verified external status |

Shared states: loading (12 page/group loading boundaries), `error.tsx`, `global-error.tsx`, `not-found.tsx`, invalid edition, denied role, empty data, network timeout, keyboard focus and small-screen navigation. Visual validation of authenticated states remains pending preview access.
