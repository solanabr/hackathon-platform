import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { JudgeProjectList } from "@/components/judge/project-list";
import type { JudgeProject } from "@/components/judge/project-card";
import { requireJudge, resolveRoleState } from "@/lib/roles";
import { getHackathonBySlug, ratingRound } from "@/lib/hackathon";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DAY = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

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

  const progressPct = projects.length
    ? Math.round((ratedCount / projects.length) * 100)
    : 0;

  const roundLabel = round === "triagem" ? "Triagem" : "Final";
  const roundDeadline =
    round === "triagem"
      ? hackathon.finalists_announced_at
      : (hackathon.presential_at ?? hackathon.voting_closes_at);

  const projectsWithRatings = projects.map((project) => ({
    ...project,
    rating: mine.get(project.submissionId) ?? { grade: null, comment: "" },
  }));

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <BackLink href="/judge" label="Avaliação" />

        <header>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">
            Painel do jurado
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-3xl font-bold sm:text-4xl">{hackathon.name}</h1>
            <span className="rounded-full border border-yellow/40 bg-yellow/10 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-widest text-yellow">
              {roundLabel}
            </span>
          </div>
          <p className="mt-2 text-muted">
            {projects.length === 0 ? (
              "Nenhum projeto atribuído a você nesta rodada."
            ) : (
              <>
                <span className="font-mono tabular-nums">
                  {ratedCount} de {projects.length}
                </span>{" "}
                avaliados por você. A nota de cada jurado é privada.
              </>
            )}
          </p>
          {roundDeadline && (
            <p className="mt-1 text-sm text-muted">
              Avaliações até{" "}
              <span className="font-mono tabular-nums">
                {DAY.format(new Date(roundDeadline)).replace(/\./g, "")}
              </span>
              .
            </p>
          )}
        </header>

        {projects.length > 0 && (
          <>
            <section
              aria-label="Seu progresso na rodada"
              className="rounded-xl border border-ink/10 bg-surface-raised p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">
                  Seu progresso
                </p>
                <p className="font-mono text-sm font-semibold tabular-nums text-yellow">
                  {ratedCount}/{projects.length} avaliados
                </p>
              </div>
              <div
                role="progressbar"
                aria-valuenow={ratedCount}
                aria-valuemin={0}
                aria-valuemax={projects.length}
                className="mt-2.5 h-2 overflow-hidden rounded-full bg-surface-deep"
              >
                <div
                  className="h-full rounded-full bg-yellow"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </section>
            <JudgeProjectList
              projects={projectsWithRatings}
              hackathonId={hackathon.id}
              slug={slug}
              round={round}
            />
          </>
        )}
      </div>
    </div>
  );
}
