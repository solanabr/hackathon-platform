import { PostHog } from "posthog-node";

/**
 * Server-side capture for the few events the browser can't see reliably.
 * flushAt 1 / flushInterval 0 because on serverless anything left in the
 * batch queue is lost when the instance freezes — callers use
 * `captureImmediate` and pass the Supabase user id as `distinctId`, the same
 * id the client identifies with, so both sides land on one person.
 */
export function createPostHogServer(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  return new PostHog(key, {
    host: "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });
}
