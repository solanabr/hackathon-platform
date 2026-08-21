import { createServerSupabaseClient } from "./supabase/server";
import type { HackathonRegistration, User } from "@/types/db";

export async function getRegistration(
  userId: string,
  hackathonId: string,
): Promise<HackathonRegistration | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("hackathon_registrations")
    .select("*")
    .eq("user_id", userId)
    .eq("hackathon_id", hackathonId)
    .maybeSingle();
  return data as HackathonRegistration | null;
}

export function isProfileComplete(profile: User | null): boolean {
  return Boolean(profile?.full_name && profile.full_name.trim().length > 0);
}

export function isRegistrationComplete(reg: HackathonRegistration | null): boolean {
  return Boolean(reg?.luma_confirmed_at && reg.terms_accepted_at);
}
export async function confirmedMemberIds(
  hackathonId: string,
  memberIds: string[],
): Promise<Set<string>> {
  if (memberIds.length === 0) return new Set();
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("hackathon_registrations")
    .select("user_id, luma_confirmed_at")
    .eq("hackathon_id", hackathonId)
    .in("user_id", memberIds);

  return new Set(
    ((data as { user_id: string; luma_confirmed_at: string | null }[] | null) ?? [])
      .filter((r) => r.luma_confirmed_at)
      .map((r) => r.user_id),
  );
}

/**
 * Mirrors the `members_missing_luma` count inside `submit_team`: only accepted
 * members block a submission, and a member with no registration row at all
 * counts as unconfirmed.
 */
export function membersPendingRegistration<T extends { user_id: string | null; status: string }>(
  members: T[],
  confirmed: Set<string>,
): T[] {
  return members.filter(
    (m) => m.status === "accepted" && !(m.user_id && confirmed.has(m.user_id)),
  );
}
