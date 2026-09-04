import { sanitizeRedirect } from "./security";

/**
 * Short-lived cookie mirroring the `next` query param on the OAuth/OTP
 * redirect. Supabase drops a `redirectTo` its allowlist rejects and sends the
 * user to the Site URL instead — the cookie lets the callback still recover
 * the page the user came from.
 */
export const AUTH_NEXT_COOKIE = "stbr-auth-next";
export const AUTH_NEXT_MAX_AGE = 60 * 10;
export const DEFAULT_AUTH_NEXT = "/h";

const NEVER_A_DESTINATION = [/^\/auth(\/|\?|$)/, /^\/api(\/|\?|$)/];

/**
 * First candidate that is a same-origin relative path and is not the auth
 * flow itself; null when none qualifies.
 */
export function pickAuthNext(...candidates: Array<string | null | undefined>): string | null {
  for (const raw of candidates) {
    const path = sanitizeRedirect(raw ?? null);
    if (!path) continue;
    if (NEVER_A_DESTINATION.some((re) => re.test(path))) continue;
    return path;
  }
  return null;
}

export function authNextOrDefault(...candidates: Array<string | null | undefined>): string {
  return pickAuthNext(...candidates) ?? DEFAULT_AUTH_NEXT;
}
