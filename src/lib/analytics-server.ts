import { after } from "next/server";
import { createPostHogServer } from "./posthog-server";

/**
 * State-transition events that mirror what the DB already records about the
 * user's own account — operational, not behavioral tracking (the cookie
 * banner governs browser capture; see docs on the tracking plan). Runs in
 * after() so it never adds latency or failure modes to the action itself.
 */
export function track(
  distinctId: string,
  event: string,
  properties: Record<string, unknown>,
): void {
  after(async () => {
    const ph = createPostHogServer();
    if (!ph) return;
    try {
      await ph.captureImmediate({ distinctId, event, properties });
    } catch (err) {
      console.error(`posthog ${event} failed:`, err);
    }
  });
}
