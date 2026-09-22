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
