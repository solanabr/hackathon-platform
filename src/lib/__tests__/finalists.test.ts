import { describe, it, expect } from "vitest";
import { finalistCandidates, type FinalistRow } from "../finalists";

function row(partial: Partial<FinalistRow>): FinalistRow {
  return {
    id: "s1",
    project_name: "Projeto",
    teams: {
      id: "t1",
      name: "Time",
      is_finalist: false,
      finalist_notified_at: null,
    },
    submission_ratings: [],
    ...partial,
  };
}

describe("finalistCandidates", () => {
  it("averages triagem grades and counts ratings", () => {
    const [c] = finalistCandidates([
      row({
        submission_ratings: [
          { grade: 8 },
          { grade: 7 },
          { grade: 9 },
          { grade: null },
        ],
      }),
    ]);
    expect(c.avgGrade).toBe(8);
    expect(c.ratings).toBe(3);
  });

  it("rounds the average to two decimals", () => {
    const [c] = finalistCandidates([
      row({ submission_ratings: [{ grade: 8 }, { grade: 7 }] }),
    ]);
    expect(c.avgGrade).toBe(7.5);
  });

  it("puts unrated submissions last", () => {
    const [rated, unrated] = finalistCandidates([
      row({ id: "s2", submission_ratings: [] }),
      row({ id: "s1", submission_ratings: [{ grade: 10 }] }),
    ]);
    expect(rated.submissionId).toBe("s1");
    expect(unrated.submissionId).toBe("s2");
    expect(unrated.avgGrade).toBeNull();
  });

  it("orders by average, highest first", () => {
    const rows = finalistCandidates([
      row({ id: "s1", submission_ratings: [{ grade: 6 }] }),
      row({ id: "s2", submission_ratings: [{ grade: 9 }] }),
      row({ id: "s3", submission_ratings: [{ grade: 7 }] }),
    ]);
    expect(rows.map((r) => r.submissionId)).toEqual(["s2", "s3", "s1"]);
  });

  it("carries finalist flags and notification state from the team", () => {
    const [c] = finalistCandidates([
      row({
        teams: {
          id: "t1",
          name: "Time",
          is_finalist: true,
          finalist_notified_at: "2026-09-10T15:00:00Z",
        },
      }),
    ]);
    expect(c.isFinalist).toBe(true);
    expect(c.notified).toBe(true);
  });
});
