"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/user-state";

export type ManageResult = { ok: true } | { ok: false; error: string };

const MESSAGES: Record<string, string> = {
  not_leader: "Só o líder pode fazer isso.",
  team_locked: "O time já foi submetido e está bloqueado.",
  team_not_empty: "Remova os outros integrantes antes de excluir o time.",
  already_submitted: "O projeto já foi enviado, o time não pode ser excluído.",
  not_a_member: "Essa pessoa não está no time.",
  already_leader: "Essa pessoa já é a líder.",
  leader_must_transfer_first: "Passe a liderança para outra pessoa antes de sair.",
  cannot_remove_leader: "O líder não pode ser removido.",
};

function toMessage(raw: string | undefined): string {
  if (!raw) return "Não foi possível concluir a ação.";
  const key = Object.keys(MESSAGES).find((k) => raw.includes(k));
  return key ? MESSAGES[key] : "Não foi possível concluir a ação.";
}

export async function transferLeadership(input: {
  teamId: string;
  newLeaderId: string;
  slug: string;
}): Promise<ManageResult> {
  await requireUser();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("transfer_team_leadership", {
    p_team_id: input.teamId,
    p_new_leader_id: input.newLeaderId,
  });
  if (error) return { ok: false, error: toMessage(error.message) };

  revalidatePath(`/h/${input.slug}/team`);
  revalidatePath(`/h/${input.slug}/dashboard`);
  return { ok: true };
}

export async function deleteTeam(input: { teamId: string; slug: string }): Promise<ManageResult> {
  await requireUser();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("delete_team", { p_team_id: input.teamId });
  if (error) return { ok: false, error: toMessage(error.message) };

  revalidatePath(`/h/${input.slug}/dashboard`);
  return { ok: true };
}

export async function leaveTeam(input: { teamId: string; slug: string }): Promise<ManageResult> {
  await requireUser();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("leave_team", { p_team_id: input.teamId });
  if (error) return { ok: false, error: toMessage(error.message) };

  revalidatePath(`/h/${input.slug}/dashboard`);
  return { ok: true };
}
