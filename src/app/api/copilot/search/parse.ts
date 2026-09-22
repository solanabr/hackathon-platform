import { normalizeIdea } from "@/lib/copilot/helpers";
import type { ApiFilters } from "@/lib/copilot/types";

export type IdeaRequest = { mode: "idea"; idea: string };
export type BrowseRequest = { mode: "browse"; hackathon?: string; trackKey?: string; clusterKey?: string; winnersOnly?: boolean; offset?: number };

type Catalog = Pick<ApiFilters, "hackathons" | "tracks" | "clusters">;

export function keepKnownKeys(parsed: BrowseRequest, catalog: Catalog): BrowseRequest {
  const hackathon = parsed.hackathon && catalog.hackathons.some((h) => h.slug === parsed.hackathon) ? parsed.hackathon : undefined;
  const trackKey = parsed.trackKey && catalog.tracks.some((t) => t.key === parsed.trackKey) ? parsed.trackKey : undefined;
  const clusterKey = parsed.clusterKey && catalog.clusters.some((c) => c.key === parsed.clusterKey) ? parsed.clusterKey : undefined;
  return { ...parsed, hackathon, trackKey, clusterKey };
}

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
