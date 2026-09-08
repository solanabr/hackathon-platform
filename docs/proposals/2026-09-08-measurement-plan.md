# Campaign measurement and attribution plan

Status: proposed, September 8, 2026. Source baseline: `fae614a`. Retain the existing PostHog, GTM and Supabase setup; container configuration and live delivery have not been inspected. This plan does not claim changes are deployed.

## Decisions and data contract

Primary business conversion: one completed **local campaign registration per user and edition**, measured from `hackathon_registrations.terms_accepted_at`. Ask Kuka to confirm this definition (questionnaire Q01). Qualification completion is a second milestone. External registration is currently **self-reported**, stored in `luma_confirmed_at`; it is not verified by Colosseum. A link click is neither a registration nor a delivered WhatsApp message.

The database counts all operational registrations. Consented browser analytics describes a subset of visitors. Do not expect identical totals or infer a whole-audience conversion rate by dividing all database leads by consented visitors.

| Milestone | Existing event / source | Proposed additive properties or behavior |
| --- | --- | --- |
| Landing visit | Existing landing/page events in `docs/TRACKING.md` | `edition=colosseum-2026`, `page_path` without query, `environment` |
| Registration CTA | Existing CTA event | Stable `cta_id` and `placement=hero/journey/footer/mobile`; preserve legacy `target` |
| Authentication | Existing auth events | Preserve provider and failure class; never OTP, callback code or email |
| Local registration | Server `registration_completed`; GTM `inscricao_concluida_hackathon` | Emit on first completed transition only; return `newly_completed` to client |
| Qualification save | `interest_form_saved` | Keep `completed` flag; repeated saves are activity, not new leads |
| Official-site departure | Existing external-resource click event | `resource_id=colosseum_registration`; no claim of completed entry |
| External declaration | `colosseum_registration_confirmed` | Emit only null-to-timestamp transition; dashboard label “self-reported” |
| FAQ use | Add `campaign_faq_opened` if absent | `question_id`, `placement`, `edition`; no free text |
| Assistant | Add `assistant_opened`, `assistant_question_sent`, `assistant_answered`, `assistant_failed` | `placement`, fixed `topic_id`, `knowledge_version`, duration bucket / failure class |
| Human contact click | Add `whatsapp_handoff_clicked` | `channel=direct`, `placement`, `edition`; no phone or prefilled text |
| Community click | Existing resource event | `resource_id=whatsapp_community`, separate from direct support |
| CRM outcome, later | Provider delivery + operator resolution | Server operational records first; only sanitized aggregates to analytics |

New event names are proposals, not evidence of existing instrumentation. First inspect GTM triggers and PostHog dashboards before renaming any historic event/property. GTM `pushGtmEvent` currently accepts only a name; extend it with an allowlisted typed property object. Never send forms, chat text, names, emails, phone numbers, access tokens, invitation codes or arbitrary URLs as properties. An operational pseudonymous event key can support deduplication; it is not a license to export identifiable contact records.

## First-touch UTM policy

Current implementation (`src/lib/attribution.ts`) captures `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` and referrer hostname into `stbr-attribution` localStorage for 90 days. It is first-touch across the device, outside the PostHog consent gate, and copied into registration only on the first completion. It does not capture `utm_term`. Outbound platform UTMs are a different purpose.

For the first sprint, retain the stored schema and first-touch behavior. Check capture after soft navigation and OAuth; use route/search-parameter changes as the capture trigger if the mount-only effect loses attribution. Wrap all storage reads/writes so restricted storage never blocks registration. Do not replace the original source with `platform` or an internal navigation tag.

Agree with the campaign owner on purpose, retention and notice before extending attribution. Adding `utm_term` requires a migration, action/type updates and export compatibility; it is optional for paid search and outside the minimum sprint. Last-touch is also a separate feature, not a silent change to existing numbers.

| Parameter | Convention | Example |
| --- | --- | --- |
| `utm_source` | Publisher/platform, lowercase | `instagram`, `google`, `superteam_newsletter`, `partner_slug` |
| `utm_medium` | Channel | `paid_social`, `cpc`, `email`, `community`, `referral` |
| `utm_campaign` | Fixed edition identifier | `colosseum_2026` |
| `utm_content` | Creative / placement ID | `builder_video_a`, `newsletter_hero`, `community_launch` |

Example: `https://hackathon.superteam.com.br/?utm_source=instagram&utm_medium=paid_social&utm_campaign=colosseum_2026&utm_content=builder_video_a`. Partners get distinct IDs without personal names, phone numbers or email addresses in the URL. Keep a campaign link register owned by Felix. The database edition slug remains `colosseum-2026`; UTM campaign naming does not replace it.

## Reliable conversion transitions

1. Preserve validation and user-scoped authorization in `preRegister`.
2. Make first completion a database-atomic operation: conditional update of a row with null `terms_accepted_at`, or insert with conflict handling; handle already completed rows without overwriting original attribution. A read followed by unconditional upsert is insufficient under concurrency.
3. Return `{ ok: true, newly_completed: boolean }` from the action. Client GTM fires only if `newly_completed` is true. Re-saving a profile stays successful without another conversion event.
4. Change self-confirmation to update only `.is("luma_confirmed_at", null)` and select the changed row. A repeated declaration succeeds without another event.
5. Database milestone counts are authoritative even if the analytics network request fails. If reliable event delivery is necessary, add a transactional outbox as a separately estimated task; do not describe a best-effort capture as exactly-once delivery.

If an RPC is chosen for atomic registration, scope it to `auth.uid()`, revoke public/anonymous execution, grant authenticated execution explicitly and test concurrent calls against a disposable Supabase environment. Do not use a service-role client to avoid writing correct authorization.

## Consent and environment controls

- PostHog boots opted out until acceptance; keep replay/heatmaps disabled for this pass. Confirm route URL capture strips auth codes and other sensitive query parameters, including automatic page views.
- GTM currently loads `GTM-TC7KKF57` even with denied Consent Mode. Decide whether the intended policy is no container request before acceptance or Consent Mode with configured tag behavior. Verify the actual container; do not infer it from the banner.
- Use a dedicated preview container/project or keep analytics disabled in preview. Add explicit environment configuration; do not send manual QA events to production by default.
- Provide an accessible “Privacy preferences” entry so consent can be revisited. Persist withdrawal consistently and test the next navigation.

## Acceptance cases

| Case | Expected evidence |
| --- | --- |
| Tagged anonymous visitor, OAuth then contact | Original allowed UTMs reach the local registration; auth codes never appear in analytics |
| Existing first touch, second campaign link within TTL | Original source preserved; new CTA still measurable |
| Expired or malformed attribution | Safe new attribution or empty values; form remains usable |
| Client-side navigation introduces first UTMs | Capture occurs without requiring a full reload |
| Storage blocked, analytics denied, JavaScript network failure | Registration remains possible; no unhandled exception |
| Double-click / concurrent local completion | One completed milestone and original attribution preserved |
| Profile re-save or repeated external declaration | No extra conversion; external timestamp does not keep changing |
| Partial interest then return and completion | Saved answers retained; save activity distinguished from completed qualification |
| Shared device, sign out and another user | No identity carryover in PostHog; attribution follows the explicitly agreed device policy |
| CTA copy changed by Laura | Stable IDs keep the dashboard series intact |
| Assistant and WhatsApp events | Only allowed categorical properties; no transcript/contact fields |
| Consent accept, reject, withdraw; preview domain | Network behavior matches chosen policy and environment |

Report weekly: local completed registrations, qualified registrations, declared external registrations, missing-step counts, top acquisition sources and assistant topics/failures. Segment by edition and time zone (`America/Sao_Paulo`). Report delivery/read statuses only from provider evidence, including failures and pending states.
