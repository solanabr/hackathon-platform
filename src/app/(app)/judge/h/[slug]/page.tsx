import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { JudgeProjectCard, type JudgeProject } from "@/components/judge/project-card";
import { requireJudge, resolveRoleState } from "@/lib/roles";
import { getHackathonBySlug, ratingRound } from "@/lib/hackathon";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type TeamRow = {
  id: string;
  name: string;
  submissions:
    | Record<string, unknown>
    | Record<string, unknown>[]
    | null;
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

export default async function JudgeEditionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon || hackathon.status === "draft") notFound();

  const gate = await requireJudge(hackathon.id);
  if (!gate.ok) {
    if (gate.reason === "unauthenticated") redirect("/auth");
    notFound();
  }

  const supabase = await createServiceRoleClient();
  const { data } = await supabase
    .from("teams")
    .select(
      `id, name,
       submissions(id, project_name, description, pitch_deck_url, pitch_video_url, demo_video_url, github_url, website_url, twitter_url, image_path, status, submitted_at),
       team_members(is_leader, status, invited_email, users(id, full_name, email, avatar_url, headline, github_url, linkedin_url, telegram_handle))`,
    )
    .eq("hackathon_id", hackathon.id)
    .order("name", { ascending: true });

  let projects: JudgeProject[] = ((data as TeamRow[] | null) ?? [])
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
      const imageUrl = imagePath
        ? supabase.storage.from("project-images").getPublicUrl(imagePath).data.publicUrl
        : null;

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

  const round = ratingRound(hackathon);

  // A judge only sees what an admin gave them (regulamento 7.1: two per project).
  // Admins see everything, so they can spot-check without being assigned.
  const roles = await resolveRoleState();
  if (!roles?.isAdmin) {
    const { data: mine } = await supabase
      .from("submission_assignments")
      .select("submission_id")
      .eq("judge_id", gate.state.userId)
      .eq("round", round);

    const allowed = new Set(
      ((mine as Array<{ submission_id: string }> | null) ?? []).map((r) => r.submission_id),
    );
    projects = projects.filter((p) => allowed.has(p.submissionId));
  }

  const { data: ratingRows } = projects.length
    ? await supabase
        .from("submission_ratings")
        .select("submission_id, grade, comment")
        .in(
          "submission_id",
          projects.map((p) => p.submissionId),
        )
        .eq("judge_id", gate.state.userId)
        .eq("round", round)
    : { data: [] };

  const mine = new Map(
    ((ratingRows as Array<{ submission_id: string; grade: number | null; comment: string | null }> | null) ?? []).map(
      (r) => [r.submission_id, { grade: r.grade, comment: r.comment ?? "" }],
    ),
  );

  // Only a row with a grade counts as rated — a comment-only save is a draft.
  const ratedCount = projects.filter((p) => mine.get(p.submissionId)?.grade != null).length;

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <BackLink href="/judge" label="Avaliação" />

        <header>
          <h1 className="font-heading text-3xl font-bold sm:text-4xl">{hackathon.name}</h1>
          <p className="mt-2 text-muted">
            {projects.length === 0
              ? "Nenhum projeto atribuído a você nesta rodada."
              : `${ratedCount} de ${projects.length} avaliados por você na ${
                  round === "triagem" ? "triagem" : "banca final"
                }. A nota de cada jurado é privada.`}
          </p>
        </header>

        {projects.length > 0 && (
          <ul className="space-y-6">
            {projects.map((project) => (
              <li key={project.submissionId}>
                <JudgeProjectCard
                  project={project}
                  hackathonId={hackathon.id}
                  slug={slug}
                  round={round}
                  rating={mine.get(project.submissionId) ?? { grade: null, comment: "" }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
