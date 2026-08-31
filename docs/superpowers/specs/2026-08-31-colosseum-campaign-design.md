# Colosseum campaign: pre-registration landing page

The Colosseum Global Hackathon opens soon. The platform's root page becomes a
campaign LP that onboards interested builders into a pre-registration (so we
hold their contact for followup), and points them to the community and Lets
Build. The current home (edições hub) moves to `/h`. Reference for structure:
last year's El Gato campaign (hero + stats, ticker, journey steps, Solana
credibility); reference for flavor: Colosseum's "Crypto World's Fair" theme.

## Decisions (settled with the user)

- **Visual**: STBR design system (cream/ink/yellow, sticker cards, Archivo/
  Inter) — Colosseum nods live in content dressing only: dark `green-dark`
  hero band, ticket-style stat chips, the infinite ticker, restrained
  ornamental touches. No new design system, no dark fork.
- **No auth modal**: `/pre-registro` is a single stepper page embedding the
  existing AuthForm inline for logged-out visitors. OTP completes in-page;
  OAuth returns via `next=/pre-registro`.
- **No new prereg table**: the campaign is a `hackathons` row (external
  edition, status `draft` — no public edition page yet) and pre-registering
  writes a normal `hackathon_registrations` row with `terms_accepted_at`
  (luma_confirmed_at stays null; this campaign has no Luma gate).
- **Only schema change**: `users.whatsapp text` — editable on `/account` too.
- Community link (WhatsApp): https://chat.whatsapp.com/HPIu1YV3mri5QOGf0gUMTO
- Lets Build: https://stoxs.club/en/lets-build — 30-day program by STOXS,
  imersão presencial em São Paulo, US$50.000 para o time vencedor.
- Prize/stat figures not final: ship with `[CONFIRMAR]` placeholders where
  Kuka's doc conflicts; copy editable in code (single campaign file).

## Routing

- `/` → new campaign LP (public).
- `/h` → new index route rendering the current home page (edições hub)
  unchanged in content. `/h/[slug]` untouched. `isPublicRoute` gains `/h`.
- `/pre-registro` → stepper (public route; renders auth inline when logged
  out, so it must NOT be middleware-gated — add to public routes).
- Header logo keeps pointing to `/`. Footer "Edições" already points to
  `/#edicoes` → update to `/h#edicoes`.

## Migration 00054

- `alter table users add column whatsapp text` (+ nothing else on users).
- Seed `hackathons` row: slug `colosseum-2026`, name `Colosseum Global
  Hackathon 2026`, status `draft`, external edition semantics (external_url
  null until Colosseum opens; set later via admin). Dates: use placeholder
  window (starts_at now, submission_deadline_at far future) — nothing reads
  them while draft.
- No RLS changes: the pre-register server action writes with the service
  role after `requireUser()`.

## `/pre-registro` stepper

One client component with three visual steps; the server page resolves which
step the visitor is on:

1. **Conta** (logged out): embedded `AuthForm` with `postLoginPath=/pre-registro`.
2. **Perfil** (logged in, not yet pre-registered): nome completo (prefilled),
   WhatsApp (required, placeholder `+55 (11) 91234-5678`, free-text sanitized),
   aceite: "Li e aceito os Termos de Uso e a Política de Privacidade" (links).
   Submit → server action `preRegister`: updates `users.full_name`/`whatsapp`,
   upserts the `hackathon_registrations` row (terms_accepted_at = now) for the
   colosseum edition, tracks `registration_completed` (existing event).
3. **Jornada** (pre-registered): checklist in a sticker card —
   ✅ Pré-cadastro feito · → Entrar na comunidade (WhatsApp button) ·
   → Lets Build (link + "US$50 mil para o vencedor, imersão em SP") ·
   → Colosseum ("inscrições abrem em breve — te avisamos por e-mail/WhatsApp";
   becomes a live link when the edition's external_url is set).
   Plus "Conheça os hackathons da Superteam" → `/h`.

The whatsapp field also appears on `/account` (profile form + updateProfile
action) so people can fix it later.

## Campaign LP (`/`) sections

All copy inline in the page component (consts at the top, like the current
home's STEPS) — single campaign, no CMS, no extra file.

1. **Hero** (dark green-dark band): badge "Pré-cadastro aberto" · headline
   "A maior competição de startups do mundo está chegando." · sub: construa
   na Solana, compita com o planeta, `[CONFIRMAR: R$5 milhões]` em prêmios +
   capital semente · CTA "Fazer pré-cadastro" → `/pre-registro` · stat chips:
   `[CONFIRMAR]` prêmios · 80K+ participantes globais · "Na última edição,
   times brasileiros captaram mais de R$10 milhões".
2. **Ticker** (existing infinite ticker component): Solana/Colosseum stats.
3. **O hackathon global**: todo ano a Solana faz um hackathon global 100%
   remoto; prêmios + investimento anjo; cases em sticker cards — Cloak
   (captou R$1,5M) e Bido (última edição, captou R$10M).
4. **A Jornada** (mirrors the stepper): 1 pré-cadastro → 2 comunidade →
   3 Lets Build (incubação presencial em SP + US$50K) → 4 Colosseum (em
   breve). CTA repeats.
5. **Side tracks**: Brasil track e Lets Build, two sticker cards.
6. **Footer**: existing Footer + a distinct band/button "Conheça os
   hackathons da Superteam Brasil" → `/h`.

## Analytics

- No new events. The pre-register action fires the EXISTING
  `registration_completed` with `edition: 'colosseum-2026'` — the campaign is
  an edition, so funnels segment it with the property already captured.

## Out of scope (v1)

- Colosseum edition public page, admin UI for campaign copy, WhatsApp
  message automation, email followup sequences, FAQ section.

## Testing

- Unit: whatsapp sanitizer (if any normalization), routes test additions
  (`/`, `/h`, `/pre-registro` public).
- Build + browser walk of the stepper (OTP path) on dev before PR.

## Simplicity constraints (binding)

- Reuse only: AuthForm, Card, Button, Footer, ticker, existing sanitizers.
  No new UI primitives, no new lib modules unless a sanitizer genuinely
  needs one, no config/CMS layers.
- The `/h` index is the current home page file moved, not rewritten.
- Target diff: one migration, two page routes, one server action, small
  edits (routes allowlist, footer link, account form). Anything beyond that
  needs a reason.
