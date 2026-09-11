/**
 * Canonical WhatsApp number for outreach exports, always `+<digits>`: a bare
 * Brazilian number (DDD + 8/9 digits) is promoted to +55, and anything longer
 * is taken as already carrying its country code, `+` or not.
 */
export function normalizeWhatsapp(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (!hasPlus && (digits.length === 10 || digits.length === 11)) return `+55${digits}`;
  return `+${digits}`;
}
