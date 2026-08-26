import { cache } from "react";
import { unstable_cache } from "next/cache";
import { publicStorageUrl } from "@/lib/storage";
import { createAnonClient } from "./supabase/anon";
import { sponsorsTag } from "./cache-tags";
import { logQueryError } from "./supabase/unwrap";
import type { HackathonSponsor, SponsorTier } from "@/types/db";

export type SponsorLogo = {
  id: string;
  tier: SponsorTier;
  name: string | null;
  url: string | null;
  src: string;
};

export const TIER_LABEL: Record<SponsorTier, string> = {
  realizacao: "Realização",
  apoiador: "Apoiadores",
};

/**
 * image_path is either a '/'-prefixed path to a file shipped in /public or a
 * key in the sponsor-logos bucket, matching how cover_image_path works.
 */
export function resolveSponsors(rows: HackathonSponsor[]): SponsorLogo[] {
  return rows.map((r) => ({
    id: r.id,
    tier: r.tier,
    name: r.name,
    url: r.url,
    src: publicStorageUrl("sponsor-logos", r.image_path),
  }));
}

// Viewer-independent public data — shared cache, anon client, tag-invalidated
// by the sponsors admin actions. Errors throw so a transient failure is never
// cached as an empty band.
export const listSponsors = cache((hackathonId: string): Promise<SponsorLogo[]> =>
  unstable_cache(
    async () => {
      const supabase = createAnonClient();
      const { data, error } = await supabase
        .from("hackathon_sponsors")
        .select("*")
        .eq("hackathon_id", hackathonId)
        .order("tier", { ascending: true })
        .order("position", { ascending: true });
      if (error) {
        logQueryError("sponsors.listSponsors", error);
        throw new Error("sponsors.listSponsors failed");
      }
      return resolveSponsors((data as HackathonSponsor[] | null) ?? []);
    },
    ["sponsors", hackathonId],
    { tags: [sponsorsTag(hackathonId)], revalidate: 300 },
  )(),
);

export function groupByTier(sponsors: SponsorLogo[]): Record<SponsorTier, SponsorLogo[]> {
  return {
    realizacao: sponsors.filter((s) => s.tier === "realizacao"),
    apoiador: sponsors.filter((s) => s.tier === "apoiador"),
  };
}
