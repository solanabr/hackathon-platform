/** Reads a CSS timing token for whoever animates in JS.
 *
 * The point is not convenience: JS animation cannot have its own time scale.
 * If the rAF uses a hardcoded 1300ms and the CSS uses var(--dur-lenta), the
 * two layers diverge — and diverge for good under reduced motion, where the
 * token shrinks and the hardcoded number does not. One source. */
export function readMotionSeconds(token: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  if (!raw) return fallback;
  const value = parseFloat(raw);
  if (Number.isNaN(value)) return fallback;
  return raw.endsWith("ms") ? value / 1000 : value;
}
