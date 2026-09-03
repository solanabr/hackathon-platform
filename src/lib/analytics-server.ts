import { after } from "next/server";
import { cookies } from "next/headers";
import { CONSENT_KEY, readConsentCookie } from "./consent";
import { createPostHogServer } from "./posthog-server";

function readConsent(): Promise<boolean> {
  try {
    return cookies()
      .then((store) => readConsentCookie(store.get(CONSENT_KEY)?.value))
      .catch(() => false);
  } catch {
    return Promise.resolve(false);
  }
}

/**
 * State-transition events that mirror what the DB already records about the
 * user's own account (see docs/TRACKING.md). Gated on the same cookie-banner
 * choice as browser capture: the banner mirrors its choice into a cookie so
 * the server can honour it. Runs in after() so it never adds latency or
 * failure modes to the action itself.
 */
export function track(
  distinctId: string,
  event: string,
  properties: Record<string, unknown>,
): void {
  // cookies() must be requested while the request scope is still alive, so
  // the read starts here and only its result is awaited inside after().
  const consented = readConsent();
  after(async () => {
    if (!(await consented)) return;
    const ph = createPostHogServer();
    if (!ph) return;
    try {
      await ph.captureImmediate({ distinctId, event, properties });
    } catch (err) {
      console.error(`posthog ${event} failed:`, err);
    }
  });
}
