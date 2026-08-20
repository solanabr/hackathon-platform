import { resolveAuthenticatedUserState, type AuthenticatedState } from "./user-state";
import { createServiceRoleClient } from "./supabase/server";
import type { PlatformRole } from "@/types/db";

type RoleCheck =
  | { ok: true; state: AuthenticatedState }
  | { ok: false; reason: "unauthenticated" | "forbidden" };

function bootstrapEmails(): string[] {
  return (process.env.ADMIN_EMAIL_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function resolveRoles(
  rows: PlatformRole[],
  email: string | null,
  bootstrap: string[],
): { isAdmin: boolean; judgeFor: string[] } {
  if (!email) return { isAdmin: false, judgeFor: [] };
  const isAdmin =
    bootstrap.includes(email.toLowerCase()) ||
    rows.some((r) => r.role === "admin");
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

export async function requireAdmin(): Promise<RoleCheck> {
  const state = await resolveAuthenticatedUserState();
  if (!state) return { ok: false, reason: "unauthenticated" };
  const { isAdmin } = resolveRoles(
    await loadRoles(state.userId),
    state.email,
    bootstrapEmails(),
  );
  return isAdmin ? { ok: true, state } : { ok: false, reason: "forbidden" };
}

export async function requireJudge(hackathonId: string): Promise<RoleCheck> {
  const state = await resolveAuthenticatedUserState();
  if (!state) return { ok: false, reason: "unauthenticated" };
  const { isAdmin, judgeFor } = resolveRoles(
    await loadRoles(state.userId),
    state.email,
    bootstrapEmails(),
  );
  return isAdmin || judgeFor.includes(hackathonId)
    ? { ok: true, state }
    : { ok: false, reason: "forbidden" };
}