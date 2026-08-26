import { cache } from "react";
import { publicStorageUrl } from "@/lib/storage";
import { createServerSupabaseClient } from "./supabase/server";
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
export async function resolveSponsors(rows: HackathonSponsor[]): Promise<SponsorLogo[]> {
  const supabase = await createServerSupabaseClient();
  return rows.map((r) => ({
    id: r.id,
    tier: r.tier,
    name: r.name,
    url: r.url,
    src: publicStorageUrl("sponsor-logos", r.image_path),
  }));
}

export const listSponsors = cache(async (hackathonId: string): Promise<SponsorLogo[]> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("hackathon_sponsors")
    .select("*")
    .eq("hackathon_id", hackathonId)
    .order("tier", { ascending: true })
    .order("position", { ascending: true });
  // Public band: degrade to no logos, not an error banner.
  if (error) logQueryError("sponsors.listSponsors", error);
  return resolveSponsors((data as HackathonSponsor[] | null) ?? []);
});

export function groupByTier(sponsors: SponsorLogo[]): Record<SponsorTier, SponsorLogo[]> {
  return {
    realizacao: sponsors.filter((s) => s.tier === "realizacao"),
    apoiador: sponsors.filter((s) => s.tier === "apoiador"),
  };
}
