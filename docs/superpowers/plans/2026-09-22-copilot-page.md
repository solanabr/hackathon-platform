# Colosseum Copilot page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/guias/copilot`: a pt-BR page where a signed-in participant types an idea and sees the closest past Colosseum projects, how crowded the space is, three readings, and a prompt to carry into their coding agent; anyone can browse past projects by filter; and a setup guide for the Colosseum Copilot skill.

**Architecture:** One server module (`src/lib/copilot/`) is the only code that talks to `copilot.colosseum.com`, behind `unstable_cache` and a two-slot semaphore, using the STBR partner token from an env var. One route handler serves the client island. The page is a static server component with one client island for search and browse, plus the guide in JSX. Idea searches are counted per user in a service-role-only table and capped at 20 a day with a hand-off to the guide.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, Supabase (Postgres via MCP), Vitest, `@phosphor-icons/react`.

**Spec:** `docs/superpowers/specs/2026-09-22-copilot-page-design.md`

## Global Constraints

- UI copy pt-BR; code, commits, PR in English. No code comments unless they say why.
- Upstream base `https://copilot.colosseum.com/api/v1`; paths `/status`, `/filters`, `/search/projects`, `/search/archives`, `/clusters/:key`. Bearer token from `COLOSSEUM_COPILOT_PAT`; base override `COLOSSEUM_COPILOT_API_BASE`. The token never appears in git, logs or client code.
- Upstream limits: 30 searches/min, 2 in flight, `429` + `Retry-After`. Our side: `unstable_cache` (filters and clusters 24 h, searches 1 h), a per-instance semaphore of 2, errors never cached.
- Idea search needs a session (`resolveAuthenticatedUserState()` non-null); browse does not. Idea cap 20 per rolling 24 h per user, over the cap → `429` with the hand-off copy from the spec.
- Motion only via tokens (`duration-(--dur-instant)`, `ease-entrada`, `ease-mola`). Buttons use `btn-cut` classes. Sticker cards `border-2 border-green-dark shadow-sticker`.
- `/guias/*` is already public in `src/lib/routes.ts`; no middleware change.
- Query errors go through `logQueryError` from `src/lib/supabase/unwrap.ts`.
- Branch `feat/copilot-page` off `main`. One commit per task.
- **Design fidelity (audit 2026-09-22):** every section follows the LP rhythm, hat → heading → paragraph → content, each wrapped in `<Reveal>` (`tone="texto"` for type, `"papel"` for cards); section top padding `pt-24 lg:pt-28 xl:pt-32`; the eyebrow is the LP's `SectionHat` (lifted to `src/components/ui/section-hat.tsx`); highlights are the yellow sticker `bg-yellow … text-green-dark shadow-sticker`; guide steps sit in `card-cut` shells like the LP's Passo cards; form controls use the pre-registro focus idiom `focus:ring-2 focus:ring-emerald/30`. Outbound Colosseum links go through `withPlatformUtm`. Guides keep the narrower `max-w-4xl` reading measure on purpose, so `SectionRails` is not used.

## File structure

- `src/lib/copilot/types.ts` — upstream and card types.
- `src/lib/copilot/helpers.ts` — pure: `cacheKeyFor`, `mapProject`, `crowdednessLine`, `agentPrompt`, `normalizeIdea`.
- `src/lib/copilot/semaphore.ts` — `Semaphore` class.
- `src/lib/copilot/client.ts` — `copilotFetch`, error classes, cached readers.
- `src/lib/copilot/quota.ts` — idea-search count and record via service role.
- `supabase/migrations/00065_copilot_queries.sql` — the table.
- `src/app/api/copilot/search/route.ts` — POST handler.
- `src/components/ui/section-hat.tsx` — the LP's eyebrow, lifted out of `page.tsx` so guides can use it.
- `src/components/ui/copy-button.tsx` — generic copy button.
- `src/app/(public)/guias/copilot/page.tsx` — server page, metadata, guide sections.
- `src/app/(public)/guias/copilot/explorer.tsx` — client island: idea box, browse, results.
- `src/app/(public)/guias/copilot/project-card.tsx` — card, shared by idea and browse.
- `src/components/layout/footer.tsx` — link.
- `.env.example` — two lines.
- Tests in `src/lib/__tests__/copilot-*.test.ts`.

---

### Task 1: Types and pure helpers

**Files:**
- Create: `src/lib/copilot/types.ts`, `src/lib/copilot/helpers.ts`
- Test: `src/lib/__tests__/copilot-helpers.test.ts`

**Interfaces (produces):**
```ts
export type ProjectCard = {
  slug: string; name: string; oneLiner: string;
  hackathon: { name: string; slug: string; year: number };
  tracks: string[]; isWinner: boolean; inAccelerator: boolean;
  evidence: string[]; links: { github: string | null; demo: string | null; colosseum: string | null };
  cluster: { key: string; label: string } | null; crowdedness: number | null; similarity: number;
};
export type Reading = { id: string; title: string; author: string | null; source: string; url: string | null; publishedAt: string | null; snippet: string };
export type ClusterInfo = { key: string; label: string; projectCount: number; winnerCount: number };
export type SearchInput = { query?: string; hackathons?: string[]; trackKeys?: string[]; clusterKeys?: string[]; winnersOnly?: boolean; limit?: number; offset?: number };
export function cacheKeyFor(input: SearchInput): string
export function normalizeIdea(raw: unknown): string | null   // trimmed, 8..300 chars, else null
export function mapProject(p: ApiProject): ProjectCard
export function mapReading(d: ApiArchiveDoc): Reading
export function crowdednessLine(cluster: ClusterInfo | null): string | null
export function agentPrompt(idea: string): string
```

- [ ] **Step 1: Branch**

```bash
git checkout -b feat/copilot-page origin/main
```

- [ ] **Step 2: Write the failing tests**

```ts
// src/lib/__tests__/copilot-helpers.test.ts
import { describe, it, expect } from "vitest";
import {
  cacheKeyFor, normalizeIdea, mapProject, mapReading, crowdednessLine, agentPrompt,
} from "@/lib/copilot/helpers";
import type { ApiProject, ApiArchiveDoc } from "@/lib/copilot/types";

const apiProject: ApiProject = {
  slug: "agent-cred", name: "Agent-Cred",
  oneLiner: "Autonomous payment infrastructure on Solana for AI agents.",
  similarity: 0.0635,
  hackathon: { name: "Cypherpunk", slug: "cypherpunk", startDate: "2025-09-25" },
  tracks: [{ name: "DeFi", key: "cypherpunk/defi" }, { name: "Infrastructure", key: "cypherpunk/infrastructure" }],
  links: { github: "https://github.com/x/y", demo: null, presentation: null, technicalDemo: null, twitter: null, colosseum: "https://colosseum.com/projects/explore/agent-cred" },
  evidence: ["one", "two", "three"],
  prize: null, accelerator: null, metrics: { updatesCount: 0 }, team: { count: 2 },
  tags: { problemTags: [], solutionTags: [], primitives: [], techStack: [], targetUsers: [] },
  crowdedness: 325, cluster: { key: "v1-c14", label: "Solana AI Agent Infrastructure" },
};

describe("cacheKeyFor", () => {
  it("normalizes case, whitespace and array order", () => {
    const a = cacheKeyFor({ query: "  Agent Payments ", hackathons: ["radar", "breakout"] });
    const b = cacheKeyFor({ query: "agent payments", hackathons: ["breakout", "radar"] });
    expect(a).toBe(b);
  });
  it("differs when a filter differs", () => {
    expect(cacheKeyFor({ query: "x" })).not.toBe(cacheKeyFor({ query: "x", winnersOnly: true }));
  });
});

describe("normalizeIdea", () => {
  it("accepts 8 to 300 trimmed chars", () => {
    expect(normalizeIdea("  pagamentos para agentes  ")).toBe("pagamentos para agentes");
    expect(normalizeIdea("curto")).toBeNull();
    expect(normalizeIdea("a".repeat(301))).toBeNull();
    expect(normalizeIdea(42)).toBeNull();
  });
});

describe("mapProject", () => {
  it("keeps only what the card renders and derives year and flags", () => {
    const card = mapProject(apiProject);
    expect(card.hackathon.year).toBe(2025);
    expect(card.tracks).toEqual(["DeFi", "Infrastructure"]);
    expect(card.isWinner).toBe(false);
    expect(card.inAccelerator).toBe(false);
    expect(card.evidence).toEqual(["one", "two"]);
    expect(card.links).toEqual({ github: "https://github.com/x/y", demo: null, colosseum: "https://colosseum.com/projects/explore/agent-cred" });
    expect(Object.keys(card)).not.toContain("tags");
  });
  it("flags winners and accelerator teams", () => {
    const card = mapProject({ ...apiProject, prize: { placement: 1 }, accelerator: { batch: "x" } });
    expect(card.isWinner).toBe(true);
    expect(card.inAccelerator).toBe(true);
  });
});

describe("mapReading", () => {
  it("maps an archive document", () => {
    const doc: ApiArchiveDoc = { documentId: "d1", title: "T", author: "A", source: "a16z_crypto", url: "https://x", publishedAt: "2026-02-19", similarity: 0.7, snippet: "s", chunkIndex: 6 };
    expect(mapReading(doc)).toEqual({ id: "d1", title: "T", author: "A", source: "a16z_crypto", url: "https://x", publishedAt: "2026-02-19", snippet: "s" });
  });
});

describe("crowdednessLine", () => {
  it("writes the pt-BR sentence", () => {
    expect(crowdednessLine({ key: "v1-c14", label: "Solana AI Agent Infrastructure", projectCount: 325, winnerCount: 12 }))
      .toBe("325 projetos já construíram nessa área (Solana AI Agent Infrastructure) e 12 venceram prêmios.");
  });
  it("handles one and zero", () => {
    expect(crowdednessLine({ key: "k", label: "L", projectCount: 1, winnerCount: 0 }))
      .toBe("1 projeto já construiu nessa área (L) e nenhum venceu prêmio.");
    expect(crowdednessLine(null)).toBeNull();
  });
});

describe("agentPrompt", () => {
  it("embeds the idea", () => {
    expect(agentPrompt("um marketplace de energia")).toContain("Quero construir um marketplace de energia.");
  });
});
```

- [ ] **Step 3: Run to see them fail**

```bash
npx vitest run src/lib/__tests__/copilot-helpers.test.ts
```
Expected: FAIL, modules not found.

- [ ] **Step 4: Types**

```ts
// src/lib/copilot/types.ts
export type ApiProject = {
  slug: string; name: string; oneLiner: string; similarity: number;
  hackathon: { name: string; slug: string; startDate: string };
  tracks: { name: string; key: string }[];
  links: { github: string | null; demo: string | null; presentation: string | null; technicalDemo: string | null; twitter: string | null; colosseum: string | null };
  evidence: string[];
  prize: unknown | null; accelerator: unknown | null;
  metrics: { updatesCount: number }; team: { count: number };
  tags: { problemTags: string[]; solutionTags: string[]; primitives: string[]; techStack: string[]; targetUsers: string[] };
  crowdedness: number | null; cluster: { key: string; label: string } | null;
};

export type ApiArchiveDoc = {
  documentId: string; title: string; author: string | null; source: string; url: string | null;
  publishedAt: string | null; similarity: number | string; snippet: string; chunkIndex: number | string;
};

export type ApiFilters = {
  hackathons: { slug: string; name: string; startDate: string; projectCount: number; winnerCount: number }[];
  tracks: { key: string; name: string; hackathonSlug: string; projectCount: number }[];
  clusters: { key: string; label: string; projectCount: number }[];
};

export type ApiCluster = { key: string; label: string; projectCount: number; winnerCount: number };

export type ProjectCard = {
  slug: string; name: string; oneLiner: string;
  hackathon: { name: string; slug: string; year: number };
  tracks: string[]; isWinner: boolean; inAccelerator: boolean;
  evidence: string[];
  links: { github: string | null; demo: string | null; colosseum: string | null };
  cluster: { key: string; label: string } | null; crowdedness: number | null; similarity: number;
};

export type Reading = {
  id: string; title: string; author: string | null; source: string; url: string | null;
  publishedAt: string | null; snippet: string;
};

export type ClusterInfo = ApiCluster;

export type SearchInput = {
  query?: string; hackathons?: string[]; trackKeys?: string[]; clusterKeys?: string[];
  winnersOnly?: boolean; limit?: number; offset?: number;
};
```

- [ ] **Step 5: Helpers**

```ts
// src/lib/copilot/helpers.ts
import type { ApiArchiveDoc, ApiProject, ClusterInfo, ProjectCard, Reading, SearchInput } from "./types";

const sorted = (xs?: string[]) => (xs ? [...xs].sort() : undefined);

export function cacheKeyFor(input: SearchInput): string {
  return JSON.stringify({
    q: input.query?.trim().toLowerCase().replace(/\s+/g, " ") || "",
    h: sorted(input.hackathons), t: sorted(input.trackKeys), c: sorted(input.clusterKeys),
    w: input.winnersOnly ?? false, l: input.limit ?? 10, o: input.offset ?? 0,
  });
}

export function normalizeIdea(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const idea = raw.trim().replace(/\s+/g, " ");
  return idea.length >= 8 && idea.length <= 300 ? idea : null;
}

export function mapProject(p: ApiProject): ProjectCard {
  return {
    slug: p.slug, name: p.name, oneLiner: p.oneLiner,
    hackathon: { name: p.hackathon.name, slug: p.hackathon.slug, year: Number(p.hackathon.startDate.slice(0, 4)) },
    tracks: p.tracks.map((t) => t.name),
    isWinner: p.prize != null, inAccelerator: p.accelerator != null,
    evidence: p.evidence.slice(0, 2),
    links: { github: p.links.github, demo: p.links.demo ?? p.links.technicalDemo, colosseum: p.links.colosseum },
    cluster: p.cluster, crowdedness: p.crowdedness, similarity: p.similarity,
  };
}

export function mapReading(d: ApiArchiveDoc): Reading {
  return { id: d.documentId, title: d.title, author: d.author, source: d.source, url: d.url, publishedAt: d.publishedAt, snippet: d.snippet };
}

export function crowdednessLine(cluster: ClusterInfo | null): string | null {
  if (!cluster) return null;
  const built = cluster.projectCount === 1 ? "1 projeto já construiu" : `${cluster.projectCount} projetos já construíram`;
  const won =
    cluster.winnerCount === 0 ? "nenhum venceu prêmio" : cluster.winnerCount === 1 ? "1 venceu prêmio" : `${cluster.winnerCount} venceram prêmios`;
  return `${built} nessa área (${cluster.label}) e ${won}.`;
}

export function agentPrompt(idea: string): string {
  return `Quero construir ${idea}. Alguém já fez isso nos hackathons do Colosseum? Como está o cenário competitivo, o que os projetos anteriores erraram e onde ainda há espaço? Termine com uma avaliação honesta: vale a pena seguir com essa ideia ou não?`;
}
```

- [ ] **Step 6: Run tests**

```bash
npx vitest run src/lib/__tests__/copilot-helpers.test.ts
```
Expected: 9 passed.

- [ ] **Step 7: Commit**

```bash
git add src/lib/copilot/types.ts src/lib/copilot/helpers.ts src/lib/__tests__/copilot-helpers.test.ts
git commit -m "feat: Copilot types and pure mappers"
```

---

### Task 2: Semaphore

**Files:**
- Create: `src/lib/copilot/semaphore.ts`
- Test: `src/lib/__tests__/copilot-semaphore.test.ts`

**Interfaces (produces):**
```ts
export class Semaphore { constructor(slots: number); acquire(timeoutMs: number): Promise<() => void>; get inFlight(): number }
export class SemaphoreTimeout extends Error {}
```

- [ ] **Step 1: Failing tests**

```ts
// src/lib/__tests__/copilot-semaphore.test.ts
import { describe, it, expect } from "vitest";
import { Semaphore, SemaphoreTimeout } from "@/lib/copilot/semaphore";

describe("Semaphore", () => {
  it("lets N through and queues the rest in order", async () => {
    const s = new Semaphore(2);
    const r1 = await s.acquire(100);
    const r2 = await s.acquire(100);
    expect(s.inFlight).toBe(2);
    const order: number[] = [];
    const p3 = s.acquire(1000).then((r) => { order.push(3); return r; });
    const p4 = s.acquire(1000).then((r) => { order.push(4); return r; });
    r1();
    const r3 = await p3;
    expect(order).toEqual([3]);
    r2(); r3();
    const r4 = await p4;
    expect(order).toEqual([3, 4]);
    r4();
    expect(s.inFlight).toBe(0);
  });

  it("times out a waiter", async () => {
    const s = new Semaphore(1);
    const r = await s.acquire(10);
    await expect(s.acquire(20)).rejects.toBeInstanceOf(SemaphoreTimeout);
    r();
  });

  it("releasing twice is a no-op", async () => {
    const s = new Semaphore(1);
    const r = await s.acquire(10);
    r(); r();
    expect(s.inFlight).toBe(0);
  });
});
```

- [ ] **Step 2: Run to see it fail**

```bash
npx vitest run src/lib/__tests__/copilot-semaphore.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/lib/copilot/semaphore.ts
export class SemaphoreTimeout extends Error {
  constructor() { super("semaphore timeout"); this.name = "SemaphoreTimeout"; }
}

type Waiter = { resolve: (release: () => void) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };

// Best effort per serverless instance: the upstream allows 2 requests in
// flight per token and Vercel may run several instances at once, so this
// smooths bursts inside one instance while the cache and Retry-After
// handling are what actually keep us under the limit.
export class Semaphore {
  private active = 0;
  private queue: Waiter[] = [];
  constructor(private readonly slots: number) {}

  get inFlight(): number { return this.active; }

  acquire(timeoutMs: number): Promise<() => void> {
    if (this.active < this.slots) { this.active += 1; return Promise.resolve(this.releaser()); }
    return new Promise((resolve, reject) => {
      const waiter: Waiter = {
        resolve, reject,
        timer: setTimeout(() => {
          this.queue = this.queue.filter((w) => w !== waiter);
          reject(new SemaphoreTimeout());
        }, timeoutMs),
      };
      this.queue.push(waiter);
    });
  }

  private releaser(): () => void {
    let done = false;
    return () => {
      if (done) return;
      done = true;
      const next = this.queue.shift();
      if (next) { clearTimeout(next.timer); next.resolve(this.releaser()); return; }
      this.active -= 1;
    };
  }
}
```

- [ ] **Step 4: Run tests, then commit**

```bash
npx vitest run src/lib/__tests__/copilot-semaphore.test.ts
git add src/lib/copilot/semaphore.ts src/lib/__tests__/copilot-semaphore.test.ts
git commit -m "feat: two-slot semaphore for the Copilot upstream"
```

---

### Task 3: Upstream client with cache

**Files:**
- Create: `src/lib/copilot/client.ts`
- Modify: `src/lib/cache-tags.ts` (add `COPILOT_FILTERS_TAG`)
- Modify: `.env.example` (append the two vars)
- Test: `src/lib/__tests__/copilot-client.test.ts`

**Interfaces (produces):**
```ts
export class CopilotRateLimited extends Error { retryAfterSeconds: number }
export class CopilotUnavailable extends Error { status: number }
export class CopilotNotConfigured extends Error {}
export async function copilotFetch<T>(path: string, init?: { method?: "GET" | "POST"; body?: unknown }): Promise<T>
export function getFilters(): Promise<ApiFilters>
export function getCluster(key: string): Promise<ClusterInfo | null>
export function searchProjects(input: SearchInput): Promise<{ results: ProjectCard[]; hasMore: boolean; totalFound: number }>
export function searchArchives(query: string, limit?: number): Promise<Reading[]>
```

- [ ] **Step 1: Failing tests (fetch is mocked; `unstable_cache` is mocked to pass-through)**

```ts
// src/lib/__tests__/copilot-client.test.ts
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
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ query: "x", filter: { winnersOnly: true } });
  });
});
```

- [ ] **Step 2: Run to see them fail**

```bash
npx vitest run src/lib/__tests__/copilot-client.test.ts
```

- [ ] **Step 3: Cache tag and env example**

Append to `src/lib/cache-tags.ts`:
```ts
export const COPILOT_FILTERS_TAG = "copilot:filters";
```
Append to `.env.example`:
```
# Colosseum Copilot — the STBR partner account's personal access token
# (colosseum.com/arena/copilot, 90-day expiry). Server-only; /guias/copilot
# search is disabled while it is empty.
COLOSSEUM_COPILOT_PAT=
COLOSSEUM_COPILOT_API_BASE=https://copilot.colosseum.com/api/v1
```

- [ ] **Step 4: Client**

```ts
// src/lib/copilot/client.ts
import { unstable_cache } from "next/cache";
import { COPILOT_FILTERS_TAG } from "@/lib/cache-tags";
import { cacheKeyFor, mapProject, mapReading } from "./helpers";
import { Semaphore } from "./semaphore";
import type { ApiArchiveDoc, ApiCluster, ApiFilters, ApiProject, ClusterInfo, ProjectCard, Reading, SearchInput } from "./types";

const DEFAULT_BASE = "https://copilot.colosseum.com/api/v1";
const TIMEOUT_MS = 10_000;
const QUEUE_WAIT_MS = 15_000;
const gate = new Semaphore(2);

export class CopilotNotConfigured extends Error {
  constructor() { super("COLOSSEUM_COPILOT_PAT is not set"); this.name = "CopilotNotConfigured"; }
}
export class CopilotRateLimited extends Error {
  constructor(public readonly retryAfterSeconds: number) { super("copilot rate limited"); this.name = "CopilotRateLimited"; }
}
export class CopilotUnavailable extends Error {
  constructor(public readonly status: number, message = "copilot unavailable") { super(message); this.name = "CopilotUnavailable"; }
}

export async function copilotFetch<T>(path: string, init: { method?: "GET" | "POST"; body?: unknown } = {}): Promise<T> {
  const token = process.env.COLOSSEUM_COPILOT_PAT;
  if (!token) throw new CopilotNotConfigured();
  const base = process.env.COLOSSEUM_COPILOT_API_BASE || DEFAULT_BASE;
  const release = await gate.acquire(QUEUE_WAIT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${base}${path}`, {
      method: init.method ?? "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
    if (res.status === 429) {
      const after = Number(res.headers.get("retry-after"));
      throw new CopilotRateLimited(Number.isFinite(after) && after > 0 ? after : 30);
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new CopilotUnavailable(res.status, body?.error ?? `copilot ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof CopilotRateLimited || e instanceof CopilotUnavailable) throw e;
    throw new CopilotUnavailable(0, e instanceof Error ? e.message : "copilot fetch failed");
  } finally {
    clearTimeout(timer);
    release();
  }
}

export const getFilters = (): Promise<ApiFilters> =>
  unstable_cache(() => copilotFetch<ApiFilters>("/filters"), ["copilot-filters"], { tags: [COPILOT_FILTERS_TAG], revalidate: 86_400 })();

export const getCluster = (key: string): Promise<ClusterInfo | null> =>
  unstable_cache(
    async () => {
      try {
        const c = await copilotFetch<ApiCluster>(`/clusters/${encodeURIComponent(key)}`);
        return { key: c.key, label: c.label, projectCount: c.projectCount, winnerCount: c.winnerCount };
      } catch (e) {
        if (e instanceof CopilotUnavailable && e.status === 404) return null;
        throw e;
      }
    },
    ["copilot-cluster", key],
    { revalidate: 86_400 },
  )();

export const searchProjects = (input: SearchInput): Promise<{ results: ProjectCard[]; hasMore: boolean; totalFound: number }> =>
  unstable_cache(
    async () => {
      const body = {
        query: input.query?.trim() || undefined,
        hackathons: input.hackathons, trackKeys: input.trackKeys,
        limit: input.limit ?? 10, offset: input.offset ?? 0,
        filter: { winnersOnly: input.winnersOnly ?? false, clusterKeys: input.clusterKeys },
      };
      const out = await copilotFetch<{ results: ApiProject[]; hasMore: boolean; totalFound: number }>("/search/projects", { method: "POST", body });
      return { results: out.results.map(mapProject), hasMore: out.hasMore, totalFound: out.totalFound };
    },
    ["copilot-search-projects", cacheKeyFor(input)],
    { revalidate: 3_600 },
  )();

export const searchArchives = (query: string, limit = 3): Promise<Reading[]> =>
  unstable_cache(
    async () => {
      const out = await copilotFetch<{ results: ApiArchiveDoc[] }>("/search/archives", { method: "POST", body: { query, limit, intent: "ideation" } });
      return out.results.map(mapReading);
    },
    ["copilot-search-archives", cacheKeyFor({ query, limit })],
    { revalidate: 3_600 },
  )();
```

- [ ] **Step 5: Run tests, then commit**

```bash
npx vitest run src/lib/__tests__/copilot-client.test.ts && npx tsc --noEmit -p .
git add src/lib/copilot/client.ts src/lib/cache-tags.ts .env.example src/lib/__tests__/copilot-client.test.ts
git commit -m "feat: Copilot upstream client with cache, timeout and 429 mapping"
```

---

### Task 4: Quota table and counter

**Files:**
- Create: `supabase/migrations/00065_copilot_queries.sql`, `src/lib/copilot/quota.ts`
- Modify: `src/types/db.ts` (add the row type next to the other tables)

**Interfaces (produces):**
```ts
export const IDEA_DAILY_CAP = 20;
export async function ideaSearchesLast24h(userId: string): Promise<number>
export async function recordIdeaSearch(userId: string): Promise<void>
```

- [ ] **Step 1: Migration file**

```sql
-- supabase/migrations/00065_copilot_queries.sql
-- One row per idea search on /guias/copilot. Only the fact that a user
-- searched is kept, never the text: the per-user daily cap reads it and it
-- doubles as usage telemetry. Service role only, like submission_ratings.
create table public.copilot_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('idea')),
  created_at timestamptz not null default now()
);

create index copilot_queries_user_recent_idx
  on public.copilot_queries (user_id, created_at desc);

alter table public.copilot_queries enable row level security;

revoke all on public.copilot_queries from anon, authenticated;
grant all on public.copilot_queries to service_role;
```

- [ ] **Step 2: Apply it through the Supabase MCP**

Call `apply_migration` on project `dqxeukfkjnoqljovkage` with name `copilot_queries` and the SQL above (the file stays the source of truth, see the memory note on migrations). Then verify:

```sql
select count(*) from public.copilot_queries;
```
Expected: `0`. And `get_advisors` security should list `copilot_queries` under "RLS enabled no policy", which is intended.

- [ ] **Step 3: Row type**

In `src/types/db.ts`, next to the other row types:
```ts
export type CopilotQuery = { id: string; user_id: string; kind: "idea"; created_at: string };
```

- [ ] **Step 4: Counter**

```ts
// src/lib/copilot/quota.ts
import { createServiceRoleClient } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/supabase/unwrap";

export const IDEA_DAILY_CAP = 20;

export async function ideaSearchesLast24h(userId: string): Promise<number> {
  const supabase = await createServiceRoleClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("copilot_queries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", "idea")
    .gte("created_at", since);
  // A failed count must not open the gate: treat it as at the cap.
  if (error) { logQueryError("copilot.quota.count", error); return IDEA_DAILY_CAP; }
  return count ?? 0;
}

export async function recordIdeaSearch(userId: string): Promise<void> {
  const supabase = await createServiceRoleClient();
  const { error } = await supabase.from("copilot_queries").insert({ user_id: userId, kind: "idea" });
  if (error) logQueryError("copilot.quota.record", error);
}
```

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit -p .
git add supabase/migrations/00065_copilot_queries.sql src/lib/copilot/quota.ts src/types/db.ts
git commit -m "feat: copilot_queries table and the per-user idea cap"
```

---

### Task 5: Route handler

**Files:**
- Create: `src/app/api/copilot/search/route.ts`
- Test: `src/lib/__tests__/copilot-route.test.ts` (pure body parsing only)

**Interfaces (produces), the wire contract the island consumes:**
```ts
// request
type IdeaRequest = { mode: "idea"; idea: string };
type BrowseRequest = { mode: "browse"; hackathon?: string; trackKey?: string; clusterKey?: string; winnersOnly?: boolean; offset?: number };
// responses
type IdeaResponse = { projects: ProjectCard[]; crowdedness: string | null; readings: Reading[]; prompt: string; remaining: number };
type BrowseResponse = { projects: ProjectCard[]; hasMore: boolean; totalFound: number };
type ErrorResponse = { error: string; code: "invalid" | "unauthenticated" | "quota" | "rate_limited" | "unavailable"; retryAfter?: number };
```

- [ ] **Step 1: Failing test for the parser**

```ts
// src/lib/__tests__/copilot-route.test.ts
import { describe, it, expect } from "vitest";
import { parseSearchRequest } from "@/app/api/copilot/search/parse";

describe("parseSearchRequest", () => {
  it("accepts an idea", () => {
    expect(parseSearchRequest({ mode: "idea", idea: "pagamentos para agentes" })).toEqual({ mode: "idea", idea: "pagamentos para agentes" });
  });
  it("rejects a short idea", () => {
    expect(parseSearchRequest({ mode: "idea", idea: "oi" })).toBeNull();
  });
  it("accepts browse filters and clamps offset", () => {
    expect(parseSearchRequest({ mode: "browse", hackathon: "radar", winnersOnly: true, offset: -3 }))
      .toEqual({ mode: "browse", hackathon: "radar", trackKey: undefined, clusterKey: undefined, winnersOnly: true, offset: 0 });
  });
  it("rejects unknown modes and junk", () => {
    expect(parseSearchRequest({ mode: "x" })).toBeNull();
    expect(parseSearchRequest(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Parser**

```ts
// src/app/api/copilot/search/parse.ts
import { normalizeIdea } from "@/lib/copilot/helpers";

export type IdeaRequest = { mode: "idea"; idea: string };
export type BrowseRequest = { mode: "browse"; hackathon?: string; trackKey?: string; clusterKey?: string; winnersOnly?: boolean; offset?: number };

const KEY = /^[a-z0-9][a-z0-9/_-]{0,80}$/i;
const str = (v: unknown) => (typeof v === "string" && KEY.test(v) ? v : undefined);

export function parseSearchRequest(body: unknown): IdeaRequest | BrowseRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (b.mode === "idea") {
    const idea = normalizeIdea(b.idea);
    return idea ? { mode: "idea", idea } : null;
  }
  if (b.mode === "browse") {
    const offset = typeof b.offset === "number" && Number.isFinite(b.offset) ? Math.min(Math.max(Math.trunc(b.offset), 0), 200) : 0;
    return { mode: "browse", hackathon: str(b.hackathon), trackKey: str(b.trackKey), clusterKey: str(b.clusterKey), winnersOnly: b.winnersOnly === true, offset };
  }
  return null;
}
```

- [ ] **Step 3: Run the parser test**

```bash
npx vitest run src/lib/__tests__/copilot-route.test.ts
```
Expected: 4 passed.

- [ ] **Step 4: Handler**

```ts
// src/app/api/copilot/search/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { CopilotNotConfigured, CopilotRateLimited, getCluster, searchArchives, searchProjects } from "@/lib/copilot/client";
import { agentPrompt, crowdednessLine } from "@/lib/copilot/helpers";
import { IDEA_DAILY_CAP, ideaSearchesLast24h, recordIdeaSearch } from "@/lib/copilot/quota";
import { SemaphoreTimeout } from "@/lib/copilot/semaphore";
import { parseSearchRequest } from "./parse";

const CAP_MESSAGE =
  `Você usou as ${IDEA_DAILY_CAP} pesquisas de hoje por aqui. Para continuar sem limite, gere seu próprio token no Colosseum e use o Copilot no seu agente.`;

function failure(e: unknown) {
  if (e instanceof CopilotRateLimited)
    return NextResponse.json({ error: `Muita gente pesquisando agora. Tente em ${e.retryAfterSeconds} segundos.`, code: "rate_limited", retryAfter: e.retryAfterSeconds }, { status: 429, headers: { "Retry-After": String(e.retryAfterSeconds) } });
  if (e instanceof SemaphoreTimeout)
    return NextResponse.json({ error: "Muita gente pesquisando agora. Tente em 15 segundos.", code: "rate_limited", retryAfter: 15 }, { status: 429 });
  if (e instanceof CopilotNotConfigured)
    return NextResponse.json({ error: "A busca ainda não está configurada.", code: "unavailable" }, { status: 503 });
  console.error("[copilot.search]", e instanceof Error ? e.message : e);
  return NextResponse.json({ error: "O Copilot está fora do ar. Tente mais tarde.", code: "unavailable" }, { status: 503 });
}

export async function POST(request: NextRequest) {
  const parsed = parseSearchRequest(await request.json().catch(() => null));
  if (!parsed) return NextResponse.json({ error: "Escreva sua ideia em pelo menos 8 caracteres.", code: "invalid" }, { status: 400 });

  try {
    if (parsed.mode === "browse") {
      const out = await searchProjects({
        hackathons: parsed.hackathon ? [parsed.hackathon] : undefined,
        trackKeys: parsed.trackKey ? [parsed.trackKey] : undefined,
        clusterKeys: parsed.clusterKey ? [parsed.clusterKey] : undefined,
        winnersOnly: parsed.winnersOnly, limit: 12, offset: parsed.offset,
      });
      return NextResponse.json({ projects: out.results, hasMore: out.hasMore, totalFound: out.totalFound });
    }

    const state = await resolveAuthenticatedUserState();
    if (!state) return NextResponse.json({ error: "Entre na sua conta para pesquisar uma ideia.", code: "unauthenticated" }, { status: 401 });

    const used = await ideaSearchesLast24h(state.userId);
    if (used >= IDEA_DAILY_CAP) return NextResponse.json({ error: CAP_MESSAGE, code: "quota" }, { status: 429 });

    const [projects, readings] = await Promise.all([
      searchProjects({ query: parsed.idea, limit: 6 }),
      searchArchives(parsed.idea, 3),
    ]);
    const top = projects.results[0];
    const cluster = top?.cluster ? await getCluster(top.cluster.key) : null;
    await recordIdeaSearch(state.userId);

    return NextResponse.json({
      projects: projects.results,
      crowdedness: crowdednessLine(cluster),
      readings,
      prompt: agentPrompt(parsed.idea),
      remaining: Math.max(IDEA_DAILY_CAP - used - 1, 0),
    });
  } catch (e) {
    return failure(e);
  }
}
```

- [ ] **Step 5: Smoke it locally**

With `COLOSSEUM_COPILOT_PAT` set in `.env.local` (freshly generated from the STBR account, never the one that was pasted in chat) and the dev server running:

```bash
curl -s -X POST http://localhost:3000/api/copilot/search -H 'content-type: application/json' -d '{"mode":"browse","hackathon":"radar","winnersOnly":true}' | python3 -c 'import json,sys; d=json.load(sys.stdin); print(len(d["projects"]), d["hasMore"], d["projects"][0]["name"])'
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/api/copilot/search -H 'content-type: application/json' -d '{"mode":"idea","idea":"pagamentos para agentes de IA"}'
```
Expected: `12 True <name>` and `401` (no session on curl).

- [ ] **Step 6: Commit**

```bash
npx tsc --noEmit -p . && npx eslint src/app/api/copilot
git add src/app/api/copilot src/lib/__tests__/copilot-route.test.ts
git commit -m "feat: /api/copilot/search for idea and browse, with the daily cap"
```

---

### Task 6: SectionHat, copy button and project card

**Files:**
- Create: `src/components/ui/section-hat.tsx`, `src/components/ui/copy-button.tsx`, `src/app/(public)/guias/copilot/project-card.tsx`
- Modify: `src/app/(public)/page.tsx:210-230` (delete the local `SectionHat`, import the shared one)

**Interfaces (produces):**
```tsx
export function CopyButton({ text, label, event, className }: { text: string; label: string; event?: { name: string; properties?: Record<string, unknown> }; className?: string })
export function ProjectCardView({ card }: { card: ProjectCard })
```

- [ ] **Step 0: Lift `SectionHat` out of the LP**

Create the shared component with the LP's exact markup:

```tsx
// src/components/ui/section-hat.tsx
import type { ReactNode } from "react";

export function SectionHat({ children, centered = false, onDark = false }: { children: ReactNode; centered?: boolean; onDark?: boolean }) {
  return (
    <p className={`flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] ${onDark ? "text-surface" : "text-ink/75"} ${centered ? "justify-center" : ""}`}>
      <span aria-hidden className={`h-[7px] w-[18px] shrink-0 rounded-[2px] ${onDark ? "bg-yellow" : "bg-emerald"}`} />
      {children}
    </p>
  );
}
```

In `src/app/(public)/page.tsx` delete the local `function SectionHat(...)` (lines ~210-230) and add `import { SectionHat } from "@/components/ui/section-hat";`. The eight call sites keep working unchanged. Verify with `npx tsc --noEmit -p .` and by loading `/` once: no visual change.

- [ ] **Step 1: Copy button**

```tsx
// src/components/ui/copy-button.tsx
"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react/dist/ssr";
import { trackClient } from "@/lib/analytics-browser";

export function CopyButton({ text, label, event, className }: {
  text: string; label: string;
  event?: { name: string; properties?: Record<string, unknown> };
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (event) trackClient(event.name, event.properties);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the text is selectable right beside the button.
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copiado" : label}
      className={className ?? "btn-cut btn-cut-outline inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-ink transition-colors duration-(--dur-instant) ease-entrada hover:text-surface [--btn-cut-fill:var(--color-surface-raised)]"}
    >
      {copied ? <CheckIcon size={16} weight="bold" aria-hidden /> : <CopyIcon size={16} weight="bold" aria-hidden />}
      <span>{copied ? "Copiado" : label}</span>
    </button>
  );
}
```

- [ ] **Step 2: Project card**

```tsx
// src/app/(public)/guias/copilot/project-card.tsx
import { ArrowUpRightIcon, GithubLogoIcon, PlayIcon, TrophyIcon } from "@phosphor-icons/react/dist/ssr";
import type { ProjectCard } from "@/lib/copilot/types";

export function ProjectCardView({ card }: { card: ProjectCard }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border-2 border-green-dark bg-surface-raised p-5 shadow-sticker">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-green-dark/70">
          {card.hackathon.name} · {card.hackathon.year}
        </p>
        {(card.isWinner || card.inAccelerator) && (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-green-dark">
            <TrophyIcon size={12} weight="fill" aria-hidden />
            {card.inAccelerator ? "Acelerador" : "Premiado"}
          </span>
        )}
      </div>
      <h3 className="mt-2 font-heading text-lg font-bold leading-snug text-ink">{card.name}</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink/75">{card.oneLiner}</p>
      {card.evidence.length > 0 && (
        <ul className="mt-3 space-y-1 border-l-2 border-yellow pl-3 text-xs leading-relaxed text-green-dark/80">
          {card.evidence.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}
      {card.tracks.length > 0 && (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted">{card.tracks.join(" · ")}</p>
      )}
      <div className="mt-auto flex flex-wrap gap-3 pt-4 text-xs font-bold">
        {card.links.colosseum && (
          <a href={card.links.colosseum} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-deep underline underline-offset-2">
            Colosseum <ArrowUpRightIcon size={12} weight="bold" aria-hidden />
          </a>
        )}
        {card.links.github && (
          <a href={card.links.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-ink/80 hover:text-ink">
            <GithubLogoIcon size={14} weight="bold" aria-hidden /> GitHub
          </a>
        )}
        {card.links.demo && (
          <a href={card.links.demo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-ink/80 hover:text-ink">
            <PlayIcon size={14} weight="fill" aria-hidden /> Demo
          </a>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 3: Typecheck, lint, commit**

```bash
npx tsc --noEmit -p . && npx eslint src/components/ui/copy-button.tsx 'src/app/(public)/guias/copilot'
git add src/components/ui/section-hat.tsx src/components/ui/copy-button.tsx 'src/app/(public)/guias/copilot/project-card.tsx' 'src/app/(public)/page.tsx'
git commit -m "feat: shared SectionHat, copy button and Copilot project card"
```

---

### Task 7: Explorer island (idea + browse)

**Files:**
- Create: `src/app/(public)/guias/copilot/explorer.tsx`

**Interfaces:**
- Consumes: the wire contract from Task 5, `ProjectCardView`, `CopyButton`, `openAuthDialog` from `@/components/auth/auth-dialog`, `trackClient`.
- Produces: `export function CopilotExplorer({ filters, signedIn }: { filters: ExplorerFilters; signedIn: boolean })` where `ExplorerFilters = { hackathons: { slug: string; name: string; projectCount: number }[]; tracks: { key: string; name: string; hackathonSlug: string }[]; clusters: { key: string; label: string; projectCount: number }[] }`.

- [ ] **Step 1: Component**

```tsx
// src/app/(public)/guias/copilot/explorer.tsx
"use client";

import { useState, useTransition, type FormEvent } from "react";
import { openAuthDialog } from "@/components/auth/auth-dialog";
import { CopyButton } from "@/components/ui/copy-button";
import { Reveal } from "@/components/ui/reveal";
import { SectionHat } from "@/components/ui/section-hat";
import { trackClient } from "@/lib/analytics-browser";
import type { ProjectCard, Reading } from "@/lib/copilot/types";
import { ProjectCardView } from "./project-card";

export type ExplorerFilters = {
  hackathons: { slug: string; name: string; projectCount: number }[];
  tracks: { key: string; name: string; hackathonSlug: string }[];
  clusters: { key: string; label: string; projectCount: number }[];
};

type IdeaResult = { projects: ProjectCard[]; crowdedness: string | null; readings: Reading[]; prompt: string; remaining: number };
type ApiError = { error: string; code: "invalid" | "unauthenticated" | "quota" | "rate_limited" | "unavailable"; retryAfter?: number };

const AUTH_NEXT = "/guias/copilot#valide";

async function post<T>(body: unknown): Promise<{ ok: true; data: T } | { ok: false; err: ApiError }> {
  const res = await fetch("/api/copilot/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({ error: "Falha de rede.", code: "unavailable" }));
  return res.ok ? { ok: true, data: json as T } : { ok: false, err: json as ApiError };
}

const CHIP = "rounded-full border-2 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors duration-(--dur-instant) ease-entrada";
const chip = (on: boolean) => `${CHIP} ${on ? "border-green-dark bg-green-dark text-yellow" : "border-green-dark/30 text-ink hover:border-green-dark"}`;

export function CopilotExplorer({ filters, signedIn }: { filters: ExplorerFilters; signedIn: boolean }) {
  return (
    <div className="space-y-20">
      <IdeaSection signedIn={signedIn} />
      <BrowseSection filters={filters} />
    </div>
  );
}

function ErrorLine({ err }: { err: ApiError }) {
  return (
    <div className="mt-4 rounded-2xl border-2 border-green-dark bg-yellow/30 px-5 py-4 text-sm leading-relaxed text-ink">
      <p>{err.error}</p>
      {err.code === "quota" && (
        <a href="#use-no-seu-agente" className="mt-2 inline-block font-bold text-emerald-deep underline underline-offset-2">Ver como gerar seu token</a>
      )}
    </div>
  );
}

function IdeaSection({ signedIn }: { signedIn: boolean }) {
  const [idea, setIdea] = useState("");
  const [result, setResult] = useState<IdeaResult | null>(null);
  const [err, setErr] = useState<ApiError | null>(null);
  const [pending, start] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!signedIn) { openAuthDialog(AUTH_NEXT); return; }
    setErr(null);
    start(async () => {
      const r = await post<IdeaResult>({ mode: "idea", idea });
      if (r.ok) { setResult(r.data); trackClient("copilot_idea_searched", { results: r.data.projects.length }); }
      else { setResult(null); setErr(r.err); if (r.err.code === "unauthenticated") openAuthDialog(AUTH_NEXT); }
    });
  }

  return (
    <section id="valide" className="scroll-mt-28">
      <Reveal tone="texto">
        <SectionHat>Valide antes de codar</SectionHat>
        <h2 className="mt-4 font-heading text-3xl font-black uppercase leading-[0.95] text-ink [font-stretch:115%] sm:text-4xl">Sua ideia, contra 5.400 projetos</h2>
        <p className="mt-3 max-w-2xl text-ink/75">Uma frase basta. Você vê quem já tentou, quão disputada é a área e leva o resultado para o seu agente.</p>
      </Reveal>
      <form onSubmit={submit} className="mt-8 rounded-3xl border-2 border-green-dark bg-surface-raised p-5 shadow-sticker sm:p-7">
        <label htmlFor="idea" className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-deep">Sua ideia em uma frase</label>
        <textarea
          id="idea" value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={300} rows={3} required minLength={8}
          placeholder="Ex.: um app de pagamentos em stablecoin para motoristas de aplicativo"
          className="mt-3 w-full resize-none rounded-xl border-2 border-green-dark/30 bg-surface px-4 py-3 text-base leading-relaxed text-ink outline-none focus:border-green-dark focus:ring-2 focus:ring-emerald/30"
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending || idea.trim().length < 8}
            className="btn-cut inline-flex items-center bg-emerald-deep px-8 py-3.5 text-base font-bold text-surface transition-colors duration-(--dur-instant) ease-entrada hover:bg-green-dark disabled:opacity-60">
            {pending ? "Pesquisando…" : signedIn ? "Ver o que já existe" : "Entrar e pesquisar"}
          </button>
          <span className="text-xs text-muted">{idea.length}/300</span>
          {result && <span className="text-xs text-muted">{result.remaining} pesquisas restantes hoje</span>}
        </div>
        {err && <ErrorLine err={err} />}
      </form>

      {result && (
        <div className="mt-8 space-y-10">
          {result.crowdedness && (
            <Reveal tone="papel">
              <p className="rounded-2xl bg-green-dark px-6 py-4 font-heading text-lg font-bold leading-snug text-surface shadow-sticker">{result.crowdedness}</p>
            </Reveal>
          )}
          <div>
            <Reveal tone="texto"><h3 className="font-heading text-2xl font-black uppercase text-ink [font-stretch:115%]">Projetos parecidos</h3></Reveal>
            {result.projects.length === 0 ? (
              <p className="mt-3 text-ink/75">Nada parecido nos hackathons anteriores. Isso pode ser bom sinal, ou sinal de que ninguém achou um mercado. Leve para o seu agente.</p>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {result.projects.map((c, i) => <Reveal key={c.slug} index={i} tone="papel" className="h-full"><ProjectCardView card={c} /></Reveal>)}
              </div>
            )}
          </div>
          {result.readings.length > 0 && (
            <div>
              <Reveal tone="texto"><h3 className="font-heading text-2xl font-black uppercase text-ink [font-stretch:115%]">Leituras</h3></Reveal>
              <ul className="mt-5 divide-y-2 divide-green-dark/15 rounded-2xl border-2 border-green-dark bg-surface-raised shadow-sticker">
                {result.readings.map((r) => (
                  <li key={r.id} className="px-5 py-4">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-green-dark/70">{r.source}{r.author ? ` · ${r.author}` : ""}{r.publishedAt ? ` · ${r.publishedAt.slice(0, 4)}` : ""}</p>
                    {r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-1 block font-heading font-bold text-ink underline decoration-yellow decoration-2 underline-offset-4">{r.title}</a> : <p className="mt-1 font-heading font-bold text-ink">{r.title}</p>}
                    <p className="mt-1 text-sm text-ink/70">{r.snippet}…</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Reveal tone="papel">
          <div className="-rotate-1 rounded-3xl border-2 border-green-dark bg-yellow p-5 shadow-sticker sm:p-7">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-green-dark/80">Leve para o seu agente</p>
            <p className="mt-2 text-sm text-green-dark">O julgamento de verdade acontece no Claude Code ou Codex com a skill do Copilot. Cole este prompt lá.</p>
            <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-surface-raised p-4 font-mono text-sm leading-relaxed text-ink">{result.prompt}</pre>
            <div className="mt-4 flex flex-wrap gap-3">
              <CopyButton text={result.prompt} label="Copiar prompt" event={{ name: "copilot_prompt_copied" }} />
              <a href="#use-no-seu-agente" className="inline-flex items-center px-2 py-2 text-sm font-bold text-green-dark underline underline-offset-2">Ainda não instalou? Veja como</a>
            </div>
          </div>
          </Reveal>
        </div>
      )}
    </section>
  );
}

function BrowseSection({ filters }: { filters: ExplorerFilters }) {
  const [hackathon, setHackathon] = useState<string | undefined>();
  const [trackKey, setTrackKey] = useState<string | undefined>();
  const [clusterKey, setClusterKey] = useState<string | undefined>();
  const [winnersOnly, setWinnersOnly] = useState(false);
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [err, setErr] = useState<ApiError | null>(null);
  const [pending, start] = useTransition();

  const tracks = filters.tracks.filter((t) => !hackathon || t.hackathonSlug === hackathon).slice(0, 12);

  function load(offset: number, replace: boolean) {
    setErr(null);
    start(async () => {
      const r = await post<{ projects: ProjectCard[]; hasMore: boolean; totalFound: number }>({ mode: "browse", hackathon, trackKey, clusterKey, winnersOnly, offset });
      if (!r.ok) { setErr(r.err); return; }
      setProjects(replace ? r.data.projects : [...projects, ...r.data.projects]);
      setHasMore(r.data.hasMore); setTotal(r.data.totalFound);
      if (replace) trackClient("copilot_browse_filtered", { hackathon, trackKey, clusterKey, winnersOnly });
    });
  }

  return (
    <section id="explore" className="scroll-mt-28">
      <Reveal tone="texto">
        <SectionHat>Explore</SectionHat>
        <h2 className="mt-4 font-heading text-3xl font-black uppercase leading-[0.95] text-ink [font-stretch:115%] sm:text-4xl">O que já foi construído</h2>
        <p className="mt-3 max-w-2xl text-ink/75">5.400 projetos de cinco hackathons do Colosseum. Filtre e veja quem venceu, o que construíram e onde estão os links.</p>
      </Reveal>
      <div className="mt-6 flex flex-wrap gap-2">
        {filters.hackathons.map((h) => (
          <button key={h.slug} type="button" className={chip(hackathon === h.slug)} onClick={() => { setHackathon(hackathon === h.slug ? undefined : h.slug); setTrackKey(undefined); }}>{h.name}</button>
        ))}
        <button type="button" className={chip(winnersOnly)} onClick={() => setWinnersOnly(!winnersOnly)}>Só vencedores</button>
      </div>
      {hackathon && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tracks.map((t) => (
            <button key={t.key} type="button" className={chip(trackKey === t.key)} onClick={() => setTrackKey(trackKey === t.key ? undefined : t.key)}>{t.name}</button>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {filters.clusters.slice(0, 10).map((c) => (
          <button key={c.key} type="button" className={chip(clusterKey === c.key)} onClick={() => setClusterKey(clusterKey === c.key ? undefined : c.key)}>{c.label}</button>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-4">
        <button type="button" onClick={() => load(0, true)} disabled={pending}
          className="btn-cut inline-flex items-center bg-yellow px-7 py-3 text-sm font-bold text-green-dark transition-colors duration-(--dur-instant) ease-entrada hover:bg-yellow-strong disabled:opacity-60">
          {pending && projects.length === 0 ? "Buscando…" : "Buscar"}
        </button>
        {total !== null && <span className="text-sm text-muted">{total} projetos</span>}
      </div>
      {err && <ErrorLine err={err} />}
      {projects.length > 0 && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((c, i) => <Reveal key={c.slug} index={i % 12} tone="papel" className="h-full"><ProjectCardView card={c} /></Reveal>)}
          </div>
          {hasMore && (
            <button type="button" onClick={() => load(projects.length, false)} disabled={pending}
              className="btn-cut btn-cut-outline mt-6 inline-flex items-center px-7 py-3 text-sm font-bold text-ink transition-colors duration-(--dur-instant) ease-entrada hover:text-surface [--btn-cut-fill:var(--color-surface-raised)]">
              {pending ? "Carregando…" : "Carregar mais"}
            </button>
          )}
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Typecheck, lint, commit**

```bash
npx tsc --noEmit -p . && npx eslint 'src/app/(public)/guias/copilot'
git add 'src/app/(public)/guias/copilot/explorer.tsx'
git commit -m "feat: Copilot explorer island, idea search and browse"
```

---

### Task 8: The page and the guide

**Files:**
- Create: `src/app/(public)/guias/copilot/page.tsx`
- Modify: `src/components/layout/footer.tsx:22-28`
- Test: `src/lib/__tests__/routes.test.ts` (one assertion)

- [ ] **Step 1: Routes test**

Add to `src/lib/__tests__/routes.test.ts` inside the existing describe:
```ts
it("the Copilot guide is public", () => {
  expect(isPublicRoute("/guias/copilot")).toBe(true);
});
```
Run `npx vitest run src/lib/__tests__/routes.test.ts`; it passes already because `/guias` is a public prefix. Keep it as the regression guard.

- [ ] **Step 2: Page**

```tsx
// src/app/(public)/guias/copilot/page.tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowUpRightIcon, WhatsappLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { CopyButton } from "@/components/ui/copy-button";
import { Reveal } from "@/components/ui/reveal";
import { SectionHat } from "@/components/ui/section-hat";
import { TrackedCta } from "@/components/ui/tracked-cta";
import { withPlatformUtm } from "@/lib/attribution";
import { WHATSAPP_COMMUNITY_URL } from "@/app/(public)/pre-registro/constants";
import { getFilters } from "@/lib/copilot/client";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { CopilotExplorer, type ExplorerFilters } from "./explorer";

export const metadata: Metadata = {
  title: "Colosseum Copilot: valide sua ideia antes de construir",
  description: "Pesquise 5.400 projetos de hackathons anteriores, veja quão disputada é a sua área e leve a ideia para o Claude Code ou Codex com a skill do Colosseum Copilot. Guia em português.",
  openGraph: { title: "Colosseum Copilot · Guia da Superteam Brasil", description: "Saiba o que já foi construído antes de começar. Pesquisa gratuita, guia de instalação e prompts em português." },
};

const ARENA_TOKEN_URL = withPlatformUtm("https://colosseum.com/arena/copilot", { content: "guia_copilot_token" });
const DOCS_URL = withPlatformUtm("https://docs.colosseum.com/copilot", { content: "guia_copilot_docs" });
const SECTION = "px-4 pt-24 sm:px-6 lg:pt-28 xl:pt-32";
const ENV_SNIPPET = `export COLOSSEUM_COPILOT_API_BASE="https://copilot.colosseum.com/api/v1"\nexport COLOSSEUM_COPILOT_PAT="cole-seu-token-aqui"`;
const INSTALL = [
  { agent: "Claude Code", cmd: "npx skills add ColosseumOrg/colosseum-copilot" },
  { agent: "Codex", cmd: "npx skills add ColosseumOrg/colosseum-copilot -a codex" },
  { agent: "OpenClaw", cmd: "npx skills add ColosseumOrg/colosseum-copilot -a openclaw" },
];
const VERIFY = `curl "$COLOSSEUM_COPILOT_API_BASE/status" -H "Authorization: Bearer $COLOSSEUM_COPILOT_PAT"`;
const PROMPTS = [
  "Quero construir pagamentos em stablecoin para agentes de IA na Solana. Quem já fez isso nos hackathons do Colosseum e o que deu errado?",
  "Compare os projetos vencedores de DeFi do Breakout e do Cypherpunk. O que os vencedores tinham em comum?",
  "Existe espaço para um app de consumo de privacidade na Solana? Liste os concorrentes vivos e os que morreram.",
  "Quais projetos de DePIN passaram para o acelerador? O que os diferenciou dos que não passaram?",
  "Estou pensando em um marketplace B2B com liquidação em stablecoin. Vale a pena? Seja honesto.",
];

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald underline decoration-2 underline-offset-4 hover:text-green-dark">{children}</a>;
}

function Code({ code, label }: { code: string; label: string }) {
  return (
    <div className="mt-3 flex flex-col gap-3 rounded-2xl border-2 border-green-dark bg-green-dark p-4 sm:flex-row sm:items-start sm:justify-between">
      <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap font-mono text-sm leading-relaxed text-surface">{code}</pre>
      <CopyButton text={code} label="Copiar" event={{ name: "copilot_install_copied", properties: { label } }}
        className="btn-cut inline-flex shrink-0 items-center gap-2 bg-yellow px-4 py-2 text-sm font-bold text-green-dark transition-colors duration-(--dur-instant) ease-entrada hover:bg-yellow-strong" />
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <Reveal index={n} tone="papel">
      <div className={`card-cut mt-6 flex flex-col p-5 sm:p-6 ${n === 1 ? "" : "card-cut-kraft card-cut-open"}`}>
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-ink/75">Passo {String(n).padStart(2, "0")}</p>
        <h3 className="mt-3 font-heading text-xl font-black leading-snug text-ink [font-stretch:110%] sm:text-2xl">{title}</h3>
        <div className="mt-3 leading-relaxed text-ink/85">{children}</div>
      </div>
    </Reveal>
  );
}

export default async function CopilotGuidePage() {
  const [filters, state] = await Promise.all([
    getFilters().catch(() => null),
    resolveAuthenticatedUserState().catch(() => null),
  ]);
  const explorerFilters: ExplorerFilters = filters
    ? {
        hackathons: filters.hackathons.map((h) => ({ slug: h.slug, name: h.name, projectCount: h.projectCount })),
        tracks: filters.tracks.map((t) => ({ key: t.key, name: t.name, hackathonSlug: t.hackathonSlug })),
        clusters: filters.clusters.map((c) => ({ key: c.key, label: c.label, projectCount: c.projectCount })),
      }
    : { hackathons: [], tracks: [], clusters: [] };

  return (
    <div>
      <section className="px-4 pt-10 sm:px-6 sm:pt-14">
        <div className="mx-auto max-w-4xl">
          <Reveal tone="texto">
          <SectionHat>Guia · Colosseum Copilot</SectionHat>
          <h1 className="mt-4 font-heading font-black uppercase leading-[0.95] tracking-tight text-ink">
            <span className="block text-5xl [font-stretch:120%] sm:text-7xl">Saiba o que já existe</span>
            <span className="mt-3 inline-block -rotate-1 border-2 border-green-dark bg-yellow px-4 py-1.5 text-3xl text-green-dark shadow-sticker [font-stretch:110%] sm:text-5xl">antes de construir</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/80">
            O Colosseum Copilot pesquisa 5.400 projetos dos hackathons anteriores, 65 fontes de pesquisa e 6.300 produtos vivos.
            Escreva sua ideia, veja quem já tentou e quão disputada é a área. Depois, leve para o seu agente de código e peça uma avaliação honesta.
          </p>
          </Reveal>
        </div>
      </section>

      <section className={SECTION}>
        <div className="mx-auto max-w-4xl">
          {filters ? (
            <CopilotExplorer filters={explorerFilters} signedIn={Boolean(state)} />
          ) : (
            <p className="rounded-2xl border-2 border-green-dark bg-yellow/30 px-5 py-4 text-ink">A pesquisa está indisponível agora. O guia abaixo continua valendo.</p>
          )}
        </div>
      </section>

      <section id="use-no-seu-agente" className={`scroll-mt-28 ${SECTION}`}>
        <div className="mx-auto max-w-4xl">
          <Reveal tone="texto">
            <SectionHat>Use no seu agente</SectionHat>
            <h2 className="mt-4 font-heading text-3xl font-black uppercase leading-[0.95] text-ink [font-stretch:115%] sm:text-4xl">Cinco minutos de setup</h2>
            <p className="mt-3 max-w-2xl text-ink/75">
              A pesquisa aqui é uma amostra. A ferramenta completa roda dentro do Claude Code, do Codex ou do OpenClaw, com o seu próprio token e sem limite nosso.
            </p>
          </Reveal>

          <Step n={1} title="Crie sua conta no Colosseum e gere o token">
            <p>Entre no <Ext href={ARENA_TOKEN_URL}>Colosseum Arena</Ext> e clique em <strong>Generate your token</strong>. O token aparece uma vez só, copie na hora. Vale 90 dias, e é a mesma conta onde você se inscreve no hackathon.</p>
          </Step>

          <Step n={2} title="Exporte as variáveis no terminal">
            <p>Cole no seu <code>.zshrc</code> ou <code>.bashrc</code>, trocando pelo seu token:</p>
            <Code code={ENV_SNIPPET} label="env" />
          </Step>

          <Step n={3} title="Instale a skill">
            {INSTALL.map((i) => (
              <div key={i.agent} className="mt-4">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-green-dark/80">{i.agent}</p>
                <Code code={i.cmd} label={i.agent} />
              </div>
            ))}
          </Step>

          <Step n={4} title="Verifique a conexão">
            <Code code={VERIFY} label="verify" />
            <p className="mt-3 text-sm text-ink/70">A resposta deve trazer <code>&quot;authenticated&quot;: true</code>.</p>
          </Step>

          <Step n={5} title="Pergunte em português">
            <p>A skill entende português. Alguns prompts para começar:</p>
            <ul className="mt-4 space-y-3">
              {PROMPTS.map((p) => (
                <li key={p} className="flex flex-col gap-3 rounded-2xl border-2 border-green-dark bg-surface-raised p-4 shadow-sticker sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm leading-relaxed text-ink">{p}</span>
                  <CopyButton text={p} label="Copiar" event={{ name: "copilot_prompt_copied", properties: { preset: true } }} />
                </li>
              ))}
            </ul>
          </Step>

          <Reveal tone="papel">
          <div className="mt-12 rounded-2xl border-2 border-green-dark bg-green px-6 py-5 text-surface shadow-sticker">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-yellow">O que o Copilot faz e não faz</p>
            <p className="mt-2 leading-relaxed">Ele pesquisa: projetos, fontes, dados do ecossistema. Ele não julga por você. Quem avalia é o seu agente, com as evidências que o Copilot traz, e quem decide é você. Documentação completa em <Ext href={DOCS_URL}>docs.colosseum.com/copilot</Ext> <ArrowUpRightIcon className="inline" size={14} weight="bold" aria-hidden />.</p>
          </div>
          </Reveal>
        </div>
      </section>

      <section className={SECTION}>
        <div className="mx-auto max-w-4xl">
          <Reveal tone="papel">
          <div className="rounded-3xl border-2 border-green-dark bg-surface-raised p-6 text-center shadow-sticker sm:p-8">
            <SectionHat centered>Travou em algum passo?</SectionHat>
            <p className="mx-auto mt-3 max-w-xl text-ink/80">O grupo do WhatsApp da Superteam Brasil responde rápido, e é onde saem os workshops de IA e vibe coding.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <TrackedCta href={WHATSAPP_COMMUNITY_URL} event="campaign_link_clicked" properties={{ target: "whatsapp", location: "guia_copilot" }}
                className="btn-cut inline-flex items-center gap-2.5 bg-emerald-deep px-8 py-3.5 text-base font-bold text-surface transition-colors duration-(--dur-instant) ease-entrada hover:bg-green-dark">
                <WhatsappLogoIcon aria-hidden size={18} weight="bold" /><span>Entrar no grupo</span>
              </TrackedCta>
              <a href="#valide" className="btn-cut btn-cut-outline inline-flex items-center px-6 py-3 text-sm font-bold text-ink transition-colors duration-(--dur-instant) ease-entrada hover:text-surface [--btn-cut-fill:var(--color-surface-raised)]">Pesquisar outra ideia</a>
            </div>
          </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Footer link**

In `src/components/layout/footer.tsx`, in the "Superteam" column after the Pix guide:
```ts
{ label: "Guia: Colosseum Copilot", href: "/guias/copilot" },
```

- [ ] **Step 4: Verify locally**

```bash
npx tsc --noEmit -p . && npx eslint 'src/app/(public)/guias/copilot' src/components/layout/footer.tsx && npm test
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/guias/copilot
curl -s http://localhost:3000/guias/copilot | grep -oE 'Saiba o que já existe|Use no seu agente|Explore o que já foi construído|npx skills add' | sort | uniq -c
```
Expected: 200, and all four strings present. Then in the browser: signed out, type an idea, press the button, the login dialog opens; sign in, search, cards and the crowdedness line render; browse Radar with "Só vencedores", "Carregar mais" appends; the three copy buttons copy.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(public)/guias/copilot/page.tsx' src/components/layout/footer.tsx src/lib/__tests__/routes.test.ts
git commit -m "feat: /guias/copilot page with idea search, browse and the setup guide"
```

---

### Task 9: Production config and PR

- [ ] **Step 1: Token on Vercel**

Generate a fresh token from the STBR Colosseum account (the ones pasted in chat on 2026-09-22 must be regenerated first) and add `COLOSSEUM_COPILOT_PAT` to the Vercel project, Production and Preview. Nothing in git.

- [ ] **Step 2: Build, push, PR**

```bash
npm run build
git push -u origin feat/copilot-page
gh pr create --base main --title "Colosseum Copilot guide with idea search and browse" --body "$(cat <<'EOF'
New public page /guias/copilot: type an idea and see the closest past Colosseum projects, how crowded the cluster is, three readings and a prompt to carry into Claude Code / Codex; browse 5,400 past projects by hackathon, track, cluster and winners; a pt-BR setup guide for the Copilot skill. Footer link next to the Pix guide.

Server side: one client module for copilot.colosseum.com behind unstable_cache (filters/clusters 24 h, searches 1 h), a two-slot semaphore, 10 s timeout and 429 → Retry-After mapping. Idea searches need a session and are capped at 20 per 24 h per user in the new service-role-only table copilot_queries (migration 00065, applied); over the cap the message hands off to the guide. Browse is public and fully cached.

Needs COLOSSEUM_COPILOT_PAT on Vercel (STBR partner account). Search degrades to a notice when it is missing; the guide always renders.

Spec: docs/superpowers/specs/2026-09-22-copilot-page-design.md
EOF
)"
```

---

## Self-review

Audit 2026-09-22 (two independent reviewers, correctness and design) folded in: `withPlatformUtm` on the Colosseum links; `SectionHat` lifted to a shared component; every section and result block wrapped in `Reveal`; LP section rhythm and hat → h2 → p lead-ins; yellow sticker highlight in the hero; guide steps in `card-cut` shells (JourneyPin/StepNumeral judged unfit: the pin is hardwired to three cards and scroll math); pre-registro focus ring on the textarea; a closing card so the page does not just stop. No blockers were found in the client, quota, route, migration or tests.

- Spec coverage: idea box with projects, crowdedness, readings, prompt (T5, T7); browse with chips and load more (T7); guide steps 1–6 (T8); cache and semaphore (T2, T3); token in env only (T3, T9); session gate and 20/day cap with hand-off copy (T4, T5, T7); footer link (T8); analytics events (T6, T7, T8); error copy for cap, rate limit, down, signed out (T5, T7); public route (T8 test); migration via MCP (T4).
- Placeholders: none.
- Names: `ProjectCard`, `Reading`, `ExplorerFilters`, `parseSearchRequest`, `CopilotRateLimited.retryAfterSeconds`, `IDEA_DAILY_CAP`, `ideaSearchesLast24h`, `recordIdeaSearch`, `agentPrompt`, `crowdednessLine` consistent across T1–T8. The `filter` object in `searchProjects` matches the upstream request shape (`winnersOnly`, `clusterKeys` inside `filter`; `hackathons`, `trackKeys` top-level).
