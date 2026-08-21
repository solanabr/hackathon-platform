const SAFE_PROTOCOLS = new Set(["http:", "https:"]);

export function sanitizeUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    if (!SAFE_PROTOCOLS.has(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function sanitizeText(input: string | null | undefined, maxLength = 2000): string | null {
  if (!input) return null;
  const trimmed = input.trim().slice(0, maxLength);
  return trimmed || null;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Allow only internal absolute paths. Reject anything that could resolve to a
 * different origin (`https://evil`, `//evil.com`, or protocol-relative URLs).
 */
export function sanitizeRedirect(input: string | null): string | null {
  if (!input) return null;
  if (!input.startsWith("/")) return null;
  if (input.startsWith("//")) return null;
  if (input.startsWith("/\\")) return null;
  return input;
}

/**
 * The avatar URL round-trips through a hidden form field, so it is client
 * input. Accept only what our own bucket serves or what the OAuth provider gave
 * us at signup, never an arbitrary URL.
 */
export function sanitizeAvatarUrl(input: string | null | undefined): string | null {
  const url = sanitizeUrl(input);
  if (!url) return null;
  try {
    const { hostname, pathname } = new URL(url);
    if (hostname === "avatars.githubusercontent.com") return url;
    if (hostname === "lh3.googleusercontent.com") return url;
    if (hostname.endsWith(".supabase.co") && pathname.includes("/avatars/")) return url;
    return null;
  } catch {
    return null;
  }
}
