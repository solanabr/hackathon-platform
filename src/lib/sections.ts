import { createServerSupabaseClient } from "./supabase/server";
import type { HackathonSection } from "@/types/db";

/** Visible sections of an edition page, in render order. RLS already hides
 *  invisible and soft-deleted rows from this client. */
export async function listSections(hackathonId: string): Promise<HackathonSection[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("hackathon_sections")
    .select("*")
    .eq("hackathon_id", hackathonId)
    .order("position", { ascending: true });
  return (data as HackathonSection[] | null) ?? [];
}
