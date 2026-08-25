import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createServerSupabaseClient } from "./supabase/server";
import { sanitizeRedirect } from "./security";
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
  // Only confirmed memberships route to the dashboard. A pending member has
  // never confirmed registration, so they'd land on the dashboard, get bounced
  // to /register, and hit the landing's disabled CTA once registration closes.
  const { data: memberships } = await supabase
    .from("team_members")
    .select("hackathon_id")
    .eq("user_id", userId)
    .eq("status", "accepted");

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

/**
 * Gate for gated pages and server actions. Logged-out callers go to `/auth`
 * carrying the page they were on, so the OAuth/OTP round trip lands them back
 * on the same deep link instead of the home gallery. The path comes from
 * headers that middleware attaches, so callers do not have to know their URL.
 */
export async function requireUser() {
  const state = await resolveAuthenticatedUserState();
  if (!state) {
    const h = await headers();
    const path = `${h.get("x-pathname") ?? ""}${h.get("x-search") ?? ""}`;
    const next = path && path !== "/" ? sanitizeRedirect(path) : null;
    redirect(next ? `/auth?next=${encodeURIComponent(next)}` : "/auth");
  }
  return state;
}
