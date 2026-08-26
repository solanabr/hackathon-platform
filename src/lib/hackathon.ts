import { cache } from "react";
import { createServerSupabaseClient } from "./supabase/server";
import { logQueryError } from "./supabase/unwrap";
import type { Hackathon } from "@/types/db";

// Gate and page resolve the same slug in one request; dedupe the read.
export const getHackathonBySlug = cache(async (slug: string): Promise<Hackathon | null> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("hackathons")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) logQueryError("hackathon.getHackathonBySlug", error);
  return data as Hackathon | null;
});

export async function listHackathons(): Promise<Hackathon[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("hackathons")
    .select("*")
    .neq("status", "draft")
    .order("starts_at", { ascending: false });
  if (error) logQueryError("hackathon.listHackathons", error);
  return (data as Hackathon[] | null) ?? [];
}

export function isRegistrationOpen(h: Hackathon, now: Date = new Date()): boolean {
  if (!h.registration_closes_at) return true;
  return new Date(h.registration_closes_at).getTime() > now.getTime();
}

export function isSubmissionWindowOpen(h: Hackathon, now: Date = new Date()): boolean {
  return new Date(h.submission_deadline_at).getTime() > now.getTime();
}

export function isVotingOpen(h: Hackathon, now: Date = new Date()): boolean {
  if (!h.voting_opens_at || !h.voting_closes_at) return false;
  const t = now.getTime();
  return (
    new Date(h.voting_opens_at).getTime() <= t &&
    new Date(h.voting_closes_at).getTime() > t
  );
}

export function editionStage(
  h: Hackathon,
  now: Date = new Date(),
): "upcoming" | "running" | "finished" {
  const t = now.getTime();
  if (new Date(h.starts_at).getTime() > t) return "upcoming";
  const endsAt = h.voting_closes_at ?? h.presential_at ?? h.submission_deadline_at;
  return new Date(endsAt).getTime() > t ? "running" : "finished";
}

export type EditionPhase =
  | "rascunho"
  | "inscricoes"
  | "submissoes"
  | "julgamento"
  | "finalistas"
  | "encerrado";

export const EDITION_PHASE_LABEL: Record<EditionPhase, string> = {
  rascunho: "Rascunho",
  inscricoes: "Inscrições abertas",
  submissoes: "Submissões abertas",
  julgamento: "Em julgamento",
  finalistas: "Finalistas anunciados",
  encerrado: "Encerrado",
};

/**
 * The stage a published edition is in follows the configured dates on their
 * own — nobody advances it by hand. The only manual switches left are
 * publishing (draft ↔ published), announcing the finalists (→ judging, which
 * reveals the public finalists section) and closing the edition.
 */
export function editionPhase(h: Hackathon, now: Date = new Date()): EditionPhase {
  if (h.status === "draft") return "rascunho";
  if (h.status === "closed") return "encerrado";
  if (h.status === "judging") {
    return isFinalistsVisible(h, now) ? "finalistas" : "julgamento";
  }
  if (now.getTime() < new Date(h.starts_at).getTime()) return "inscricoes";
  if (isSubmissionWindowOpen(h, now)) return "submissoes";
  return "julgamento";
}

export type RatingRound = "triagem" | "final";

/**
 * Regulamento 7.1/7.2: the first cut happens before the finalists are announced,
 * the panel scores again on Pitch Day. Both rounds live in submission_ratings,
 * keyed by (submission_id, judge_id, round).
 */
export function ratingRound(h: Hackathon, now: Date = new Date()): RatingRound {
  if (!h.finalists_announced_at) return "triagem";
  return now.getTime() >= new Date(h.finalists_announced_at).getTime() ? "final" : "triagem";
}

/**
 * When the public landing may show the finalist list. A closed edition always
 * shows results; while judging, the announced date is the reveal signal so the
 * cut is never leaked before it is public.
 *
 * Operational trap: the gate deliberately holds finalists until the edition
 * status is flipped to `judging` (the live edition stays `published`). An
 * operator must flip the status on announcement day — 09/10 in the live
 * edition — or the public finalists section stays hidden until then. This is
 * intentional, not a bug.
 */
export function isFinalistsVisible(h: Hackathon, now: Date = new Date()): boolean {
  if (h.status !== "judging" && h.status !== "closed") return false;
  if (h.status === "closed") return true;
  return (
    h.finalists_announced_at !== null &&
    new Date(h.finalists_announced_at).getTime() <= now.getTime()
  );
}
