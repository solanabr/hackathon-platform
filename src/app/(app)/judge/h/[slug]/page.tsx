import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { JudgeProjectList } from "@/components/judge/project-list";
import { requireJudge, resolveRoleState } from "@/lib/roles";
import { getHackathonBySlug } from "@/lib/hackathon";
import { loadJudgeProjects } from "@/lib/judge-projects";
import { DAY_MONTH_YEAR, stripPeriods } from "@/lib/dates";

export const dynamic = "force-dynamic";

const DAY = DAY_MONTH_YEAR;

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

  const roles = await resolveRoleState();
  const { projects, round } = await loadJudgeProjects(
    hackathon,
    gate.state.userId,
    roles?.isAdmin ?? false,
  );

  // Only a row with a grade counts as rated — a comment-only save is a draft.
  const ratedCount = projects.filter((p) => p.rating.grade != null).length;
  const progressPct = projects.length ? Math.round((ratedCount / projects.length) * 100) : 0;

  const roundLabel = round === "triagem" ? "Triagem" : "Final";
  const roundDeadline =
    round === "triagem"
      ? hackathon.finalists_announced_at
      : (hackathon.presential_at ?? hackathon.voting_closes_at);

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <BackLink href="/judge" label="Avaliar" />

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
                avaliados por você. A nota final de cada projeto é a média das notas dos jurados;
                sua nota é privada.
              </>
            )}
          </p>
          {roundDeadline && (
            <p className="mt-1 text-sm text-muted">
              Avaliações até{" "}
              <span className="font-mono tabular-nums">
                {stripPeriods(DAY.format(new Date(roundDeadline)))}
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
                <div className="h-full rounded-full bg-yellow" style={{ width: `${progressPct}%` }} />
              </div>
            </section>
            <JudgeProjectList projects={projects} slug={slug} />
          </>
        )}
      </div>
    </div>
  );
}
