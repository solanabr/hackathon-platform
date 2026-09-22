# Colosseum Copilot page: design

A public page at `/guias/copilot` that teaches Brazilian participants how to use Colosseum Copilot in their coding agent, and lets them taste its data on our site first: type an idea, see the closest past projects and how crowded the space is, then carry the idea into Claude Code / Codex with a pre-filled prompt. Decided with the owner on 2026-09-22.

## What Copilot is, as far as this design cares

- A REST API at `https://copilot.colosseum.com/api/v1` (the docs' `/colosseum_copilot/` prefix is wrong; the real paths are `/status`, `/filters`, `/search/projects`, `/search/archives`, `/projects/by-slug/:slug`, `/clusters/:key`, `/archives/:id`).
- Bearer auth with a personal access token generated in the Colosseum Arena, 90-day expiry, scope `colosseum_copilot:read`. Limits are per token: 30 searches/min, 2 requests in flight, `429` with `Retry-After`.
- No LLM in the API. The "vet my idea" experience is the skill (`npx skills add ColosseumOrg/colosseum-copilot`) driving the API from inside the user's agent. Query content is never stored by Colosseum.
- Measured 2026-09-22: project search ≈1.5 s, archive search ≈0.6 s, filters catalog small and static (5 hackathons, 59 tracks, 30 clusters, 66 sources).

## Decisions

- **One page, three parts, in this order:** idea box, browse, guide. The idea box is the hero because it is the thing nobody else offers in pt-BR.
- **Shared partner token on the server.** The STBR Colosseum account (roles `PARTNER`, `EXTERNAL_JUDGE`) generates the token; it lives in `COLOSSEUM_COPILOT_PAT` on Vercel and nowhere else. `COLOSSEUM_COPILOT_API_BASE` optional, defaults to the production base.
- **No LLM on our side.** Validation is rendered from what the API returns: similarity, cluster crowdedness, tags, evidence, winners. The deep assessment is handed off to the user's agent with a pre-filled prompt.
- **Bring-your-own-token is out of scope for this phase.** The guide shows how to get a token for the agent setup; the site never asks for it.
- **Access:** the guide and filter browsing are public; the free-text idea search needs a signed-in account (any account, not a completed edition registration). This keeps anonymous traffic from draining the shared quota.
- **Footer link** "Guia: Colosseum Copilot" under Superteam, next to the Earn-to-Pix guide.
- **Parallel, outside this spec:** ask Colosseum whether a partner token serving our members through our app is within their terms, and whether the limit can go up.

## Page: `/guias/copilot`

Route group `(public)`, same shell as `/guias/do-earn-ao-pix`. Public route added to `isPublicRoute`. `dynamic = "force-dynamic"` is not needed: the page is static except the client island.

**Section 1, "Valide sua ideia".** A textarea (max 300 chars), a submit button, and, signed out, the login dialog via the existing `TrackedCta` `/auth?next=/guias/copilot` path. On submit a client component calls a route handler and renders:

- *Projetos parecidos*: up to 6 cards, each with name, one-liner, hackathon and year, tracks, winner/accelerator badge, two evidence lines, links (GitHub, demo, Colosseum page). Sorted by the API's similarity.
- *Quão disputado*: one line from the top result's cluster, e.g. "325 projetos já construíram nessa área (Solana AI Agent Infrastructure), 12 venceram prêmios". Numbers come from `crowdedness` and the cluster detail.
- *Leituras*: 3 archive documents, title, source, author, date, snippet, link.
- *Leve para o seu agente*: a pre-filled prompt in pt-BR that embeds the idea ("Quero construir <ideia>. Alguém já fez isso nos hackathons do Colosseum? Como está o cenário competitivo e onde há espaço?") with a copy button, and a jump link to the guide below.

Errors are copy, not dead ends: daily cap reached → the handoff message above with a jump to the guide; rate-limited upstream → "Muita gente pesquisando agora, tente em N segundos" using `Retry-After`; upstream down → "O Copilot está fora do ar, tente mais tarde"; not signed in → the login dialog.

**Section 2, "Explore o que já foi construído".** Filter chips for hackathon, track (of the chosen hackathon), cluster and "só vencedores"; a results grid of the same cards; "Carregar mais" with `offset`. Works signed out. The filter catalog is rendered server-side from the cached `/filters`.

**Section 3, "Use no seu agente".** The guide, static markdown-like JSX in pt-BR, same components as the Pix guide (`copy-code.tsx` for commands):

1. Crie sua conta no Colosseum e gere o token em colosseum.com/arena/copilot (mostrado uma vez, vale 90 dias).
2. Exporte as duas variáveis no terminal.
3. Instale a skill: Claude Code / Codex / OpenClaw tabs with the three commands.
4. Verifique com o `curl` de status.
5. Cinco prompts em português ligados ao hackathon (pagamentos para agentes, stablecoins B2B, privacidade, consumer, DePIN), each with a copy button.
6. O que o Copilot faz e não faz: pesquisa, sem julgamento; o julgamento é do seu agente e seu.

## Server: `src/lib/copilot.ts`

One module, the only place that knows the upstream.

- `copilotFetch(path, init)`: adds the bearer header, 10 s timeout, parses the error envelope `{ error, code, retryable }`, maps `429` to a `CopilotRateLimited` error carrying `retryAfterSeconds`, everything else to `CopilotUnavailable`. Never throws raw fetch errors up.
- `getFilters()`: `unstable_cache`, tag `copilot:filters`, revalidate 24 h.
- `getCluster(key)`, `getProject(slug)`: `unstable_cache`, 24 h, keyed by argument.
- `searchProjects(input)`, `searchArchives(input)`: `unstable_cache` keyed by a normalized JSON of the input (trimmed, lowercased query, sorted filter arrays), revalidate 1 h. Errors are thrown, not cached, matching the pattern in `src/lib/hackathon.ts`.
- **Concurrency:** a module-level semaphore of 2 with a FIFO queue and a 15 s wait cap. Vercel runs several instances, so this is best effort per instance; the real guard is the cache plus honoring `Retry-After` when the upstream says no. That is stated in a comment in the module because it is the one thing a future reader will assume is stronger than it is.
- Pure helpers, unit-tested: `cacheKeyFor(input)`, `crowdednessLine(cluster, topResult)`, `agentPrompt(idea)`, `mapProject(apiResult) → Card` (drops fields the UI does not use so the payload to the client stays small).

## Route handler: `src/app/api/copilot/search/route.ts`

`POST` with `{ idea }` or `{ filters, offset }`. Idea searches require a session (`resolveAuthenticatedUserState`), filter searches do not. Idea searches are also capped per user at 20 per day, counted in a new table `copilot_queries (user_id, kind, created_at)` written through the service role; over the cap returns `429` with a pt-BR message that hands off instead of blocking: "Você usou as 20 pesquisas de hoje por aqui. Para continuar sem limite, gere seu próprio token no Colosseum e use o Copilot no seu agente", with a button that scrolls to the guide section. The cap is a nudge toward the real tool, not a wall. The table doubles as usage telemetry (which ideas people search is not stored, only that they searched). RLS enabled, no policies, service role only, like `submission_ratings`. Migration `00065_copilot_queries.sql`, applied through the Supabase MCP.

Responses are the mapped cards, never the raw upstream JSON.

## Analytics

`copilot_idea_searched` (signed in, no query text), `copilot_browse_filtered` (filter keys only), `copilot_prompt_copied`, `copilot_install_copied` with the agent name. Through the existing `trackClient` helper and consent gate.

## Testing

- Unit: the four pure helpers, the semaphore (2 in flight, FIFO, timeout), the 429 mapping with `Retry-After`.
- Manual before merge: idea search signed out (dialog), signed in (cards), a filter browse signed out, the cap message after 20 idea searches on a test account, and the three copy buttons.
- No DB integration test, consistent with the repo.

## Out of scope

Bring-your-own-token, saved searches, project detail pages on our site (cards link to Colosseum), any Claude call, admin views of `copilot_queries`.
