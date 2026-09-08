/**
 * Canonical WhatsApp number for outreach exports: digits only, a leading `+`
 * kept, and a bare Brazilian number (DDD + 8/9 digits) promoted to +55.
 * Anything already carrying a country code is left as the person typed it.
 */
export function normalizeWhatsapp(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (hasPlus) return `+${digits}`;
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  return digits;
}
