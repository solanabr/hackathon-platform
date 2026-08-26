import { cache } from "react";
import type { PhaseBounds } from "./phases";
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
  const { data } = await supabase
    .from("hackathons")
    .select("*")
    .neq("status", "draft")
    .order("starts_at", { ascending: false });
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

export { phaseState } from "./phases";
export type { PhaseBounds, PhaseState } from "./phases";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Each phase is a half-open window [startsAt, endsAt). Submission ends at the
 * deadline rather than starting there, so the timeline stops calling it "agora"
 * at the very moment `submit_team` starts rejecting.
 */
export function phaseBoundaries(h: Hackathon): {
  fase1: PhaseBounds;
  submissao: PhaseBounds;
  selecao: PhaseBounds | null;
  fase2: PhaseBounds | null;
} {
  const at = (v: string) => new Date(v).getTime();

  const starts = at(h.starts_at);
  const deadline = at(h.submission_deadline_at);
  const announced = h.finalists_announced_at ? at(h.finalists_announced_at) : null;
  const presential = h.presential_at ? at(h.presential_at) : null;

  // Building starts when the classes end. Editions that never set that date
  // fall back to the registration close, which is what this used to assume.
  const buildStarts = Math.min(
    h.development_starts_at
      ? at(h.development_starts_at)
      : h.registration_closes_at
        ? at(h.registration_closes_at)
        : deadline,
    deadline,
  );

  return {
    fase1: { startsAt: starts, endsAt: buildStarts },
    submissao: { startsAt: buildStarts, endsAt: deadline },
    selecao: announced ? { startsAt: deadline, endsAt: presential ?? announced } : null,
    fase2: presential ? { startsAt: presential, endsAt: presential + DAY_MS } : null,
  };
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
