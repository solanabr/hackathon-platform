import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

// LGPD: analytics only runs after the cookie banner's "Aceitar". Until then
// PostHog boots opted-out and persists nothing.
function hasAnalyticsConsent(): boolean {
  try {
    return localStorage.getItem("stbr-consent") === "all";
  } catch {
    return false;
  }
}

if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    // First-party path so blocklists don't eat events; rewrites in
    // next.config.ts forward it to the US cloud, where the project lives.
    api_host: "/relay-hx9",
    ui_host: "https://us.posthog.com",
    // Pins the modern default behaviors — history-API pageviews included, so
    // App Router soft navigations are captured with no pageview component.
    defaults: "2026-05-30",
    opt_out_capturing_by_default: !hasAnalyticsConsent(),
    opt_out_persistence_by_default: !hasAnalyticsConsent(),
  });
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  sendDefaultPii: false,
  enableLogs: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
