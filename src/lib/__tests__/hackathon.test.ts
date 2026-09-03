import { describe, it, expect } from "vitest";
import {
  isRegistrationOpen,
  isSubmissionWindowOpen,
  isVotingOpen,
  isFinalistsVisible,
  editionStage,
  editionPhase,
  submissionTarget,
  editionUsesTeams,
  requiresLumaConfirmation,
  registrationClosesWithSubmission,
} from "../hackathon";
import type { Hackathon } from "@/types/db";

const base = {
  id: "h1",
  slug: "solana-cursor-passo-fundo-2026",
  name: "Hackathon Solana & Cursor",
  status: "published",
  starts_at: "2026-08-31T12:00:00Z",
  registration_closes_at: "2026-09-08T02:59:00Z",
  development_starts_at: "2026-09-05T03:00:00Z",
  submission_deadline_at: "2026-09-09T15:00:00Z",
  finalists_announced_at: "2026-09-10T15:00:00Z",
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

describe("registrationClosesWithSubmission", () => {
  it("is false when the two dates differ", () => {
    expect(registrationClosesWithSubmission(base)).toBe(false);
  });

  it("is true when inscriptions close at the submission deadline", () => {
    const same = { ...base, registration_closes_at: base.submission_deadline_at } as Hackathon;
    expect(registrationClosesWithSubmission(same)).toBe(true);
  });

  it("is false when registration never closes", () => {
    const open = { ...base, registration_closes_at: null } as Hackathon;
    expect(registrationClosesWithSubmission(open)).toBe(false);
  });
});

describe("editionPhase", () => {
  it("follows the dates while published, no manual steps involved", () => {
    expect(editionPhase(base, new Date("2026-08-27T00:00:00Z"))).toBe("inscricoes");
    expect(editionPhase(base, new Date("2026-09-01T00:00:00Z"))).toBe("submissoes");
    expect(editionPhase(base, new Date("2026-09-09T16:00:00Z"))).toBe("julgamento");
  });

  it("draft and closed come straight from the manual status", () => {
    expect(editionPhase({ ...base, status: "draft" } as Hackathon, new Date())).toBe("rascunho");
    expect(editionPhase({ ...base, status: "closed" } as Hackathon, new Date())).toBe("encerrado");
  });

  it("judging only shows finalistas after the reveal date", () => {
    const h = { ...base, status: "judging" } as Hackathon;
    expect(editionPhase(h, new Date("2026-09-10T00:00:00Z"))).toBe("julgamento");
    expect(editionPhase(h, new Date("2026-09-10T16:00:00Z"))).toBe("finalistas");
  });

  it("legacy submissions_open rows still derive from dates", () => {
    const h = { ...base, status: "submissions_open" } as Hackathon;
    expect(editionPhase(h, new Date("2026-09-01T00:00:00Z"))).toBe("submissoes");
  });
});

describe("isFinalistsVisible", () => {
  it("hides the list before judging starts", () => {
    const h = { ...base, status: "submissions_open" } as Hackathon;
    expect(isFinalistsVisible(h, new Date("2026-09-11T00:00:00Z"))).toBe(false);
  });

  it("keeps the cut secret while judging until the announcement date", () => {
    const h = { ...base, status: "judging" } as Hackathon;
    expect(isFinalistsVisible(h, new Date("2026-09-09T18:00:00Z"))).toBe(false);
  });

  it("shows the list once the announcement date arrives", () => {
    const h = { ...base, status: "judging" } as Hackathon;
    expect(isFinalistsVisible(h, new Date("2026-09-10T15:00:00Z"))).toBe(true);
  });

  it("shows the list for a closed edition even without an announcement date", () => {
    const h = { ...base, status: "closed", finalists_announced_at: null } as Hackathon;
    expect(isFinalistsVisible(h, new Date("2026-09-13T00:00:00Z"))).toBe(true);
  });

  it("never leaks while judging with no announcement date set", () => {
    const h = { ...base, status: "judging", finalists_announced_at: null } as Hackathon;
    expect(isFinalistsVisible(h, new Date("2026-09-11T00:00:00Z"))).toBe(false);
  });
});



describe("submission target", () => {
  it("defaults to the platform with teams", () => {
    const h = { ...base, submission_mode: "platform", external_submission_url: null } as Hackathon;
    expect(submissionTarget(h)).toEqual({ mode: "platform" });
    expect(editionUsesTeams(h)).toBe(true);
  });

  it("external editions carry the submission url and drop teams", () => {
    const h = {
      ...base,
      submission_mode: "external",
      external_submission_url: "https://earn.superteam.fun/listing/x",
    } as Hackathon;
    expect(submissionTarget(h)).toEqual({ mode: "external", url: "https://earn.superteam.fun/listing/x" });
    expect(editionUsesTeams(h)).toBe(false);
  });

  it("asks for Luma only when the edition has one", () => {
    expect(requiresLumaConfirmation({ ...base, luma_url: "https://luma.com/x" } as Hackathon)).toBe(true);
    expect(requiresLumaConfirmation({ ...base, luma_url: null } as Hackathon)).toBe(false);
  });
});
