import { createServiceRoleClient } from "./supabase/server";
import { publicStorageUrl } from "@/lib/storage";
import { unwrap } from "./supabase/unwrap";
import { ratingRound, type RatingRound } from "./hackathon";
import type { Hackathon } from "@/types/db";
import type { JudgeProject } from "@/components/judge/project-card";

export type JudgeRating = { grade: number | null; comment: string };
export type RatedJudgeProject = JudgeProject & { rating: JudgeRating };

type TeamRow = {
  id: string;
  name: string;
  submissions: Record<string, unknown> | Record<string, unknown>[] | null;
  team_members: Array<{
    is_leader: boolean;
    status: string;
    invited_email: string;
    users: {
      id: string;
      full_name: string | null;
      email: string;
      avatar_url: string | null;
      headline: string | null;
      github_url: string | null;
      linkedin_url: string | null;
      telegram_handle: string | null;
    } | null;
  }> | null;
};

/**
 * Everything a judge may open in an edition, with their own rating attached.
 * The list page and the project detail page both come through here so the
 * assignment gate is one piece of code: a non-admin only ever receives the
 * projects assigned to them this round (regulamento 7.1).
 */
export async function loadJudgeProjects(
  hackathon: Hackathon,
  judgeId: string,
  isAdmin: boolean,
): Promise<{ projects: RatedJudgeProject[]; round: RatingRound }> {
  const supabase = await createServiceRoleClient();
  const round = ratingRound(hackathon);

  // Teams and this judge's assignments don't depend on each other — one batch.
  const [teamsResult, assignmentsResult] = await Promise.all([
    supabase
      .from("teams")
      .select(
        `id, name,
       submissions(id, project_name, description, pitch_deck_url, pitch_video_url, demo_video_url, github_url, website_url, twitter_url, image_path, status, submitted_at),
       team_members(is_leader, status, invited_email, users(id, full_name, email, avatar_url, headline, github_url, linkedin_url, telegram_handle))`,
      )
      .eq("hackathon_id", hackathon.id)
      .order("name", { ascending: true }),
    isAdmin
      ? Promise.resolve(null)
      : supabase
          .from("submission_assignments")
          .select("submission_id")
          .eq("judge_id", judgeId)
          .eq("round", round),
  ]);
  const data = unwrap(teamsResult, "judge.projects.teams");

  let projects: JudgeProject[] = ((data as unknown as TeamRow[] | null) ?? [])
    .map((team) => {
      const s = (Array.isArray(team.submissions) ? team.submissions[0] : team.submissions) as
        | Record<string, unknown>
        | null;
      if (!s || s.status !== "submitted") return null;

      const members = (team.team_members ?? [])
        .filter((m) => m.status === "accepted")
        .map((m) => ({
          id: m.users?.id ?? null,
          name: m.users?.full_name ?? m.users?.email ?? m.invited_email,
          isLeader: m.is_leader,
          headline: m.users?.headline ?? null,
          avatarUrl: m.users?.avatar_url ?? null,
          email: m.users?.email ?? null,
          githubUrl: m.users?.github_url ?? null,
          linkedinUrl: m.users?.linkedin_url ?? null,
          telegramHandle: m.users?.telegram_handle ?? null,
        }));

      const imagePath = s.image_path as string | null;
      const imageUrl = imagePath ? publicStorageUrl("project-images", imagePath) : null;

      return {
        submissionId: s.id as string,
        teamName: team.name,
        projectName: (s.project_name as string | null) ?? team.name,
        description: (s.description as string | null) ?? "",
        imageUrl,
        submittedAt: s.submitted_at as string | null,
        links: [
          { label: "Pitch deck", href: s.pitch_deck_url as string | null },
          { label: "Vídeo", href: s.pitch_video_url as string | null },
          { label: "Demo", href: s.demo_video_url as string | null },
          { label: "Repositório", href: s.github_url as string | null },
          { label: "Site", href: s.website_url as string | null },
          { label: "X", href: s.twitter_url as string | null },
        ].filter((l): l is { label: string; href: string } => Boolean(l.href)),
        members,
      } satisfies JudgeProject;
    })
    .filter((p): p is JudgeProject => p !== null);

  if (!isAdmin && assignmentsResult) {
    const mine = unwrap(assignmentsResult, "judge.projects.assignments");
    const allowed = new Set(
      ((mine as Array<{ submission_id: string }> | null) ?? []).map((r) => r.submission_id),
    );
    projects = projects.filter((p) => allowed.has(p.submissionId));
  }

  const ratingRows = projects.length
    ? unwrap(
        await supabase
          .from("submission_ratings")
          .select("submission_id, grade, comment")
          .in(
            "submission_id",
            projects.map((p) => p.submissionId),
          )
          .eq("judge_id", judgeId)
          .eq("round", round),
        "judge.projects.ratings",
      )
    : [];

  const mine = new Map(
    (
      (ratingRows as Array<{
        submission_id: string;
        grade: number | null;
        comment: string | null;
      }> | null) ?? []
    ).map((r) => [r.submission_id, { grade: r.grade, comment: r.comment ?? "" }]),
  );

  return {
    projects: projects.map((p) => ({
      ...p,
      rating: mine.get(p.submissionId) ?? { grade: null, comment: "" },
    })),
    round,
  };
}
