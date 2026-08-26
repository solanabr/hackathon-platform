import { cache } from "react";
import { resolveAuthenticatedUserState, type AuthenticatedState } from "./user-state";
import { getHackathonBySlug } from "./hackathon";
import { createServiceRoleClient } from "./supabase/server";
import { unwrap } from "./supabase/unwrap";
import type { Hackathon, PlatformRole } from "@/types/db";

type RoleCheck =
  | { ok: true; state: AuthenticatedState }
  | { ok: false; reason: "unauthenticated" | "forbidden" };

type EditionCheck =
  | { ok: true; state: AuthenticatedState; hackathon: Hackathon }
  | { ok: false; reason: "unauthenticated" | "forbidden" };

export function resolveRoles(
  rows: PlatformRole[],
  email: string | null,
): { isAdmin: boolean; adminFor: string[]; judgeFor: string[] } {
  if (!email) return { isAdmin: false, adminFor: [], judgeFor: [] };
  // A null hackathon_id makes the admin global; a scoped row makes the user
  // an organizer of that one edition.
  const isAdmin = rows.some((r) => r.role === "admin" && !r.hackathon_id);
  const adminFor = rows
    .filter((r) => r.role === "admin" && r.hackathon_id)
    .map((r) => r.hackathon_id as string);
  const judgeFor = rows
    .filter((r) => r.role === "judge" && r.hackathon_id)
    .map((r) => r.hackathon_id as string);
  return { isAdmin, adminFor, judgeFor };
}

// Header, page, and gates all resolve roles in the same request; cache()
// collapses them into one platform_roles read.
const loadRoles = cache(async (userId: string): Promise<PlatformRole[]> => {
  const supabase = await createServiceRoleClient();
  const result = await supabase
    .from("platform_roles")
    .select("*")
    .eq("user_id", userId);
  // A failed read here would silently demote every admin and judge.
  return (unwrap(result, "roles.loadRoles") as PlatformRole[] | null) ?? [];
});

export async function isAdminFor(state: AuthenticatedState): Promise<boolean> {
  const { isAdmin } = resolveRoles(await loadRoles(state.userId), state.email);
  return isAdmin;
}

export async function requireAdmin(): Promise<RoleCheck> {
  const state = await resolveAuthenticatedUserState();
  if (!state) return { ok: false, reason: "unauthenticated" };
  const { isAdmin } = resolveRoles(
    await loadRoles(state.userId),
    state.email,
  );
  return isAdmin ? { ok: true, state } : { ok: false, reason: "forbidden" };
}

/**
 * Slug-first variant for server actions that only carry the edition slug.
 * Returns the resolved hackathon so every mutation can scope its writes to
 * it — a slug-gated action writing by a bare row id would let a scoped
 * admin of edition A touch edition B's rows.
 */
export async function requireEditionAdminBySlug(slug: string): Promise<EditionCheck> {
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon) return { ok: false, reason: "forbidden" };
  const gate = await requireEditionAdmin(hackathon.id);
  return gate.ok ? { ok: true, state: gate.state, hackathon } : gate;
}

/** Global admins pass everywhere; a scoped admin only for their edition. */
export async function requireEditionAdmin(hackathonId: string): Promise<RoleCheck> {
  const state = await resolveAuthenticatedUserState();
  if (!state) return { ok: false, reason: "unauthenticated" };
  const { isAdmin, adminFor } = resolveRoles(await loadRoles(state.userId), state.email);
  return isAdmin || adminFor.includes(hackathonId)
    ? { ok: true, state }
    : { ok: false, reason: "forbidden" };
}

export async function requireJudge(hackathonId: string): Promise<RoleCheck> {
  const state = await resolveAuthenticatedUserState();
  if (!state) return { ok: false, reason: "unauthenticated" };
  const { isAdmin, judgeFor } = resolveRoles(
    await loadRoles(state.userId),
    state.email,
  );
  return isAdmin || judgeFor.includes(hackathonId)
    ? { ok: true, state }
    : { ok: false, reason: "forbidden" };
}

export type RoleState = {
  state: AuthenticatedState;
  isAdmin: boolean;
  adminFor: string[];
  judgeFor: string[];
};

/** One round-trip for callers that need both the identity and the roles. */
export async function resolveRoleState(): Promise<RoleState | null> {
  const state = await resolveAuthenticatedUserState();
  if (!state) return null;
  const { isAdmin, adminFor, judgeFor } = resolveRoles(await loadRoles(state.userId), state.email);
  return { state, isAdmin, adminFor, judgeFor };
}
