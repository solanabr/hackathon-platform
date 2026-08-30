"use server";

import { requireUser } from "@/lib/user-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { addMemberToTeam, type AddMemberResult } from "@/lib/team-invite";

export type { AddMemberResult };

export type InviteActionResult = { ok: true } | { ok: false; error: string };

const INVITE_ERRORS: Record<string, string> = {
  team_locked: "O time já fechou a submissão. Fale com o líder.",
  team_full: "O time já está com 4 integrantes.",
  already_on_team: "Você já está em outro time nesta edição.",
  not_registered: "Complete sua inscrição na edição antes de entrar no time.",
  invite_not_found: "Convite não encontrado. Ele pode ter sido removido pelo líder.",
};

async function runInviteRpc(
  fn: "accept_pending_membership" | "decline_pending_membership",
  teamId: string,
): Promise<InviteActionResult> {
  await requireUser();
  // User-scoped client: both RPCs are SECURITY DEFINER and key on auth.uid().
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc(fn, { p_team_id: teamId });
  if (error) {
    return {
      ok: false,
      error: INVITE_ERRORS[error.message] ?? "Não foi possível concluir. Tente novamente.",
    };
  }
  return { ok: true };
}

export async function acceptTeamInvite(input: { teamId: string }): Promise<InviteActionResult> {
  return runInviteRpc("accept_pending_membership", input.teamId);
}

export async function declineTeamInvite(input: { teamId: string }): Promise<InviteActionResult> {
  return runInviteRpc("decline_pending_membership", input.teamId);
}

export async function addMemberByEmail(input: {
  teamId: string;
  email: string;
}): Promise<AddMemberResult> {
  const state = await requireUser();
  return addMemberToTeam(state, input.teamId, input.email);
}
