# UTM plan

Rule: **every link shared outside the platform carries the four UTMs.** No
UTMs, no attribution — the 09-04 campaign research found 0 tagged hits, and
WhatsApp/Instagram in-app clicks arrive as `$direct` without them.

## Convention

All lowercase ASCII, hyphens inside a value, no spaces.

| Param | Meaning | Values |
| --- | --- | --- |
| `utm_source` | where the click physically happens | `instagram`, `x`, `linkedin`, `whatsapp`, `email`, `youtube`, `discord`, `partner`, `qr`, or the influencer handle (`joaodev`) |
| `utm_medium` | channel class | `social`, `whatsapp`, `email`, `partner`, `influencer`, `paid` |
| `utm_campaign` | which campaign | `colosseum-2026`, `vibeathon-2026`, `cursor-2026`, `universitario-2026`. Waves as a suffix: `colosseum-2026-lastcall` |
| `utm_content` | the post or creative | `bio`, `story-2026-09-08-1`, `reel-bido-case`, `thread-1`, `pinned`, `newsletter-1`, `founder-<name>` |

Land on the campaign LP (`/` for Colosseum), never on `/pre-registro`, so the
first pageview captures the referrer and scroll. Retargeting people who
already have an account is the one exception (`/pre-registro?utm_…`).
Shorten with one branded short link per row so WhatsApp previews stay clean;
the short link 302s to the full UTM URL.

The platform's own outbound links (footer Earn, hub cards, dashboard step 3)
use `utm_source=platform&utm_medium=referral` and a `utm_content` naming the
surface — see `withPlatformUtm()` in `src/lib/attribution.ts`.

## Colosseum 2026

Base: `https://hackathon.superteam.com.br/?utm_campaign=colosseum-2026&`

| Channel | Link |
| --- | --- |
| Instagram bio | `…&utm_source=instagram&utm_medium=social&utm_content=bio` |
| Instagram stories | `…&utm_source=instagram&utm_medium=social&utm_content=story-<yyyy-mm-dd>-<n>` |
| Instagram feed / Reel | `…&utm_source=instagram&utm_medium=social&utm_content=reel-cheque-v1` |
| X | `…&utm_source=x&utm_medium=social&utm_content=thread-1` |
| LinkedIn (company + founders) | `…&utm_source=linkedin&utm_medium=social&utm_content=founder-<name>` |
| WhatsApp community (pinned) | `…&utm_source=whatsapp&utm_medium=whatsapp&utm_content=pinned` |
| WhatsApp broadcast (Cursor/Vibeathon base) | `…&utm_source=whatsapp&utm_medium=whatsapp&utm_content=broadcast-cursor-base` |
| Superteam newsletter (Resend) | `…&utm_source=email&utm_medium=email&utm_content=newsletter-1` |
| Partner community posts | `…&utm_source=partner&utm_medium=partner&utm_content=<community-slug>` |
| Influencer 1 | `…&utm_source=<handle-1>&utm_medium=influencer&utm_content=<yyyy-mm-dd>-<n>` |
| Influencer 2 | `…&utm_source=<handle-2>&utm_medium=influencer&utm_content=<yyyy-mm-dd>-<n>` |
| Influencer 3 | `…&utm_source=<handle-3>&utm_medium=influencer&utm_content=<yyyy-mm-dd>-<n>` |
| Event slides / QR | `…&utm_source=qr&utm_medium=partner&utm_content=<city>-<yyyy-mm-dd>` |
| Last call (any channel) | same, with `utm_campaign=colosseum-2026-lastcall` |

Reads them: dashboard **Campanha Colosseum 2026** (PostHog 2064593), tiles
"Atribuição — utm_source (LP)" (`$pageview` on `/` by event `utm_source`) and
"Cadastros por utm_source" (`registration_completed` by person
`$initial_utm_source`). Add the `utm_medium × utm_campaign` and `utm_content`
breakdowns from the research report once traffic exists. Consent-independent
truth is the `hackathon_registrations.utm_*` columns (below).

## Vibeathon 2026

Base: `https://vibe.superteam.com.br/?utm_campaign=vibeathon-2026&`

`vibe.superteam.com.br` is a host redirect in `next.config.ts`
(`/:path*` → `/h/vibeathon-superteam-replit`, 307). The destination has no
query of its own, so Next.js forwards the request's query string and the UTMs
reach the edition page intact. Re-check after touching that redirect:
`curl -sI "https://vibe.superteam.com.br/?utm_source=x" | grep -i location`
must show `?utm_source=x`.

| Channel | Link |
| --- | --- |
| Instagram bio | `…&utm_source=instagram&utm_medium=social&utm_content=bio` |
| Instagram stories | `…&utm_source=instagram&utm_medium=social&utm_content=story-<yyyy-mm-dd>-<n>` |
| X | `…&utm_source=x&utm_medium=social&utm_content=thread-1` |
| LinkedIn | `…&utm_source=linkedin&utm_medium=social&utm_content=post-1` |
| WhatsApp community | `…&utm_source=whatsapp&utm_medium=whatsapp&utm_content=pinned` |
| WhatsApp broadcast | `…&utm_source=whatsapp&utm_medium=whatsapp&utm_content=broadcast-1` |
| Newsletter | `…&utm_source=email&utm_medium=email&utm_content=newsletter-1` |
| Replit (partner) | `…&utm_source=partner&utm_medium=partner&utm_content=replit` |
| Influencer N | `…&utm_source=<handle>&utm_medium=influencer&utm_content=<yyyy-mm-dd>-<n>` |

Reads them: the same PostHog tiles filtered on `$pathname = /h/vibeathon-superteam-replit`,
plus `hackathon_registrations.utm_*` joined on the Vibeathon edition.

## Universitário 2026

Base: `https://uni.superteam.com.br/?utm_campaign=universitario-2026&`

`uni.superteam.com.br` is a separate site: its UTMs land in **that** property's
analytics, not in PostHog 580399 nor in `hackathon_registrations`. Use the same
convention so the two reports line up, and read them on the Universitário
site's own analytics. Links from this platform to it (hub deck and gallery
cards) go out as `utm_source=platform&utm_medium=referral&utm_campaign=universitario-2026&utm_content=hub_deck|hub_gallery`.

| Channel | Link |
| --- | --- |
| Instagram bio / stories | `…&utm_source=instagram&utm_medium=social&utm_content=bio` / `story-<yyyy-mm-dd>-<n>` |
| X / LinkedIn | `…&utm_source=x|linkedin&utm_medium=social&utm_content=post-1` |
| WhatsApp community / broadcast | `…&utm_source=whatsapp&utm_medium=whatsapp&utm_content=pinned` / `broadcast-1` |
| University mailing lists | `…&utm_source=email&utm_medium=partner&utm_content=<university-slug>` |
| Student orgs / partners | `…&utm_source=partner&utm_medium=partner&utm_content=<org-slug>` |
| Influencer N | `…&utm_source=<handle>&utm_medium=influencer&utm_content=<yyyy-mm-dd>-<n>` |

## Persisting attribution on registration

Migration `00059_registration_attribution.sql` adds nullable `utm_source`,
`utm_medium`, `utm_campaign`, `utm_content`, `referrer` to
`hackathon_registrations`. `src/lib/attribution.ts` snapshots the first touch
into localStorage (`stbr-attribution`, 90 days, first value wins). No cookie
and no consent gate: first-party campaign data that stays on the device until
the person registers (rationale in the file header).

### Wiring (follow-up, files owned elsewhere)

1. **Capture on landing** — mount a tiny client component that calls
   `captureAttribution()` in a `useEffect` on `src/app/(public)/page.tsx` and
   `src/app/(public)/h/[slug]/page.tsx` (or once in the root layout; the
   helper is idempotent and cheap).
2. **Send with the form** — in `src/app/(public)/pre-registro/prereg-form.tsx`
   and `src/components/registration/registration-form.tsx`, read
   `readAttribution()` in a `useEffect` into state and render the five values
   as `<input type="hidden" name="utm_source" …>` (one per column, skip nulls).
   Do not read localStorage during render: hydration mismatch.
3. **Write in the actions** — in `src/app/(public)/pre-registro/actions.ts`
   (`preRegister`) and `src/app/(app)/h/[slug]/register/actions.ts`
   (`registerForHackathon`), call `attributionFromFormData(formData)` and
   spread the result into the `hackathon_registrations` upsert **only when
   the row is new** (`!existing`), so a re-save never overwrites the first
   touch. The existing-row select is already there in both actions.
4. **Send to PostHog too** — pass `utm_source`/`utm_campaign` as properties
   on the server `registration_completed` event so the "Cadastros por
   utm_source" tile stops depending on person merge.
5. `HackathonRegistration` in `src/types/db.ts` already carries the columns.

## Outbound links from the platform

Tagged with `withPlatformUtm()` in this change: footer Earn link
(`utm_content=footer`), hub deck and gallery external editions
(`hub_deck`, `hub_gallery`; Universitário → `uni.superteam.com.br`), the
external-submission dashboard button (`dashboard_step3`; Vibeathon → Earn),
and the Earn link in `/guias/do-earn-ao-pix` (`guia_earn_pix`). Emails only
link back to the platform, nothing to tag.

Still untagged, owned by the LP / forms agents:

- `src/app/(public)/page.tsx` line ~85 and ~565: `https://superteam.fun/earn/s/superteambr`
  (Recursos list and the Trilha Brasil card — the Earn card that out-clicks
  Colosseum) → `withPlatformUtm(url, { content: "lp_recursos" | "lp_trilha_brasil", campaign: "colosseum-2026" })`.
- `src/app/(public)/pre-registro/page.tsx` line ~178: `hackathon.external_url`
  (`https://colosseum.com/signup`) → `withPlatformUtm(url, { content: "pre_registro_step3", campaign: "colosseum-2026" })`.
- Colosseum's own site is not ours, so `accounts.google.com` showing as a top
  referrer on `/` is the OAuth round-trip, not a link problem: fix the `next`
  param on the auth callback for the pre-registro flow (research item 4).
