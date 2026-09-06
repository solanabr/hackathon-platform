import { describe, it, expect } from "vitest";
import { authNextOrDefault, isOtpRateLimited, pickAuthNext } from "../auth-next";

describe("pickAuthNext", () => {
  it("keeps a same-origin path, query included", () => {
    expect(pickAuthNext("/pre-registro")).toBe("/pre-registro");
    expect(pickAuthNext("/h/foo/register?ref=x")).toBe("/h/foo/register?ref=x");
  });

  it("takes the first usable candidate", () => {
    expect(pickAuthNext(null, undefined, "", "https://evil.com", "/h/foo")).toBe("/h/foo");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(pickAuthNext("https://evil.com/pre-registro")).toBeNull();
    expect(pickAuthNext("//evil.com")).toBeNull();
    expect(pickAuthNext("/\\evil.com")).toBeNull();
    expect(pickAuthNext("javascript:alert(1)")).toBeNull();
    expect(pickAuthNext("pre-registro")).toBeNull();
  });

  it("rejects control characters a URL parser would strip", () => {
    expect(pickAuthNext("/\t/evil.com")).toBeNull();
    expect(pickAuthNext("/\n/evil.com")).toBeNull();
  });

  it("never loops back into the auth flow or an API route", () => {
    expect(pickAuthNext("/auth")).toBeNull();
    expect(pickAuthNext("/auth/callback?code=1")).toBeNull();
    expect(pickAuthNext("/auth?next=/h")).toBeNull();
    expect(pickAuthNext("/api/auth/signout")).toBeNull();
    expect(pickAuthNext("/authors")).toBe("/authors");
  });

  it("never resolves off-origin for anything it accepts", () => {
    const probes = ["/a", "/h/x/register", "/\t/evil.com", "//evil.com", "/\n//evil.com", "/%2F%2Fevil.com"];
    for (const probe of probes) {
      const out = pickAuthNext(probe);
      if (out === null) continue;
      expect(new URL(out, "https://hackathon.superteam.com.br").origin).toBe(
        "https://hackathon.superteam.com.br",
      );
    }
  });
});

describe("authNextOrDefault", () => {
  it("falls back to the hub", () => {
    expect(authNextOrDefault(null)).toBe("/h");
    expect(authNextOrDefault("https://evil.com")).toBe("/h");
    expect(authNextOrDefault("/pre-registro")).toBe("/pre-registro");
  });
});

describe("isOtpRateLimited", () => {
  it("matches the 429 status, the rate_limit codes and the message", () => {
    expect(isOtpRateLimited({ message: "x", status: 429 })).toBe(true);
    expect(isOtpRateLimited({ message: "x", status: 400, code: "over_email_send_rate_limit" })).toBe(true);
    expect(isOtpRateLimited({ message: "Email rate limit exceeded" })).toBe(true);
  });

  it("leaves other failures alone", () => {
    expect(isOtpRateLimited({ message: "Signups not allowed", status: 422 })).toBe(false);
    expect(isOtpRateLimited({})).toBe(false);
  });
});
