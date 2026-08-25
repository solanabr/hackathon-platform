import { redirect } from "next/navigation";
import { cache } from "react";
import { createServerSupabaseClient } from "./supabase/server";
import { editionStage } from "./hackathon";
import type { Hackathon, User } from "@/types/db";

export type AuthenticatedState = {
  userId: string;
  email: string;
  profile: User | null;
  redirectPath: string;
};

/**
 * The header and every gated page resolve this state on each render, so the
 * membership lookup must be deduped per request.
 */
const liveDashboardPath = cache(async (userId: string): Promise<string> => {
  const supabase = await createServerSupabaseClient();
  const { data: memberships } = await supabase
    .from("team_members")
    .select("hackathon_id")
    .eq("user_id", userId)
    .in("status", ["pending", "accepted"]);

  const hackathonIds = Array.from(
    new Set(((memberships as { hackathon_id: string }[] | null) ?? []).map((m) => m.hackathon_id)),
  );
  if (hackathonIds.length === 0) return "/";

  const { data: hackathons } = await supabase
    .from("hackathons")
    .select("slug, status, starts_at, submission_deadline_at, presential_at, voting_closes_at")
    .in("id", hackathonIds);

  const live = ((hackathons as Hackathon[] | null) ?? []).filter(
    (h) => h.status !== "draft" && editionStage(h) !== "finished",
  );
  if (live.length === 0) return "/";
  const target = live.sort(
    (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
  )[0];
  return `/h/${target.slug}/dashboard`;
});

export async function resolveAuthenticatedUserState(): Promise<AuthenticatedState | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const typed = profile as User | null;
  const needsProfile = !typed?.full_name;

  return {
    userId: user.id,
    email: user.email!,
    profile: typed,
    redirectPath: needsProfile ? "/account" : await liveDashboardPath(user.id),
  };
}

export async function requireUser() {
  const state = await resolveAuthenticatedUserState();
  if (!state) redirect("/auth");
  return state;
}
