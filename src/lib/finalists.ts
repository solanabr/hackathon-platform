export type FinalistCandidate = {
  submissionId: string;
  projectName: string;
  teamId: string;
  teamName: string;
  avgGrade: number | null;
  ratings: number;
  isFinalist: boolean;
  notified: boolean;
  placement: number | null;
};

type RawTeam = {
  id: string;
  name: string;
  is_finalist: boolean;
  finalist_notified_at: string | null;
  placement: number | null;
};

type RawRating = { grade: number | null };

export type FinalistRow = {
  id: string;
  project_name: string | null;
  teams: RawTeam | RawTeam[] | null;
  submission_ratings: RawRating | RawRating[] | null;
};

/**
 * Triagem average per submitted project, best first and unrated projects last.
 * The page fetches one row per submission with its embedded triagem ratings;
 * the average is computed here so the ordering is testable without a database.
 */
export function finalistCandidates(rows: FinalistRow[] | null): FinalistCandidate[] {
  return (rows ?? [])
    .map((row) => {
      const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
      const ratings = row.submission_ratings
        ? Array.isArray(row.submission_ratings)
          ? row.submission_ratings
          : [row.submission_ratings]
        : [];
      const grades = ratings.filter((r): r is { grade: number } => r.grade !== null);
      const sum = grades.reduce((acc, r) => acc + r.grade, 0);
      const avg = grades.length > 0 ? Math.round((sum / grades.length) * 100) / 100 : null;

      return {
        submissionId: row.id,
        projectName: row.project_name ?? team?.name ?? "sem nome",
        teamId: team?.id ?? "",
        teamName: team?.name ?? "sem nome",
        avgGrade: avg,
        ratings: grades.length,
        isFinalist: team?.is_finalist ?? false,
        notified: team?.finalist_notified_at !== null,
        placement: team?.placement ?? null,
      };
    })
    .sort((a, b) => {
      if (a.avgGrade === null && b.avgGrade === null) {
        return a.projectName.localeCompare(b.projectName, "pt-BR");
      }
      if (a.avgGrade === null) return 1;
      if (b.avgGrade === null) return -1;
      if (a.avgGrade !== b.avgGrade) return b.avgGrade - a.avgGrade;
      return a.projectName.localeCompare(b.projectName, "pt-BR");
    });
}
