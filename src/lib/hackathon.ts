import { createServerSupabaseClient } from "./supabase/server";
import type { Hackathon } from "@/types/db";

export async function getHackathonBySlug(slug: string): Promise<Hackathon | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("hackathons")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data as Hackathon | null;
}

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

export type PhaseBounds = { startsAt: number; endsAt: number };

export type PhaseState = "todo" | "current" | "done";

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
  const submissionStarts = Math.min(
    h.registration_closes_at ? at(h.registration_closes_at) : deadline,
    deadline,
  );

  return {
    fase1: { startsAt: starts, endsAt: submissionStarts },
    submissao: { startsAt: submissionStarts, endsAt: deadline },
    selecao: announced ? { startsAt: deadline, endsAt: presential ?? announced } : null,
    fase2: presential ? { startsAt: presential, endsAt: presential + DAY_MS } : null,
  };
}

export function phaseState(bounds: PhaseBounds, now: number): PhaseState {
  if (now < bounds.startsAt) return "todo";
  if (now < bounds.endsAt) return "current";
  return "done";
}
