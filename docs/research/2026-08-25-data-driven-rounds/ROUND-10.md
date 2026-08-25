# Round 10 — Working-tree re-verification, SEO/share, auth edges, error UX, risk register

5 agents. The final exploration round before the review rounds (11-13).

## Working-tree re-verification (agent 1)
- **Baseline drift confirmed**: the live tree diverged from the audit snapshot (WIP landed 18:15-18:16 that the rounds never saw).
- **The WIP is still RED**: `pnpm exec tsc --noEmit` fails (page.tsx:17/82/184 + sections.tsx:76); `pnpm run build` fails typecheck; `pnpm test` 77/78 (roles.test still failing). 00036 still lacks unique + draft-gated RLS + touch trigger; thumbnail_url still in it; subtitle hardcoded. requireEditionAdmin still zero callers. Draft-leak open (00042 never written).
- NEW code the rounds hadn't seen: sections renderer, listSections, 00036, react-markdown, .prose-lp, roles.adminFor, the sections-driven page rewrite.

## SEO / share surfaces (agent 2)
- **Home, edition landing, and gallery share as image-less text cards** — WhatsApp (the distribution channel) shows generic copy, no image. Root metadata has no openGraph; no opengraph-image.tsx; the edition/gallery pages have no generateMetadata.
- **No metadataBase anywhere** — relative og images can't resolve. Reuse siteUrl() as metadataBase.
- Per-page metadata design: edition landing (name + description + cover via getPublicUrl), gallery, submission detail (has og; add og:url, slice desc ~160 chars), builder profile (headline; NOT the 96px avatar as og:image — below WhatsApp's minimum).
- **The YT/DDG remotePatterns flag is DISPROVED for live** — nothing renders those thumbnails yet; embeds are iframes; avatar degrades to an initial.
- Draft editions can't leak via metadata (views gate non-draft); skip the sitemap (distribution is WhatsApp); add canonical once metadataBase lands.

## Auth / session edges (agent 3)
- **OTP email link is dead**: the callback handles only `code`, never `token_hash` — clicking the emailed code fails; only typed-code works. Branch on token_hash → verifyOtp.
- **Session expiry mid-compose = silent loss**: the browser-side save() errors without re-auth; submit's fetch follows the middleware 307 to the auth HTML and throws. Fix: on auth error in save(), redirect to /auth?next=; exclude /api from the middleware redirect (401 JSON).
- **First-login ignores judgeFor** (judge lands on /) — fold resolveRoleState into redirectPath.
- **Ghost row never links on email mismatch; accept_team_invite has NO caller** (grep); the invite email has no token link. Fix: a tokenized /invite/[token] link or a claim-by-email action.
- next dropped on callback retry; double-account (OAuth+OTP) depends on GoTrue config; deleted users handled.

## Error / edge UX (agent 4)
- **No error boundaries, no not-found anywhere** — every throw → default English 500; every notFound → unbranded 404. Add branded not-found + error.tsx in both route groups + global-error.
- **The submit fetch is unguarded** — a network throw (venue dead spot) leaves the button stuck "Submetindo…" with no error. Catch → the existing red box, re-enable the button.
- **Finalists silently vanish / the edition page can 500**: the service-role read ignores error → false "nobody made the cut"; the client throws without the env key. Render an honest error card, distinct from empty.
- Exact-match RPC maps are fragile (PostgREST prefixing downgrades to generic); "error vs empty" is inconsistent (landing says "Nenhuma edição" on a DB outage); raw English Supabase errors leak into pt-BR forms.
- Ranking: submit (venue deadline) > finalists (Pitch Day) > boundaries > maps > empty-vs-error.

## Risk register (agent 5)
~28 risks deduped, top 15:
1. **E1** Resend sandbox (all email lost) — #1
2. **O1** finalist reveal = manual flip + unverified email, no in-app panel
3. **W1** WIP red (uncommitted, branch moved)
4. **S1/S2** draft edition anon-readable (hackathons_read + public_schedule + sections)
5. **O2** agenda broken ("Em breve" leak, speakers erased, no Pitch Day card)
6. **S5** mock fixtures public
7. **D1** type-set collision → build won't compile
8. **D2** apply-before-merge 00036 → page 500s
9. **D3** 00038 rejects live submissions (mitigated by design)
10. **O4** serviceRole crash → landing 500s
11. **O3** mentoria/evento can't publish
12. **O6** judges not onboarded
13. **O5** silent-death ignored errors
14. **S4** requireEditionAdmin dead
15. **O7** team-size rules disagree across 5 sites
- Mitigation is mostly DESIGN-LOCKED, not executed (only D3/D4/D5/S3/W2 neutralized by the plan).
- The WIP is the gating condition: everything in M1 is blocked on settling it.

## Where rounds 11-13 focus (REVIEW ROUNDS)
11: review 1-10, consolidate, map coverage, chart directions for 14-20. 12-13: refine the direction and dispatch.
