"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireJudge, resolveRoleState } from "@/lib/roles";
import { logQueryError } from "@/lib/supabase/unwrap";
import type { RatingRound } from "@/lib/hackathon";
import { sanitizeText } from "@/lib/security";

export type RatingResult = { ok: true } | { ok: false; error: string };

/**
 * submission_ratings has RLS on with no policies, so every write here goes
 * through the service role after requireJudge. The gate is the only thing
 * standing between a judge and another edition's projects - keep it first.
 */
async function gate(hackathonId: string, submissionId: string, round: RatingRound) {
  const check = await requireJudge(hackathonId);
  if (!check.ok) return { ok: false as const, error: "Sem permissão." };

  const supabase = await createServiceRoleClient();
  const { data } = await supabase
    .from("submissions")
    .select("id, status, teams!inner(hackathon_id)")
    .eq("id", submissionId)
    .maybeSingle();

  const row = data as { status: string; teams: { hackathon_id: string } | { hackathon_id: string }[] } | null;
  if (!row) return { ok: false as const, error: "Projeto não encontrado." };

  const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
  if (team?.hackathon_id !== hackathonId) {
    return { ok: false as const, error: "Projeto não pertence a esta edição." };
  }
  if (row.status !== "submitted") {
    return { ok: false as const, error: "Projeto ainda não foi submetido." };
  }

  // Filtering the list is presentation. The rule that a judge scores only their
  // assigned projects has to hold here too, or an extra rating shifts the
  // average that decides classification (regulamento 7.1).
  const roles = await resolveRoleState();
  if (!roles?.isAdmin) {
    const { data: assignment, error: assignmentError } = await supabase
      .from("submission_assignments")
      .select("submission_id")
      .eq("submission_id", submissionId)
      .eq("judge_id", check.state.userId)
      .eq("round", round)
      .maybeSingle();

    // A failed read is not "not assigned" — that message sends the judge to
    // the organizer to re-request an assignment that already exists.
    if (assignmentError) {
      logQueryError("judge.gate.assignment", assignmentError);
      return {
        ok: false as const,
        error: "Não foi possível verificar a atribuição. Tente novamente.",
      };
    }
    if (!assignment) {
      return { ok: false as const, error: "Este projeto não foi atribuído a você." };
    }
  }

  return { ok: true as const, userId: check.state.userId, supabase };
}

export async function upsertRating(input: {
  hackathonId: string;
  submissionId: string;
  slug: string;
  round: RatingRound;
  grade: number | null;
  comment: string;
}): Promise<RatingResult> {
  const g = await gate(input.hackathonId, input.submissionId, input.round);
  if (!g.ok) return { ok: false, error: g.error };

  if (input.grade !== null && (!Number.isInteger(input.grade) || input.grade < 0 || input.grade > 10)) {
    return { ok: false, error: "A nota vai de 0 a 10." };
  }

  const { error } = await g.supabase.from("submission_ratings").upsert(
    {
      submission_id: input.submissionId,
      judge_id: g.userId,
      round: input.round,
      grade: input.grade,
      comment: sanitizeText(input.comment, 2000),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "submission_id,judge_id,round" },
  );

  if (error) return { ok: false, error: "Não foi possível salvar a nota." };

  revalidatePath(`/judge/h/${input.slug}`);
  return { ok: true };
}

export async function deleteRating(input: {
  hackathonId: string;
  submissionId: string;
  slug: string;
  round: RatingRound;
}): Promise<RatingResult> {
  const g = await gate(input.hackathonId, input.submissionId, input.round);
  if (!g.ok) return { ok: false, error: g.error };

  const { error } = await g.supabase
    .from("submission_ratings")
    .delete()
    .eq("submission_id", input.submissionId)
    .eq("judge_id", g.userId)
    .eq("round", input.round);

  if (error) return { ok: false, error: "Não foi possível limpar a nota." };

  revalidatePath(`/judge/h/${input.slug}`);
  return { ok: true };
}
