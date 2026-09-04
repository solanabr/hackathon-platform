import { describe, expect, it } from "vitest";
import { CONSENT_KEY, parseConsent, readConsentCookie } from "@/lib/consent";

describe("consent", () => {
  it("keeps the cookie and localStorage key in sync with the banner", () => {
    expect(CONSENT_KEY).toBe("stbr-consent");
  });

  it("parses only the two banner values", () => {
    expect(parseConsent("all")).toBe("all");
    expect(parseConsent("essential")).toBe("essential");
    expect(parseConsent("granted")).toBeNull();
    expect(parseConsent("")).toBeNull();
    expect(parseConsent(undefined)).toBeNull();
    expect(parseConsent(null)).toBeNull();
  });

  it("only unlocks analytics on an explicit accept", () => {
    expect(readConsentCookie("all")).toBe(true);
    expect(readConsentCookie("essential")).toBe(false);
    expect(readConsentCookie("ALL")).toBe(false);
    expect(readConsentCookie(undefined)).toBe(false);
  });
});
