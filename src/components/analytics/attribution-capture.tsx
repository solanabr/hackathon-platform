"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

/** Snapshots the first-touch UTMs/referrer into localStorage on landing.
 * Renders nothing; safe to mount on every page (first touch is kept). */
export function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
