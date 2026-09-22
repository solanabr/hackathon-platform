import { createServiceRoleClient } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/supabase/unwrap";

export const IDEA_DAILY_CAP = 20;

export type IdeaClaim = { id: string; remaining: number } | "cap" | null;

// The RPC counts and inserts under a per-user lock, so the cap holds under
// concurrency. null means the database failed: the caller must answer
// unavailable, never open the gate.
export async function claimIdeaSearch(userId: string): Promise<IdeaClaim> {
  const supabase = await createServiceRoleClient();
  const { data, error } = await supabase
    .rpc("claim_copilot_idea_search", { p_user_id: userId, p_cap: IDEA_DAILY_CAP })
    .maybeSingle();
  if (error) { logQueryError("copilot.quota.claim", error); return null; }
  const row = data as { id: string | null; remaining: number } | null;
  if (!row) return null;
  return row.id ? { id: row.id, remaining: row.remaining } : "cap";
}

// An upstream failure must not cost the user one of the twenty.
export async function refundIdeaSearch(id: string): Promise<void> {
  const supabase = await createServiceRoleClient();
  const { error } = await supabase.from("copilot_queries").delete().eq("id", id);
  if (error) logQueryError("copilot.quota.refund", error);
}
