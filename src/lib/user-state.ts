import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
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
 * Painel of the newest live hackathon among `hackathonIds`, or null when none
 * of them is live. Live means the edition has left draft and has not finished.
 * With `preferOpenWindow` (the registration fallback), an edition whose
 * submission window is still open wins over one that already closed — a
 * teamless registrant landing on a closed window would get a dead dashboard
 * ("Submissão encerrada" and a "Criar time" CTA that can no longer be used).
 */
async function latestLiveDashboard(
  supabase: SupabaseClient,
  hackathonIds: string[],
  preferOpenWindow = false,
): Promise<string | null> {
  if (hackathonIds.length === 0) return null;

  const { data: hackathons } = await supabase
    .from("hackathons")
    .select("slug, status, starts_at, submission_deadline_at, presential_at, voting_closes_at")
    .in("id", hackathonIds);

  const live = ((hackathons as Hackathon[] | null) ?? []).filter(
    (h) => h.status !== "draft" && editionStage(h) !== "finished",
  );
  if (live.length === 0) return null;

  let pool = live;
  if (preferOpenWindow) {
    const open = live.filter(
      (h) => new Date(h.submission_deadline_at).getTime() > Date.now(),
    );
    if (open.length > 0) pool = open;
  }

  const target = pool.sort(
    (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
  )[0];
  return `/h/${target.slug}/dashboard`;
}

/**
 * The header and every gated page resolve this state on each render, so the
 * membership lookup must be deduped per request.
 *
 * Precedence for the painel path: an accepted membership in a live edition
 * wins; otherwise the newest live edition the user registered for — even with
 * no team yet — so a registered participant is never stranded on `/`. The
 * registration fallback prefers editions with an open submission window over
 * ones that already closed.
 */
const liveDashboardPath = cache(async (userId: string): Promise<string> => {
  const supabase = await createServerSupabaseClient();

  const { data: memberships } = await supabase
    .from("team_members")
    .select("hackathon_id")
    .eq("user_id", userId)
    .eq("status", "accepted");

  const membershipIds = Array.from(
    new Set(((memberships as { hackathon_id: string }[] | null) ?? []).map((m) => m.hackathon_id)),
  );

  const fromMembership = await latestLiveDashboard(supabase, membershipIds);
  if (fromMembership) return fromMembership;

  const { data: registrations } = await supabase
    .from("hackathon_registrations")
    .select("hackathon_id")
    .eq("user_id", userId);

  const registrationIds = Array.from(
    new Set(((registrations as { hackathon_id: string }[] | null) ?? []).map((r) => r.hackathon_id)),
  );

  const fromRegistration = await latestLiveDashboard(supabase, registrationIds, true);
  if (fromRegistration) return fromRegistration;

  return "/";
});

// Header, gates, and pages all call this per request; one auth+profile read.
export const resolveAuthenticatedUserState = cache(async (): Promise<AuthenticatedState | null> => {
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
});

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
