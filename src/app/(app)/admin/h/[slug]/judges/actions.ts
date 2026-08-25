"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireEditionAdminBySlug } from "@/lib/roles";
import type { RatingRound } from "@/lib/hackathon";

export type AssignResult = { ok: true } | { ok: false; error: string };

export async function setAssignment(input: {
  slug: string;
  submissionId: string;
  judgeId: string;
  round: RatingRound;
  assigned: boolean;
}): Promise<AssignResult> {
  const gate = await requireEditionAdminBySlug(input.slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const supabase = await createServiceRoleClient();

  // The gate authorizes the slug; without these two checks a scoped admin
  // could pair another edition's submission with an arbitrary judge.
  const [{ data: submissionTeam }, { data: judgeRole }] = await Promise.all([
    supabase
      .from("submissions")
      .select("team_id, teams!inner(hackathon_id)")
      .eq("id", input.submissionId)
      .maybeSingle(),
    supabase
      .from("platform_roles")
      .select("id")
      .eq("user_id", input.judgeId)
      .eq("role", "judge")
      .eq("hackathon_id", gate.hackathon.id)
      .maybeSingle(),
  ]);

  const submissionHackathon = (
    submissionTeam as { teams: { hackathon_id: string } } | null
  )?.teams?.hackathon_id;
  if (submissionHackathon !== gate.hackathon.id) {
    return { ok: false, error: "Projeto não pertence a esta edição." };
  }
  if (!judgeRole) {
    return { ok: false, error: "Essa pessoa não é jurada desta edição." };
  }

  if (input.assigned) {
    const { error } = await supabase.from("submission_assignments").insert({
      submission_id: input.submissionId,
      judge_id: input.judgeId,
      round: input.round,
      assigned_by: gate.state.userId,
    });
    if (error && error.code !== "23505") {
      return { ok: false, error: "Não foi possível atribuir." };
    }
  } else {
    const { error } = await supabase
      .from("submission_assignments")
      .delete()
      .eq("submission_id", input.submissionId)
      .eq("judge_id", input.judgeId)
      .eq("round", input.round);
    if (error) return { ok: false, error: "Não foi possível remover a atribuição." };
  }

  revalidatePath(`/admin/h/${input.slug}/judges`);
  revalidatePath(`/judge/h/${input.slug}`);
  return { ok: true };
}
