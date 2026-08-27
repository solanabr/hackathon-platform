"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

/**
 * Ties the browser's PostHog person to the Supabase user id — never the
 * email. posthog-js only emits $identify when the id actually changes, so
 * mounting on every authenticated render costs nothing.
 */
export function PostHogIdentify({ userId }: { userId: string }) {
  useEffect(() => {
    if (posthog.__loaded) posthog.identify(userId);
  }, [userId]);
  return null;
}
