import { describe, it, expect } from "vitest";
import { sanitizeUrl, sanitizeText, isValidEmail, sanitizeAvatarUrl } from "../security";

describe("sanitizeUrl", () => {
  it("returns null for empty/whitespace", () => {
    expect(sanitizeUrl("")).toBeNull();
    expect(sanitizeUrl("   ")).toBeNull();
    expect(sanitizeUrl(null)).toBeNull();
  });

  it("adds https:// when missing", () => {
    expect(sanitizeUrl("github.com/x")).toBe("https://github.com/x");
  });

  it("rejects javascript:", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
  });

  it("keeps existing scheme if safe", () => {
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com/");
  });
});

describe("sanitizeText", () => {
  it("trims + nullifies empty", () => {
    expect(sanitizeText("  ")).toBeNull();
    expect(sanitizeText("  hi  ")).toBe("hi");
  });

  it("respects maxLength", () => {
    expect(sanitizeText("abcdef", 3)).toBe("abc");
  });
});

describe("isValidEmail", () => {
  it("accepts well-formed emails", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
  });
  it("rejects malformed", () => {
    expect(isValidEmail("noatsign")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
  });
});

describe("sanitizeAvatarUrl", () => {
  it("accepts the two OAuth providers we support", () => {
    expect(sanitizeAvatarUrl("https://avatars.githubusercontent.com/u/1?v=4")).toBeTruthy();
    expect(sanitizeAvatarUrl("https://lh3.googleusercontent.com/a/abc=s96-c")).toBeTruthy();
  });

  it("accepts our own avatars bucket", () => {
    expect(
      sanitizeAvatarUrl("https://x.supabase.co/storage/v1/object/public/avatars/uid/1.png"),
    ).toBeTruthy();
  });

  it("rejects another bucket on our own storage", () => {
    expect(
      sanitizeAvatarUrl("https://x.supabase.co/storage/v1/object/public/hackathon-files/a.pdf"),
    ).toBeNull();
  });

  it("rejects an arbitrary host posted through the hidden field", () => {
    expect(sanitizeAvatarUrl("https://evil.example/pixel.png")).toBeNull();
    expect(sanitizeAvatarUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeAvatarUrl("")).toBeNull();
  });
});
