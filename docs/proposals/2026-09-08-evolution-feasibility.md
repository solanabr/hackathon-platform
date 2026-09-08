# Evolution hosting, API and messaging feasibility

Assessment date: September 8, 2026. Public documentation and repository configuration were inspected. No authenticated Evolution tenant, Meta business portfolio, infrastructure console or subscriber billing page has been inspected. “Available in the product” is different from “enabled on this account.”

## Recommended infrastructure

Use the **managed EvoCRM service already purchased**, subject to confirming API entitlement and channel allowance. Integrate the Next.js application with its server-side API. The official channel guide supports direct WhatsApp Cloud API onboarding; installing a separate Evolution API is not a prerequisite for that path. [WhatsApp channel guide](https://docs.evolutionfoundation.com.br/user-guides/channels/whatsapp-setup)

| Meaning of “their infrastructure” | Evidence | Feasibility |
| --- | --- | --- |
| Evolution's hosted service | Public CRM REST endpoint, hosted plans and channel onboarding | Best short-sprint candidate. Configure the tenant rather than assume SSH or Docker access is included |
| Superteam's current app deployment | Repository targets Next.js on Vercel; Supabase supplies managed data/auth | Suitable for short HTTP handlers, application data and provider integration; the checkout provides no persistent Evolution host |
| A separate Superteam VPS/container platform | No host, deployment manifest, capacity or operator access supplied | Possible if Kuka has one; verify before planning an installation |

A self-hosted Evolution deployment needs persistent service operation and storage, plus its configured database and cache. The official Docker guide describes PostgreSQL/Redis and instance persistence. The current app's request-bound Vercel Functions and Supabase Edge Functions do not establish such a deployment. Do not put a permanent WhatsApp session into a Next.js request handler. This is an architectural assessment of the checked-in deployment, not a claim that every current or future Vercel product lacks container capabilities. [Evolution Docker guide](https://docs.evolutionfoundation.com.br/en/evolution-api/install/docker), [Vercel function limits](https://vercel.com/docs/functions/limitations), [Supabase function limits](https://supabase.com/docs/guides/functions/limits)

If self-hosting becomes necessary, provision an isolated service with a pinned supported release, PostgreSQL database/role separate from participant data, Redis, persistent volumes, HTTPS, server-held credentials, backup/restore, health monitoring and an operational owner. Size it after confirming provider mode and load. Do not run upstream migrations against the existing application schema. No installation, server purchase or production mutation was performed in this assessment.

### Community CRM alternative, inspected later on September 8

The supplied [EvoCRM Community v1.1.0 release](https://github.com/evolution-foundation/evo-crm-community/releases/tag/v1.1.0) is the complete self-hosted CRM, distinct from the Evolution API messaging gateway. Its umbrella repository was cloned separately at `3c19c2d`; submodules were not initialized. The release publishes `1.1.0` container images. The Community README describes a single-account installation without the SaaS plan limits; that does not remove WhatsApp provider conditions or establish portability of a paid subscription. [Repository](https://github.com/evolution-foundation/evo-crm-community)

The checked-in development Compose resolves 14 services, including PostgreSQL/pgvector, Redis, RabbitMQ, ClickHouse, development email, application services and background workers. Configuration parsing passed; no containers ran because the local Docker daemon was unavailable. Several services build from submodules, while some image references remain `latest`; the Swarm example also uses `latest`. A reproducible deployment must pin compatible images and adapt development commands/volumes, not merely check out the tag. [Versioned Compose](https://github.com/evolution-foundation/evo-crm-community/blob/v1.1.0/docker-compose.yml)

This makes self-hosting a feasible fallback, subject to a separate operational evaluation. It does not prove the hosted product's reported access problem will disappear in Community. Keep campaign delivery independent of hosted account provisioning, and promote a self-hosted CRM to a live dependency only after login, inbox, agent, provider callbacks and recovery are demonstrated.

## Purchased plan versus send readiness

Felix reports purchasing Essential for R$297/month. On September 8, the public Essential offer advertises **10,000 campaign sends/month, one connected channel, five automations/journeys and 300 Darwin credits/month**. It also advertises bringing one's own AI provider key. These are commercial allowances, not proof of this tenant's activation, remaining balance or WhatsApp delivery capability. [Public plan](https://evolutionfoundation.com.br/)

The single-channel allowance matters: confirm whether website/API inboxes consume that slot in addition to WhatsApp. A separate public website assistant with a direct WhatsApp handoff may fit; two CRM channels may need a different allowance. Do not assume Darwin copilot credits are interchangeable with participant chatbot inference or that Meta template charges are included.

| Check | Evidence needed | Current status |
| --- | --- | --- |
| Subscription activation | Tenant subscription shows Essential active, billing cycle and remaining campaign allowance | Unverified |
| API entitlement | Account can create a scoped token and successfully list its inboxes | Public API documented; account unverified |
| Connected channel | Inbox provider, connection status and correct business number | Unverified |
| Meta send capacity | Current WhatsApp Manager messaging-limit/account-quality screen for the relevant business portfolio/number | Unverified; plan size is not this limit |
| Approved templates | Correct language, category, active approval and required parameters | Unverified |
| Billing for message usage | Payment/credit status and confirmation of who bills applicable Meta charges | Unverified |
| Recipient eligibility | Opt-in purpose/source and opt-out suppression for the intended list | No list inspected |
| Delivery readiness | Controlled test requested by owner, provider receipt/status and inbound reply | Not attempted |

WhatsApp requires opt-in and respect for opt-out, and business-initiated communication uses approved templates; free-form replies are permitted within the customer-service window described in its policy. Installing another gateway does not grant more sending permission. A QR code alone does not identify the provider mode: the official coexistence onboarding can also involve a QR step. [WhatsApp messaging policy](https://whatsappbusiness.com/policy/), [Evolution onboarding](https://docs.evolutionfoundation.com.br/user-guides/channels/whatsapp-setup)

Meta's current messaging-limit documentation could not be retrieved in this session (HTTP 429), so no exact tier threshold is asserted here. Read the actual current limit in WhatsApp Manager. Monthly campaign allowance, rolling-window recipient limits, throughput and per-recipient restrictions are different measures. The plan does not establish that 10,000 recipients can be contacted in one day. Applicable WhatsApp pricing also depends on message category and destination. [Official pricing](https://business.whatsapp.com/products/platform-pricing)

**Conclusion:** the advertised 10,000/month allowance is confirmed publicly; this account's permission and readiness to use it remain unverified. No campaign was sent and no contacts were imported.

## Confirmed EvoCRM API surface

The documented base is `https://api.evoai.app`, with the `api_access_token` request header. Keep it on the server. The documented paths below do **not** include an assumed Chatwoot `/accounts/{id}` segment and must not be replaced with Evolution API instance endpoints.

| Operation | Documented method/path | Notes |
| --- | --- | --- |
| List inboxes | `GET /api/v1/inboxes` | `success`, `data` array, `meta`, `message`; useful initial read-only access check |
| Inbox details | `GET /api/v1/inboxes/{id}` | Inspect provider and channel details; redact configuration secrets from logs |
| Create contact | `POST /api/v1/contacts` | Documented fields include `identifier`, `phone_number`, `inbox_id`, `source_id`; send only necessary fields |
| Create conversation | `POST /api/v1/conversations` | Requires `source_id`; public request body is documented as `any`, so tenant schema validation is still required |
| Create message | `POST /api/v1/conversations/{conversation_id}/messages` | Supports message content/type; successful creation is not delivery confirmation |

Sources: [List inboxes](https://docs.evolutionfoundation.com.br/evo-ai-crm/list-all-inboxes), [Inbox details](https://docs.evolutionfoundation.com.br/evo-ai-crm/get-an-inbox), [Create contact](https://docs.evolutionfoundation.com.br/evo-ai-crm/create-contact), [Create conversation](https://docs.evolutionfoundation.com.br/evo-ai-crm/create-new-conversation), [Create message](https://docs.evolutionfoundation.com.br/evo-ai-crm/create-message).

Do not infer bulk-send entitlement, webhook signature format, chat streaming support or monthly balance from the inbox endpoint. Confirm webhook authentication/retries, conversation request schema, delivery events, template dispatch and plan balance in the tenant/version documentation before automating them.

## Proposed first automations

Use the five advertised journey slots only after confirming their actual counting rules: opted-in welcome; incomplete qualification reminder; official-registration reminder explicitly based on self-report; approved event/deadline reminder; human handoff follow-up. Do not automatically enroll existing registrations whose contact permission is unknown. Suppress on opt-out, completed milestone or operator takeover, as appropriate.

For a first preview, demonstrate journeys with synthetic records and a disabled send action. For live work, persist an idempotency key per contact/edition/journey/step, use a durable queue, record provider message IDs, retry only eligible failures with backoff, and pause when the provider rejects or quality/account status changes. Keep pending, accepted, sent, delivered, read and failed separate. Credentials, billing confirmation and owner-approved recipients/content are dependencies for live sending, not for preparing the integration.
