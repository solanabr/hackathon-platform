import { describe, it, expect } from "vitest";
import {
  isRegistrationOpen,
  isSubmissionWindowOpen,
  isVotingOpen,
  isFinalistsVisible,
  editionStage,
  phaseBoundaries,
  phaseState,
  prizePoolLabel,
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

describe("phaseBoundaries", () => {
  const b = phaseBoundaries(base);

  it("keeps submission current only while it is actually open", () => {
    const open = new Date("2026-09-09T14:59:00Z").getTime();
    const closed = new Date("2026-09-09T15:00:00Z").getTime();

    expect(phaseState(b.submissao, open)).toBe("current");
    expect(phaseState(b.submissao, closed)).toBe("done");
    expect(isSubmissionWindowOpen(base, new Date(closed))).toBe(false);
  });

  it("hands the current phase to selection the instant submission closes", () => {
    const closed = new Date("2026-09-09T15:00:00Z").getTime();
    expect(phaseState(b.selecao!, closed)).toBe("current");
  });

  it("marks phase one current until registration closes, not until the deadline", () => {
    const duringClasses = new Date("2026-09-02T12:00:00Z").getTime();
    const afterRegistration = new Date("2026-09-08T12:00:00Z").getTime();

    expect(phaseState(b.fase1, duringClasses)).toBe("current");
    expect(phaseState(b.submissao, duringClasses)).toBe("todo");
    expect(phaseState(b.fase1, afterRegistration)).toBe("done");
    expect(phaseState(b.submissao, afterRegistration)).toBe("current");
  });

  it("stops calling the in-person day current once it is over", () => {
    expect(phaseState(b.fase2!, new Date("2026-09-12T14:00:00Z").getTime())).toBe("current");
    expect(phaseState(b.fase2!, new Date("2026-09-20T00:00:00Z").getTime())).toBe("done");
  });

  it("never opens the submission phase after its own deadline", () => {
    const late = phaseBoundaries({
      ...base,
      registration_closes_at: "2026-09-30T00:00:00Z",
    } as Hackathon);
    expect(late.submissao.startsAt).toBeLessThanOrEqual(late.submissao.endsAt);
  });

  it("omits phases whose dates are not configured", () => {
    const bare = phaseBoundaries({
      ...base,
      finalists_announced_at: null,
      presential_at: null,
    } as Hackathon);
    expect(bare.selecao).toBeNull();
    expect(bare.fase2).toBeNull();
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

describe("phase one split", () => {
  it("ends the classes when building starts, not when registration closes", () => {
    const b = phaseBoundaries(base);
    expect(b.fase1.endsAt).toBe(new Date("2026-09-05T03:00:00Z").getTime());
    expect(b.submissao.startsAt).toBe(b.fase1.endsAt);
  });

  it("puts a day inside the build window in the right phase", () => {
    const b = phaseBoundaries(base);
    const sixth = new Date("2026-09-06T12:00:00Z").getTime();
    expect(phaseState(b.fase1, sixth)).toBe("done");
    expect(phaseState(b.submissao, sixth)).toBe("current");
  });

  it("registration closing mid-build does not move any phase", () => {
    const later = phaseBoundaries({
      ...base,
      registration_closes_at: "2026-09-08T02:59:00Z",
    } as Hackathon);
    expect(later.fase1.endsAt).toBe(new Date("2026-09-05T03:00:00Z").getTime());
  });

  it("falls back to the old behaviour when an edition sets no build date", () => {
    const legacy = phaseBoundaries({
      ...base,
      development_starts_at: null,
    } as Hackathon);
    expect(legacy.fase1.endsAt).toBe(new Date("2026-09-08T02:59:00Z").getTime());
  });
});

describe("prizePoolLabel", () => {
  it("sums the US$ amounts across the itemized summary", () => {
    expect(
      prizePoolLabel(
        "1º Lugar - US$1500 + Kit · 2º Lugar - US$900 · 3º Lugar - US$450 · Menção Honrosa - US$150",
      ),
    ).toBe("US$ 3.000 em prêmios");
  });

  it("handles pt-BR thousand separators", () => {
    expect(prizePoolLabel("1º Lugar - US$ 1.500")).toBe("US$ 1.500 em prêmios");
  });

  it("returns null when nothing is parseable", () => {
    expect(prizePoolLabel(null)).toBeNull();
    expect(prizePoolLabel("")).toBeNull();
    expect(prizePoolLabel("Prêmios surpresa")).toBeNull();
  });
});
