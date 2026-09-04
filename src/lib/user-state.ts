import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createServerSupabaseClient } from "./supabase/server";
import { logQueryError } from "./supabase/unwrap";
import { DEFAULT_AUTH_NEXT, pickAuthNext } from "./auth-next";
import { editionStage } from "./hackathon";
import type { Hackathon, User } from "@/types/db";

export type AuthenticatedState = {
  userId: string;
  email: string;
  profile: User | null;
};

/**
 * Painel of the newest live hackathon among `hackathonIds`, or null when none
 * of them is live. Live means the edition has left draft and has not finished.
 * With `preferOpenWindow` (the registration fallback), an edition whose
 * submission window is still open wins over one that already closed — a
 * teamless registrant landing on a closed window would get a dead dashboard
 * ("Submissão encerrada" and a "Criar time" CTA that can no longer be used).
 */
function latestLiveDashboard(
  hackathons: Hackathon[],
  hackathonIds: Set<string>,
  preferOpenWindow = false,
): string | null {
  const live = hackathons.filter(
    (h) => hackathonIds.has(h.id) && h.status !== "draft" && editionStage(h) !== "finished",
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
 * no team yet — so a registered participant is never stranded on the hub. The
 * registration fallback prefers editions with an open submission window over
 * ones that already closed.
 */
const liveDashboardPath = cache(async (userId: string): Promise<string> => {
  const supabase = await createServerSupabaseClient();

  const [
    { data: memberships, error: membershipsError },
    { data: registrations, error: registrationsError },
  ] = await Promise.all([
    supabase
      .from("team_members")
      .select("hackathon_id")
      .eq("user_id", userId)
      .eq("status", "accepted"),
    supabase.from("hackathon_registrations").select("hackathon_id").eq("user_id", userId),
  ]);
  if (membershipsError) logQueryError("userState.liveDashboardPath.memberships", membershipsError);
  if (registrationsError)
    logQueryError("userState.liveDashboardPath.registrations", registrationsError);

  const membershipIds = new Set(
    ((memberships as { hackathon_id: string }[] | null) ?? []).map((m) => m.hackathon_id),
  );
  const registrationIds = new Set(
    ((registrations as { hackathon_id: string }[] | null) ?? []).map((r) => r.hackathon_id),
  );

  const allIds = [...new Set([...membershipIds, ...registrationIds])];
  if (allIds.length === 0) return DEFAULT_AUTH_NEXT;

  const { data: hackathons, error: hackathonsError } = await supabase
    .from("hackathons")
    .select("id, slug, status, starts_at, submission_deadline_at, presential_at, voting_closes_at")
    .in("id", allIds);
  if (hackathonsError) logQueryError("userState.liveDashboardPath.hackathons", hackathonsError);

  const rows = (hackathons as Hackathon[] | null) ?? [];
  return (
    latestLiveDashboard(rows, membershipIds) ??
    latestLiveDashboard(rows, registrationIds, true) ??
    DEFAULT_AUTH_NEXT
  );
});

/**
 * Where a signed-in visitor lands when the auth flow has no deep link to
 * return to. Only /auth and the OAuth callback pay for this lookup — the
 * header and page gates never need it.
 */
export async function defaultAuthRedirect(state: AuthenticatedState): Promise<string> {
  if (!state.profile?.full_name) return "/account";
  return liveDashboardPath(state.userId);
}

// Header, gates, and pages all call this per request; one auth+profile read.
export const resolveAuthenticatedUserState = cache(async (): Promise<AuthenticatedState | null> => {
  const supabase = await createServerSupabaseClient();
  // Local JWT verification against the cached JWKS — no Auth API round-trip.
  const { data } = await supabase.auth.getClaims();
  // email stays asserted like the old user.email! — gating on it would turn a
  // valid session with no email claim into a silent logout.
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", claims.sub)
    .maybeSingle();
  if (profileError) logQueryError("userState.resolveAuthenticatedUserState.profile", profileError);

  return {
    userId: claims.sub,
    email: claims.email as string,
    profile: profile as User | null,
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
    const next = path && path !== "/" ? pickAuthNext(path) : null;
    redirect(next ? `/auth?next=${encodeURIComponent(next)}` : "/auth");
  }
  return state;
}
