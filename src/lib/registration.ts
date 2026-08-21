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