"use client";

import { useLayoutEffect } from "react";

// Loading fallbacks are server-rendered as streamed HTML, and useLayoutEffect
// warns during SSR. The no-op server branch keeps the pre-paint timing on the
// client without the console noise.
const useClientLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect;

/**
 * Mounted inside the shared loading fallback: whenever a boundary shows, the
 * viewport snaps to the absolute top. Lives in the fallback on purpose —
 * back/forward traversals restore from cache without rendering a fallback,
 * so browser scroll restoration is never touched.
 */
export function ScrollReset() {
  useClientLayoutEffect(() => {
    // "instant" overrides the global scroll-behavior: smooth — a loading
    // screen snaps to the top, it doesn't animate its way there.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);
  return null;
}
