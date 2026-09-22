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
