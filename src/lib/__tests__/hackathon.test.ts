import { describe, it, expect } from "vitest";
import {
  isRegistrationOpen,
  isSubmissionWindowOpen,
  isVotingOpen,
  editionStage,
} from "../hackathon";
import type { Hackathon } from "@/types/db";

const base = {
  id: "h1",
  slug: "solana-cursor-passo-fundo-2026",
  name: "Hackathon Solana & Cursor",
  status: "published",
  starts_at: "2026-08-31T12:00:00Z",
  registration_closes_at: "2026-09-08T02:59:00Z",
  submission_deadline_at: "2026-09-09T15:00:00Z",
  voting_opens_at: "2026-09-12T17:00:00Z",
  voting_closes_at: "2026-09-12T20:30:00Z",
  presential_at: "2026-09-12T12:00:00Z",
} as unknown as Hackathon;

describe("hackathon phase helpers", () => {
  it("registration is open before the closing date", () => {
    expect(isRegistrationOpen(base, new Date("2026-09-01T10:00:00Z"))).toBe(true);
  });

  it("registration is closed after the closing date", () => {
    expect(isRegistrationOpen(base, new Date("2026-09-08T10:00:00Z"))).toBe(false);
  });

  it("registration is open when no closing date is set", () => {
    const open = { ...base, registration_closes_at: null } as Hackathon;
    expect(isRegistrationOpen(open, new Date("2030-01-01T00:00:00Z"))).toBe(true);
  });

  it("submission window closes exactly at the deadline", () => {
    expect(isSubmissionWindowOpen(base, new Date("2026-09-09T15:00:00Z"))).toBe(false);
    expect(isSubmissionWindowOpen(base, new Date("2026-09-09T14:59:00Z"))).toBe(true);
  });

  it("voting is only open inside its window", () => {
    expect(isVotingOpen(base, new Date("2026-09-12T16:00:00Z"))).toBe(false);
    expect(isVotingOpen(base, new Date("2026-09-12T18:00:00Z"))).toBe(true);
    expect(isVotingOpen(base, new Date("2026-09-12T21:00:00Z"))).toBe(false);
  });

  it("voting is closed when the window is unset", () => {
    const noWindow = { ...base, voting_opens_at: null, voting_closes_at: null } as Hackathon;
    expect(isVotingOpen(noWindow, new Date("2026-09-12T18:00:00Z"))).toBe(false);
  });

  it("stages the edition by its dates", () => {
    expect(editionStage(base, new Date("2026-08-01T00:00:00Z"))).toBe("upcoming");
    expect(editionStage(base, new Date("2026-09-05T00:00:00Z"))).toBe("running");
    expect(editionStage(base, new Date("2026-10-01T00:00:00Z"))).toBe("finished");
  });
});