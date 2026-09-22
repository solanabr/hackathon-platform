import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("next/cache", () => ({ unstable_cache: (fn: (...a: unknown[]) => unknown) => fn }));

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { headers: { "content-type": "application/json" }, ...init });

describe("copilotFetch", () => {
  beforeEach(() => { process.env.COLOSSEUM_COPILOT_PAT = "t"; vi.resetModules(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("sends the bearer header and parses JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ ok: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const { copilotFetch } = await import("@/lib/copilot/client");
    await expect(copilotFetch("/status")).resolves.toEqual({ ok: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://copilot.colosseum.com/api/v1/status");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer t");
  });

  it("maps 429 to CopilotRateLimited with Retry-After", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ error: "x", code: "RATE_LIMITED", retryable: true }, { status: 429, headers: { "retry-after": "17", "content-type": "application/json" } })));
    const { copilotFetch, CopilotRateLimited } = await import("@/lib/copilot/client");
    await expect(copilotFetch("/status")).rejects.toMatchObject({ name: "CopilotRateLimited", retryAfterSeconds: 17 });
    expect(new CopilotRateLimited(3)).toBeInstanceOf(Error);
  });

  it("maps other failures to CopilotUnavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ error: "boom", code: "INTERNAL_ERROR", retryable: true }, { status: 500 })));
    const { copilotFetch } = await import("@/lib/copilot/client");
    await expect(copilotFetch("/status")).rejects.toMatchObject({ name: "CopilotUnavailable", status: 500 });
  });

  it("refuses to run without a token", async () => {
    delete process.env.COLOSSEUM_COPILOT_PAT;
    vi.stubGlobal("fetch", vi.fn());
    const { copilotFetch } = await import("@/lib/copilot/client");
    await expect(copilotFetch("/status")).rejects.toMatchObject({ name: "CopilotNotConfigured" });
  });
});

describe("searchProjects", () => {
  beforeEach(() => { process.env.COLOSSEUM_COPILOT_PAT = "t"; vi.resetModules(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("posts the input and maps the results", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({
      results: [{ slug: "s", name: "N", oneLiner: "o", similarity: 0.5, hackathon: { name: "Radar", slug: "radar", startDate: "2024-09-02" }, tracks: [], links: { github: null, demo: null, presentation: null, technicalDemo: null, twitter: null, colosseum: null }, evidence: [], prize: null, accelerator: null, metrics: { updatesCount: 0 }, team: { count: 1 }, tags: { problemTags: [], solutionTags: [], primitives: [], techStack: [], targetUsers: [] }, crowdedness: null, cluster: null }],
      totalFound: 1, hasMore: false,
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { searchProjects } = await import("@/lib/copilot/client");
    const out = await searchProjects({ query: "x", winnersOnly: true });
    expect(out.results[0].hackathon.year).toBe(2024);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ query: "x", filters: { winnersOnly: true } });
  });
});
