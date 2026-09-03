export const CONSENT_KEY = "stbr-consent";

export type ConsentValue = "all" | "essential";

export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function parseConsent(value: string | null | undefined): ConsentValue | null {
  return value === "all" || value === "essential" ? value : null;
}

/** Server-side reader: only an explicit "all" unlocks analytics capture. */
export function readConsentCookie(value: string | null | undefined): boolean {
  return parseConsent(value) === "all";
}

/** Browser-side reader; storage blocked counts as no consent. */
export function hasAnalyticsConsent(): boolean {
  try {
    return readConsentCookie(localStorage.getItem(CONSENT_KEY));
  } catch {
    return false;
  }
}

export function writeConsentCookie(value: ConsentValue): void {
  try {
    document.cookie = `${CONSENT_KEY}=${value}; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
  } catch {
    // The choice still lives in localStorage; server events just stay off.
  }
}
