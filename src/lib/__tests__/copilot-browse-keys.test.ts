import { describe, it, expect } from "vitest";
import { keepKnownKeys, type BrowseRequest } from "@/app/api/copilot/search/parse";
import type { ApiFilters } from "@/lib/copilot/types";

const catalog: Pick<ApiFilters, "hackathons" | "tracks" | "clusters"> = {
  hackathons: [{ slug: "radar", name: "Radar", startDate: "2025-01-01", projectCount: 1, winnerCount: 1 }],
  tracks: [{ key: "defi", name: "DeFi", hackathonSlug: "radar", projectCount: 1 }],
  clusters: [{ key: "payments", label: "Payments", projectCount: 1 }],
};

const base: BrowseRequest = { mode: "browse", offset: 0 };

describe("keepKnownKeys", () => {
  it("keeps keys that exist in the catalog", () => {
    expect(keepKnownKeys({ ...base, hackathon: "radar", trackKey: "defi", clusterKey: "payments" }, catalog))
      .toEqual({ mode: "browse", offset: 0, hackathon: "radar", trackKey: "defi", clusterKey: "payments" });
  });

  it("drops keys that are not in the catalog", () => {
    expect(keepKnownKeys({ ...base, hackathon: "nope-nope", trackKey: "bad", clusterKey: "bad" }, catalog))
      .toEqual({ mode: "browse", offset: 0, hackathon: undefined, trackKey: undefined, clusterKey: undefined });
  });

  it("passes undefined through unchanged", () => {
    expect(keepKnownKeys(base, catalog)).toEqual({ mode: "browse", offset: 0, hackathon: undefined, trackKey: undefined, clusterKey: undefined });
  });
});
