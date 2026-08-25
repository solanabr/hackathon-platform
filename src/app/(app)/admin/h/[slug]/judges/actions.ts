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
