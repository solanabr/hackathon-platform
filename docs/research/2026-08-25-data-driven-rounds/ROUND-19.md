# Round 19 — The UX/product vision

5 agents. The LP language, the joy moments, the error/empty UX, mobile, the synthesis.

## The LP design system (agent 1)
- Codified tokens (cream surface #f7eacb / raised #fffdf6 / deep #efe0ba / ink #1b231d / muted #5f6f60 / emerald #008c4c / yellow #ffd23f fills-only), type (Archivo width-axis headings, Inter body, mono numerals), shape (morth blobs at FULL saturation as the hero canvas, hard offset shadows as the signature, radius pill/2xl/3xl), accent discipline.
- **Drift found**: `Background.tsx` morths at opacity-[0.07] (the faint-watermark move PR #12 rejected — the hero got full saturation, the global chrome didn't); the judge module violates the accent discipline (`bg-yellow/10 text-yellow` — the exact PR #12 illegibility); the `.text-gradient` utility is dead + would be illegible on cream — delete; no mono font loaded; shadow/radius/mono/stretch untokenized.
- Future pass: the 375px deck fan, countdown segments as branded tiles, full-saturation empty-state morths, the shareable og card, tokenize + unify the eyebrow scale.

## The joy moments (agent 2)
- The moment sequence (current → target → effort): registered (S), on-a-team (S), submitted "está no ar" + og:image + wa.me (S-M), **finalist (the north-star, S — the panel needs NO schema/query, `teams.*` already rides the painel snapshot)**, placed trajectory (M, post-event), hall-of-fame (M, post-event).
- The finalist panel concretely: full-bleed emerald card above the countdown, gated on `isFinalistsVisible && snapshot.team.is_finalist`, "Vocês são finalistas!", the Pitch Day countdown in segments, the Pitch Day card (address — only location_city exists, a gap), what-to-bring (from DELIVERABLES), share.
- **The in-app reveal is one render gate from closing O1.**

## The error + empty UX (agent 3)
- Boundaries absent (zero error/global-error/not-found). Two divergent form-error variants. The submit fetch unguarded (a throw leaves "Submetendo..." forever). Duplicate exact-match RPC maps. **8 silent-error reads** that turn DB failures into lies ("crie seu time", "edição não existe", "Nenhuma edição").
- Design: branded boundaries, one FormError red-box + ErrorCard, try/catch/finally on save/submit, one RPC map (route owns messages, client maps code), the policy — every empty branch is `error ? ErrorCard : empty ? EmptyState : list`, pt-BR with retry.

## Mobile vision (agent 4)
- The 375px contract: no horizontal scroll (min-w-0, admin tables → stacked cards below md), tap targets ≥44px (violators: hero-deck dots 10px, PainelNav pills ~38px), single-column collapse, the hero-deck fan flattened (no translateX below sm).
- The venue flow: painel = home base, content = the agenda, judge on a tablet.
- **No (app)/h/[slug]/layout exists** — add a bottom tab bar (the round-1 nit).
- **PWA verdict: worth it for the 09/12 venue, ship after 09/09** — a static SW caching the shell makes the painel readable at dead spots; no offline writes.

## The UX vision synthesis (agent 5)
- The read: "the thin reliable layer between Luma and WhatsApp," the LP skin, the community's stage and memory.
- The journey felt (signup Luma-honesty → first-login routing → WhatsApp team → autosave build → emerald submit + share → in-app finalist → hall-of-fame podium).
- The five feels: finalist panel, Pitch Day card, WhatsApp-native invites, Luma honesty, operator check-in.
- **The mood**: "The dark-arena cold says 'capital pipeline'; the cream-and-emerald warmth says 'we're all in this room.' The LP direction was right because the moat is community, not funding rails — the skin is the thesis."

## Where round 20 focuses
The ultimate report: the 7 chapters (exec summary, event-critical ops, architecture, M1-M6, risk verdict, community/product vision, known-unknowns → decisions).
