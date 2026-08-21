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
