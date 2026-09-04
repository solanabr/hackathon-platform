import type { MentorTrack } from "@/types/db";

export const TRACKS: readonly MentorTrack[] = ["tecnico", "negocios"] as const;

export const TRACK_LABEL: Record<MentorTrack, string> = {
  tecnico: "Mentoria técnica",
  negocios: "Mentoria de negócios",
};

export const TRACK_HINT: Record<MentorTrack, string> = {
  tecnico: "Arquitetura, código e decisões técnicas do produto.",
  negocios: "Modelo de negócio, go-to-market e pitch.",
};

export type BoardMentor = {
  id: string;
  track: MentorTrack;
  name: string;
  specialty: string | null;
};

export type BoardBooking = {
  id: string;
  track: MentorTrack;
  mentor_id: string;
  mentor_name: string;
  mentor_specialty: string | null;
  /** Null for everyone but the leader — the link is the privilege being gated. */
  booking_url: string | null;
  claimed_at: string;
  claimed_by_name: string | null;
};

export type MentorshipBoard = {
  hasTeam: boolean;
  isLeader: boolean;
  mentors: BoardMentor[];
  bookings: BoardBooking[];
};

export type TrackGroup = {
  track: MentorTrack;
  booking: BoardBooking | null;
  mentors: BoardMentor[];
};

export type MentorshipView =
  | { kind: "no-team" }
  | { kind: "not-leader"; bookings: BoardBooking[] }
  | { kind: "empty" }
  | { kind: "tracks"; groups: TrackGroup[] };

/**
 * The order comes from TRACKS, never from SQL: sorted as raw text 'negocios'
 * precedes 'tecnico', which is the reverse of how the page reads.
 */
export function groupByTrack(board: MentorshipBoard): TrackGroup[] {
  return TRACKS.map((track) => ({
    track,
    booking: board.bookings.find((b) => b.track === track) ?? null,
    mentors: board.mentors.filter((m) => m.track === track),
  }));
}

/** Every visibility decision the page makes, in one testable place. */
export function mentorshipView(board: MentorshipBoard): MentorshipView {
  if (!board.hasTeam) return { kind: "no-team" };
  if (!board.isLeader) return { kind: "not-leader", bookings: board.bookings };
  if (board.mentors.length === 0 && board.bookings.length === 0) return { kind: "empty" };
  return { kind: "tracks", groups: groupByTrack(board) };
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

const BOOKING_ERRORS: Record<string, string> = {
  not_leader: "Só o líder do time escolhe os mentores.",
  no_team: "Você precisa estar em um time para escolher um mentor.",
  already_booked: "Seu time já escolheu um mentor nessa mentoria.",
  mentor_not_found: "Esse mentor não está mais disponível. Atualize a página.",
  edition_not_found: "Esse mentor não está mais disponível. Atualize a página.",
  not_registered: "Complete sua inscrição na edição para escolher um mentor.",
};

/**
 * PostgREST hands back the bare string a plpgsql `raise exception` used, so the
 * lookup is exact — but an unmapped code must never render as `undefined`.
 */
export function bookingErrorMessage(code: string | undefined | null): string {
  return (code && BOOKING_ERRORS[code]) || "Não foi possível escolher. Tente novamente.";
}

