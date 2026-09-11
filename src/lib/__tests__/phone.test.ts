import { describe, it, expect } from "vitest";
import { normalizeWhatsapp } from "../phone";

describe("normalizeWhatsapp", () => {
  it("returns null for empty input", () => {
    expect(normalizeWhatsapp("")).toBeNull();
    expect(normalizeWhatsapp("   ")).toBeNull();
    expect(normalizeWhatsapp(null)).toBeNull();
    expect(normalizeWhatsapp("abc")).toBeNull();
  });

  it("prefixes +55 to a bare Brazilian number with DDD", () => {
    expect(normalizeWhatsapp("(11) 91234-5678")).toBe("+5511912345678");
    expect(normalizeWhatsapp("11 3123 4567")).toBe("+551131234567");
  });

  it("keeps a leading + and strips everything else", () => {
    expect(normalizeWhatsapp("+55 (11) 91234-5678")).toBe("+5511912345678");
    expect(normalizeWhatsapp("+1 415-555-0100")).toBe("+14155550100");
  });

  it("gives an unprefixed country code the same shape as a prefixed one", () => {
    expect(normalizeWhatsapp("55 11 91234-5678")).toBe("+5511912345678");
    expect(normalizeWhatsapp("55 11 91234-5678")).toBe(normalizeWhatsapp("+55 11 91234-5678"));
    expect(normalizeWhatsapp("351 912 345 678")).toBe("+351912345678");
  });
});
