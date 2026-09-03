import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createAnonClient } from "./supabase/anon";
import { HACKATHONS_TAG, hackathonTag } from "./cache-tags";
import { logQueryError } from "./supabase/unwrap";
import type { Hackathon } from "@/types/db";

// Edition rows are viewer-independent, so they live in the shared data cache
// (anon client, no cookies). Admin actions revalidate the tags on write; the
// 5-minute revalidate is the backstop. Errors throw instead of returning
// null/[]: unstable_cache would otherwise store the transient failure and
// serve a phantom 404/empty gallery for the whole window.
// The react cache() wrapper still dedupes gate + page within one request.
export const getHackathonBySlug = cache((slug: string): Promise<Hackathon | null> =>
  unstable_cache(
    async () => {
      const supabase = createAnonClient();
      const { data, error } = await supabase
        .from("hackathons")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) {
        logQueryError("hackathon.getHackathonBySlug", error);
        throw new Error("hackathon.getHackathonBySlug failed");
      }
      return (data as Hackathon | null) ?? null;
    },
    ["hackathon-by-slug", slug],
    { tags: [hackathonTag(slug), HACKATHONS_TAG], revalidate: 300 },
  )(),
);

export const listHackathons = cache((): Promise<Hackathon[]> =>
  unstable_cache(
    async () => {
      const supabase = createAnonClient();
      const { data, error } = await supabase
        .from("hackathons")
        .select("*")
        .neq("status", "draft")
        .order("starts_at", { ascending: false });
      if (error) {
        logQueryError("hackathon.listHackathons", error);
        throw new Error("hackathon.listHackathons failed");
      }
      return (data as Hackathon[] | null) ?? [];
    },
    ["hackathons-list"],
    { tags: [HACKATHONS_TAG], revalidate: 300 },
  )(),
);

export function isRegistrationOpen(h: Hackathon, now: Date = new Date()): boolean {
  if (!h.registration_closes_at) return true;
  return new Date(h.registration_closes_at).getTime() > now.getTime();
}

export function isSubmissionWindowOpen(h: Hackathon, now: Date = new Date()): boolean {
  return new Date(h.submission_deadline_at).getTime() > now.getTime();
}

export type SubmissionTarget = { mode: "platform" } | { mode: "external"; url: string | null };

/** Where this edition collects projects. Pages branch on this, never on the
 * raw columns, so a new mode is one more case here. */
export function submissionTarget(h: Hackathon): SubmissionTarget {
  if (h.submission_mode === "external") return { mode: "external", url: h.external_submission_url };
  return { mode: "platform" };
}

/** Teams, team-up and the submission editor only exist for platform editions. */
export function editionUsesTeams(h: Hackathon): boolean {
  return submissionTarget(h).mode === "platform";
}

/** Registration asks for the Luma confirmation only when the edition has one. */
export function requiresLumaConfirmation(h: Hackathon): boolean {
  return Boolean(h.luma_url);
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
