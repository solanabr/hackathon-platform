import { describe, it, expect } from "vitest";
import {
  mentorshipView,
  groupByTrack,
  bookingErrorMessage,
  firstName,
  TRACKS,
  TRACK_LABEL,
  type MentorshipBoard,
  type BoardMentor,
  type BoardBooking,
} from "../mentorship";
import type { MentorTrack } from "@/types/db";

function mentor(track: MentorTrack, name: string): BoardMentor {
  return { id: `m-${name}`, track, name, specialty: null };
}

function booking(track: MentorTrack, name: string, url: string | null = "https://cal.com/x"): BoardBooking {
  return {
    id: `b-${name}`,
    track,
    mentor_id: `m-${name}`,
    mentor_name: name,
    mentor_specialty: null,
    booking_url: url,
    claimed_at: "2026-09-04T12:00:00Z",
    claimed_by_name: "Líder",
  };
}

function board(partial: Partial<MentorshipBoard>): MentorshipBoard {
  return { hasTeam: true, isLeader: true, mentors: [], bookings: [], ...partial };
}

describe("mentorshipView", () => {
  it("sends someone with no team to the create-team state", () => {
    expect(mentorshipView(board({ hasTeam: false }))).toEqual({ kind: "no-team" });
  });

  it("never hands the mentor catalog to a member who is not the leader", () => {
    const view = mentorshipView(
      board({ isLeader: false, mentors: [mentor("tecnico", "Ana"), mentor("negocios", "Beto")] }),
    );
    expect(view.kind).toBe("not-leader");
    expect(JSON.stringify(view)).not.toContain("Ana");
  });

  it("still shows a non-leader the mentor their team already chose", () => {
    const view = mentorshipView(board({ isLeader: false, bookings: [booking("tecnico", "Ana", null)] }));
    expect(view).toEqual({ kind: "not-leader", bookings: [booking("tecnico", "Ana", null)] });
  });

  it("gives a leader with no mentors the empty state instead of two blank panels", () => {
    expect(mentorshipView(board({}))).toEqual({ kind: "empty" });
  });

  it("keeps the other mentorship open when a team has chosen one of them", () => {
    const view = mentorshipView(
      board({ mentors: [mentor("negocios", "Beto")], bookings: [booking("tecnico", "Ana")] }),
    );
    if (view.kind !== "tracks") throw new Error("expected tracks view");
    expect(view.groups[0].booking?.mentor_name).toBe("Ana");
    expect(view.groups[1].booking).toBeNull();
    expect(view.groups[1].mentors).toHaveLength(1);
  });

  it("resolves a booked mentor that the admin removed from the catalog", () => {
    const view = mentorshipView(board({ mentors: [], bookings: [booking("tecnico", "Ana")] }));
    if (view.kind !== "tracks") throw new Error("expected tracks view");
    expect(view.groups[0].booking?.mentor_name).toBe("Ana");
  });
});

describe("groupByTrack", () => {
  // Sorted as raw text 'negocios' precedes 'tecnico', so ordering must never
  // come from the query.
  it("always returns both mentorships, técnico first", () => {
    const groups = groupByTrack(board({ mentors: [mentor("negocios", "Beto")] }));
    expect(groups.map((g) => g.track)).toEqual(["tecnico", "negocios"]);
  });
});

describe("bookingErrorMessage", () => {
  it("explains the one-per-track rule in the participant's words", () => {
    expect(bookingErrorMessage("already_booked")).toBe("Seu time já escolheu um mentor nessa mentoria.");
  });

  it("tells a leader when the edition has mentorship switched off", () => {
    expect(bookingErrorMessage("mentorship_disabled")).toBe("As mentorias não estão ativas nesta edição.");
  });

  it("asks for a complete registration instead of a generic failure", () => {
    expect(bookingErrorMessage("not_registered")).toBe(
      "Complete sua inscrição na edição para escolher um mentor.",
    );
  });

  it("falls back instead of rendering undefined for an unmapped code", () => {
    expect(bookingErrorMessage("23505")).toBe("Não foi possível escolher. Tente novamente.");
    expect(bookingErrorMessage(undefined)).toBe("Não foi possível escolher. Tente novamente.");
    expect(bookingErrorMessage(null)).toBe("Não foi possível escolher. Tente novamente.");
  });

  it("never leaks a raw postgres error to the participant", () => {
    const out = bookingErrorMessage('duplicate key value violates unique constraint "x"');
    expect(out).not.toContain("duplicate key");
    expect(out).not.toContain("violates");
  });
});

describe("labels", () => {
  it("gives every mentorship a pt-BR heading", () => {
    expect(TRACKS.every((track) => Boolean(TRACK_LABEL[track]))).toBe(true);
  });
});

describe("firstName", () => {
  it("shortens a full name for a button label", () => {
    expect(firstName("Ana Paula Souza")).toBe("Ana");
  });

  it("survives a single name and stray whitespace", () => {
    expect(firstName("  Beto  ")).toBe("Beto");
  });
});
