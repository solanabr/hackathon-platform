# Campaign assistant and human handoff design

**Superseded provider decision:** the user selected an independent OpenRouter website assistant. Use [the current OpenRouter/RAG design](2026-09-08-openrouter-assistant-design.md). The widget/provider options below are retained as historical assessment, not the implementation choice.

Status: implementation proposal, September 8, 2026. Owner: Felix; visual integration: Laura (`laura`). This design is reviewable without provider credentials. Live assistant operation and WhatsApp account readiness have not been verified.

## Product behavior

Help a visitor understand the event, decide whether the Brazilian support track is relevant, complete local registration and find the official event entry. Start with a curated, dated public fact sheet. Answer briefly in pt-BR with source links. Never promise a prize, accelerator acceptance, a guaranteed slot or verified external registration.

Mount a floating launcher and a section before the footer **on the campaign landing route `/` initially**. Both open the same conversation state. Laura owns layout, typography, color, spacing, animations, responsive position, accessible focus and the final CTA. Felix owns the conversation controller, source data, server adapter, error states and measurement. Preserve the existing four-stage registration and optional qualification flow.

Suggested participant copy:

- Launcher: “Dúvidas sobre o hackathon?”
- Footer title: “Qual é o seu próximo passo?”
- Introduction: “Sou o assistente da campanha da Superteam Brasil. Posso explicar o evento e ajudar você a encontrar o próximo passo.”
- Starters: “Preciso saber programar?”, “Já tenho uma ideia. E agora?”, “O cadastro aqui já me inscreve no evento?”
- Unconfirmed answer: “Ainda não tenho essa informação confirmada. Consulte a organização para decidir com segurança.”
- Human action: “Falar com a equipe no WhatsApp”. Community action separately: “Entrar na comunidade”.

Do not auto-open the chat, play sound or cover the cookie banner/mobile registration CTA. Keyboard users can open, close with Escape and return to the launcher; use a labelled dialog only for the modal presentation. Announce completed replies without re-announcing every token. Footer and floating entry preserve messages when switching surfaces. If unavailable, show the approved FAQ and human contact option with a clear unavailable state.

## Provider decision

The purchased managed EvoCRM is the first integration candidate. It supports a website widget and API channel, but public documentation does not establish full custom inline rendering, shared-state JavaScript methods, webhook verification or streaming. The Essential offer advertises only one channel. Resolve those items before choosing a CRM-backed website chat. [Website widget](https://docs.evolutionfoundation.com.br/user-guides/channels/website-widget-setup), [API channel](https://docs.evolutionfoundation.com.br/user-guides/channels/api-setup), [feasibility assessment](../../proposals/2026-09-08-evolution-feasibility.md)

1. If the tenant supports both required channels and the widget API supports Laura's approved interaction, use one widget instance; footer and floating controls open it. Do not fabricate widget method names.
2. If widget behavior or channel allowance does not fit, use a custom website UI and server LLM adapter; keep the purchased channel for WhatsApp. This preserves design control but needs a separate inference budget and a longer custom implementation.
3. While credentials or interface evidence are missing, implement and demonstrate the UI against clearly labelled synthetic fixtures/curated FAQ. Do not present fixed responses as a working live AI. Do not commit an unusable provider route as “integrated”.

Grok Heavy reviewed the initial audit through the existing local Delegate script using `x-ai/grok-4.20-multi-agent`. It supported prioritizing copy, conversion deduplication and bounded public answers. That advisory run is separate from the production website model. Its suggestion of a widget was conditional; the later API inspection and one-channel limit remain design dependencies.

## Custom adapter contract, if selected

```ts
type AssistantEntry = "floating" | "footer";
type AssistantReply = {
  answer: string;
  sourceIds: string[];
  topic: "event" | "eligibility" | "registration" | "team" | "dates" | "other";
  needsHuman: boolean;
};
type AssistantRequest = {
  message: string;
  // Session binding is server-issued; never accept a CRM contact ID from a visitor.
  sessionToken: string;
};
```

Proposed modules: `src/components/campaign-assistant/assistant-controller.tsx`, `assistant-panel.tsx`, `src/lib/campaign-assistant/knowledge.ts`, `contracts.ts`, `server.ts`, `src/app/api/campaign-assistant/route.ts`. Reuse the controller for both entry points; Laura owns the panel and mount markup. Keep the route limited to campaign questions, not arbitrary upstream API forwarding.

Server behavior: validate a bounded message length (proposed 2,000 characters) and capped session history, bind conversation IDs to a signed session, restrict sources and render text safely. Keep provider keys server-only, validate structured replies, and resolve source IDs to an allowlisted URL map. User text and retrieved documents cannot change system rules. Do not fetch visitor-supplied URLs or execute tool instructions. Timeout, authentication failure, malformed response and exhausted budget return defined fallback states. Do not expose provider bodies or tokens to the browser.

Use a durable rate/budget store appropriate to deployment, not an in-memory Map in a serverless process. Agree numerical limits with the account owner; proposed initial policy is 10 questions per session per 10 minutes plus a global daily cost ceiling. Rate-limit storage failure disables paid generation and returns the FAQ fallback. Retain conversation state in memory for the preview; durable transcript retention requires a separately agreed purpose and deletion policy.

The public knowledge set contains only approved event facts, support scope, public links and FAQ. Do not query participant tables, mentorship booking URLs, team drafts, admin exports or judging data. Do not infer personal registration status from a user message. Authenticated personalized assistance is a later scope requiring explicit authorization and RLS-aware retrieval.

## WhatsApp and operational handoff

First deliver a measured direct WhatsApp link once the owner supplies the correct business number; keep the existing community invite distinct. A click shows intent only. Do not put a transcript or personal details in analytics or a prefilled URL. If carrying chat context to an operator later, let the visitor review and explicitly choose the fields/transcript to share.

For CRM handoff, use only documented server-side inbox/contact/conversation/message APIs. Public conversation request schema is incomplete; obtain a tested tenant example before implementing that mutation. Never use a CRM account token in browser JavaScript. Webhook authentication and event schema must match EvoCRM documentation for the tenant; Evolution API webhook payloads are a different contract.

If automated follow-up is added, use opt-in records, suppression, idempotent jobs and verified delivery callbacks. Do not equate a 200 response with delivery. The purchased 10,000 monthly allowance does not establish current Meta sending permission. Account status and limits must be read before enabling sends. See the feasibility assessment for the evidence checklist.

## Acceptance

- The two entry points share one conversation and work with keyboard/mobile navigation.
- Correctly distinguish local registration, official event entry and self-reported confirmation.
- Source links and facts match the dated brief; unconfirmed prize/deadline questions abstain and escalate.
- Injection asking for keys, private participant data or changing campaign rules does not alter behavior.
- No paid calls without configured provider, active rate controls and budget; no accidental preview production traffic.
- Network timeout, malformed reply, denied/withdrawn consent and blocked storage have usable fallback behavior.
- Analytics contains only approved categorical properties; no transcript or contact data.
- Direct support and community are distinct; live sending is separately verified with provider evidence.
