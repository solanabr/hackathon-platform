"use client";

import { useSyncExternalStore } from "react";
import { ATTRIBUTION_KEY, readStoredAttribution, UTM_FIELDS } from "@/lib/attribution";

const subscribe = () => () => {};
const readRaw = () => {
  try {
    return localStorage.getItem(ATTRIBUTION_KEY);
  } catch {
    return null;
  }
};

/** Hidden inputs carrying the first-touch snapshot into a registration form.
 * The server renders none; the client fills them in after hydration. */
export function AttributionFields() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const attribution = readStoredAttribution(raw, new Date());
  if (!attribution) return null;
  return (
    <>
      {[...UTM_FIELDS, "referrer" as const].map((field) =>
        attribution[field] ? (
          <input key={field} type="hidden" name={field} value={attribution[field]} />
        ) : null,
      )}
    </>
  );
}
