import { describe, expect, it } from "vitest";
import {
  ATTRIBUTION_KEY,
  ATTRIBUTION_TTL_MS,
  attributionColumns,
  attributionFromFormData,
  campaignForSlug,
  parseAttribution,
  readStoredAttribution,
  withPlatformUtm,
} from "@/lib/attribution";

const NOW = new Date("2026-09-04T12:00:00Z");

describe("parseAttribution", () => {
  it("keeps the storage key stable", () => {
    expect(ATTRIBUTION_KEY).toBe("stbr-attribution");
  });

  it("reads the four UTMs and the referrer host", () => {
    const a = parseAttribution(
      "?utm_source=Instagram&utm_medium=story&utm_campaign=colosseum-2026&utm_content=2026-09-08-1&fbclid=x",
      "https://l.instagram.com/?u=abc",
      NOW,
      "hackathon.superteam.com.br",
    );
    expect(a).toEqual({
      utm_source: "instagram",
      utm_medium: "story",
      utm_campaign: "colosseum-2026",
      utm_content: "2026-09-08-1",
      referrer: "l.instagram.com",
      captured_at: NOW.toISOString(),
    });
  });

  it("returns null for a direct visit without UTMs", () => {
    expect(parseAttribution("", "", NOW)).toBeNull();
    expect(parseAttribution("?fbclid=x", "", NOW)).toBeNull();
  });

  it("ignores own-host referrers but keeps external ones", () => {
    expect(
      parseAttribution("", "https://hackathon.superteam.com.br/h", NOW, "hackathon.superteam.com.br"),
    ).toBeNull();
    const a = parseAttribution("", "https://www.linkedin.com/feed", NOW, "hackathon.superteam.com.br");
    expect(a?.referrer).toBe("linkedin.com");
    expect(a?.utm_source).toBeNull();
  });

  it("strips markup and caps the length", () => {
    const a = parseAttribution(`?utm_source=<script>${"a".repeat(200)}`, "", NOW);
    expect(a?.utm_source).not.toContain("<");
    expect(a?.utm_source?.length).toBe(120);
  });
});

describe("readStoredAttribution", () => {
  const stored = JSON.stringify({
    utm_source: "whatsapp",
    utm_medium: "group",
    utm_campaign: "colosseum-2026",
    utm_content: "pinned",
    referrer: null,
    captured_at: NOW.toISOString(),
  });

  it("returns the snapshot while it is fresh", () => {
    const later = new Date(NOW.getTime() + ATTRIBUTION_TTL_MS - 1000);
    expect(readStoredAttribution(stored, later)?.utm_source).toBe("whatsapp");
  });

  it("expires after 90 days", () => {
    const later = new Date(NOW.getTime() + ATTRIBUTION_TTL_MS + 1000);
    expect(readStoredAttribution(stored, later)).toBeNull();
  });

  it("rejects garbage", () => {
    expect(readStoredAttribution(null, NOW)).toBeNull();
    expect(readStoredAttribution("{not json", NOW)).toBeNull();
    expect(readStoredAttribution('"string"', NOW)).toBeNull();
    expect(readStoredAttribution(JSON.stringify({ utm_source: "x" }), NOW)).toBeNull();
    expect(readStoredAttribution(JSON.stringify({ utm_source: "x", captured_at: "nope" }), NOW)).toBeNull();
  });

  it("maps to the five registration columns", () => {
    expect(attributionColumns(readStoredAttribution(stored, NOW))).toEqual({
      utm_source: "whatsapp",
      utm_medium: "group",
      utm_campaign: "colosseum-2026",
      utm_content: "pinned",
      referrer: null,
    });
    expect(attributionColumns(null)).toEqual({
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      referrer: null,
    });
  });

  it("re-sanitises hidden form fields on the server", () => {
    const fd = new FormData();
    fd.set("utm_source", "X<b>");
    fd.set("utm_campaign", "colosseum-2026");
    fd.set("referrer", "");
    expect(attributionFromFormData(fd)).toEqual({
      utm_source: "xb",
      utm_medium: null,
      utm_campaign: "colosseum-2026",
      utm_content: null,
      referrer: null,
    });
  });
});

describe("withPlatformUtm", () => {
  it("tags an outbound link with the surface", () => {
    const url = new URL(
      withPlatformUtm("https://colosseum.com/signup", { content: "hub_deck", campaign: "colosseum-2026" }),
    );
    expect(url.searchParams.get("utm_source")).toBe("platform");
    expect(url.searchParams.get("utm_medium")).toBe("referral");
    expect(url.searchParams.get("utm_campaign")).toBe("colosseum-2026");
    expect(url.searchParams.get("utm_content")).toBe("hub_deck");
  });

  it("does not override UTMs the URL already carries", () => {
    const url = new URL(withPlatformUtm("https://superteam.fun/earn?utm_source=wiki", { content: "footer" }));
    expect(url.searchParams.get("utm_source")).toBe("wiki");
    expect(url.searchParams.get("utm_content")).toBe("footer");
  });

  it("leaves unparsable input alone", () => {
    expect(withPlatformUtm("/h/x", { content: "footer" })).toBe("/h/x");
  });

  it("maps edition slugs to campaign names", () => {
    expect(campaignForSlug("vibeathon-superteam-replit")).toBe("vibeathon-2026");
    expect(campaignForSlug("hackathon-universitario")).toBe("universitario-2026");
    expect(campaignForSlug("unknown")).toBe("unknown");
  });
});
