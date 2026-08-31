import posthog from "posthog-js";

/** Client-side capture; a no-op before init or without analytics consent. */
export function trackClient(event: string, properties?: Record<string, unknown>): void {
  try {
    if (posthog.__loaded) posthog.capture(event, properties);
  } catch {
    // Analytics must never break the UI.
  }
}
