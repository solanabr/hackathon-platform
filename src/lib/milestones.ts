import { DAY_MONTH, TIME_HM, stripPeriods } from "./dates";
import type { Hackathon } from "@/types/db";

function d(iso: string): string {
  return stripPeriods(DAY_MONTH.format(new Date(iso)));
}

export type Milestone = { key: string; label: string; at: string; detail: string };

/**
 * The edition's dated milestones, in order, skipping the ones this edition
 * does not have. Surfaces render the list rather than naming milestones
 * themselves, so an edition with no live final simply shows fewer rows.
 *
 * The closing milestone's label is narrative — "Pitch Day" is this
 * regulamento's word, not the platform's — so it comes from the edition.
 */
export function buildMilestones(h: Hackathon): Milestone[] {
  return [
    h.registration_closes_at && {
      key: "registration",
      label: "Inscrições até",
      at: h.registration_closes_at,
      detail: d(h.registration_closes_at),
    },
    {
      key: "submission",
      label: "Submissão até",
      at: h.submission_deadline_at,
      detail: `${d(h.submission_deadline_at)}, ${TIME_HM.format(new Date(h.submission_deadline_at))}`,
    },
    h.finalists_announced_at && {
      key: "finalists",
      label: "Finalistas",
      at: h.finalists_announced_at,
      detail: d(h.finalists_announced_at),
    },
    // Becomes ends_at + its label once the date cutover lands.
    h.presential_at && {
      key: "ends",
      label: "Pitch Day",
      at: h.presential_at,
      detail: d(h.presential_at),
    },
  ].filter((m): m is Milestone => Boolean(m));
}
