# Tracking plan

PostHog (product analytics) and Google Tag Manager (campaign measurement) both
sit behind the cookie banner in `src/components/consent/cookie-banner.tsx`.
The choice is stored under `stbr-consent` (`"all"` | `"essential"`) in
localStorage and mirrored into a cookie of the same name (1 year, `SameSite=Lax`,
`Path=/`). `src/lib/consent.ts` owns the key and the readers.

## Consent behaviour

| Surface | Without consent | With `"all"` |
| --- | --- | --- |
| PostHog browser (`src/instrumentation-client.ts`) | Boots opted out, persists nothing, no flags / replay / heatmap calls | `opt_in_capturing()`; autocaptured pageviews plus the client events below |
| PostHog server (`src/lib/analytics-server.ts` `track()`, `src/app/api/submit/route.ts`) | Returns before creating a client — nothing leaves the server | Captures with the Supabase user id as `distinct_id` |
| Google Tag Manager (`src/components/analytics/google-tag-manager.tsx`) | Consent Mode v2 default `denied` | `consent update` to `granted` |
| Sentry | Always on: error reports only, `sendDefaultPii: false` | same |

Logout calls `posthog.reset()` (so the next person on a shared device does not
inherit the profile) and then re-applies the stored consent, because `reset()`
also clears PostHog's own opt-in record.

Server events use `distinct_id = auth.users.id`, the same id the browser sends
in `posthog.identify()` (`src/components/analytics/posthog-identify.tsx`), so
both sides land on one person.

## Conventions

- `edition` is the hackathon slug and is present on every event about an
  edition, client or server. Never send the uuid.
- `team_id` is the team uuid.
- Event names are stable — dashboards depend on them. Add properties, do not
  rename.
- Client events fire through `trackClient()` (`src/lib/analytics-browser.ts`),
  server events through `track()`. Both are no-ops without consent.

## Events

| Event | Side | Properties | Fires from |
| --- | --- | --- | --- |
| `cta_clicked` | client | `cta` (`"cadastro"`), `location` (`hero`, `jornada`, `jornada_colosseum`, `sticky`) | `TrackedCta` on the campaign LP and `MobileCtaBar` |
| `campaign_link_clicked` | client | `target`, `location` (`lp`, `recursos`, `faq`, `pre_registro`, `dashboard`), `edition` on the dashboard panel | `TrackedCta` on the LP, `TrackedLink` on `/pre-registro`, `ExternalSubmissionPanel` |
| `auth_provider_clicked` | client | `provider` (`google`, `github`, `email`, …) | `AuthForm`, on any sign-in attempt |
| `auth_failed` | client | `provider`, `reason` (`oauth_request_failed`, `otp_request_failed`, `otp_verify_failed`, or the callback error) | `AuthForm` |
| `auth_code_verified` | client | `provider: "email"` | `AuthForm`, after a valid OTP |
| `registration_form_viewed` | client | — | `PreRegForm` mount on `/pre-registro` |
| `registration_form_error` | client | `field` | `PreRegForm`, on a rejected submit |
| `registration_completed` | server | `edition`, `role` (pre-registro only) | `preRegister` and `registerForHackathon`; only the first time the registration becomes complete for that edition, never on a re-save |
| `colosseum_registration_confirmed` | server | `edition` | `confirmColosseumRegistration`, self-attestation on `/pre-registro` |
| `team_created` | client | `edition` | `NewTeamForm`, after `create_team_with_leader` succeeds |
| `member_invited` | server | `edition`, `team_id`, `via` (`email`, `board`), `has_account` | `addMemberToTeam` (team page form and team-up board invite) |
| `invite_accepted` | client | `edition`, `team_id` | `PendingInviteActions` on the team page |
| `invite_declined` | client | `edition`, `team_id` | `PendingInviteActions` on the team page |
| `opening_saved` | server | `edition`, `team_id`, `active`, `roles_count` | `saveOpening` (recruiting card) |
| `seeker_post_saved` | server | `edition`, `active`, `roles_count` | `saveSeekerPost` (team-up board) |
| `application_sent` | server | `edition`, `team_id`, `has_message` | `applyToTeam` (team-up board) |
| `application_responded` | server | `edition`, `team_id`, `accepted` | `respondToApplication` (applications card) |
| `role_filter_used` | client | `roles` | Team-up board filter chips |
| `team_submitted` | server | `edition`, `team_id` | `POST /api/submit`, after `submit_team` succeeds |

Pageviews (including App Router soft navigations) are autocaptured by
PostHog under the `2026-05-30` defaults; there is no pageview component.
