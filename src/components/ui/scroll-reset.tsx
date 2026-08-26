"use client";

import { useLayoutEffect } from "react";

/**
 * Mounted inside the shared loading fallback: whenever a boundary shows, the
 * viewport snaps to the absolute top. Lives in the fallback on purpose —
 * back/forward traversals restore from cache without rendering a fallback,
 * so browser scroll restoration is never touched.
 */
export function ScrollReset() {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return null;
}
