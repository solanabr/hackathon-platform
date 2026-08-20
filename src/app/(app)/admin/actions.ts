"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/roles";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type RatingActionResult = { ok: true } | { ok: false; error: string };

export async function upsertRating(input: {
  submissionId: string;
  grade: number | null;
  comment: string;
}): Promise<RatingActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return { ok: false, error: "Não autorizado." };
  }

  const grade = input.grade;
  if (grade !== null && (!Number.isInteger(grade) || grade < 0 || grade > 10)) {
    return { ok: false, error: "Nota deve ser inteiro de 0 a 10." };
  }

  const comment = input.comment.trim() || null;

  if (grade === null && !comment) {
    return deleteRating({ submissionId: input.submissionId });
  }

  const admin = await createServiceRoleClient();
  const { error } = await admin.from("submission_ratings").upsert(
    {
      submission_id: input.submissionId,
      judge_id: gate.state.userId,
      round: "triagem",
      grade,
      comment,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "submission_id,judge_id,round" },
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteRating(input: {
  submissionId: string;
}): Promise<RatingActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return { ok: false, error: "Não autorizado." };
  }

  const admin = await createServiceRoleClient();
  const { error } = await admin
    .from("submission_ratings")
    .delete()
    .eq("submission_id", input.submissionId)
    .eq("judge_id", gate.state.userId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin");
  return { ok: true };
}
