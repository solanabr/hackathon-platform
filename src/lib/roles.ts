import { resolveAuthenticatedUserState, type AuthenticatedState } from "./user-state";
import { createServiceRoleClient } from "./supabase/server";
import type { PlatformRole } from "@/types/db";

type RoleCheck =
  | { ok: true; state: AuthenticatedState }
  | { ok: false; reason: "unauthenticated" | "forbidden" };

export function resolveRoles(
  rows: PlatformRole[],
  email: string | null,
): { isAdmin: boolean; judgeFor: string[] } {
  if (!email) return { isAdmin: false, judgeFor: [] };
  const isAdmin = rows.some((r) => r.role === "admin");
  const judgeFor = rows
    .filter((r) => r.role === "judge" && r.hackathon_id)
    .map((r) => r.hackathon_id as string);
  return { isAdmin, judgeFor };
}

async function loadRoles(userId: string): Promise<PlatformRole[]> {
  const supabase = await createServiceRoleClient();
  const { data } = await supabase
    .from("platform_roles")
    .select("*")
    .eq("user_id", userId);
  return (data as PlatformRole[] | null) ?? [];
}

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
  judgeFor: string[];
};

/** One round-trip for callers that need both the identity and the roles. */
export async function resolveRoleState(): Promise<RoleState | null> {
  const state = await resolveAuthenticatedUserState();
  if (!state) return null;
  const { isAdmin, judgeFor } = resolveRoles(await loadRoles(state.userId), state.email);
  return { state, isAdmin, judgeFor };
}
