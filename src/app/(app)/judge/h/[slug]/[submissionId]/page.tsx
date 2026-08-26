import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { JudgeProjectCard } from "@/components/judge/project-card";
import { requireJudge, resolveRoleState } from "@/lib/roles";
import { getHackathonBySlug } from "@/lib/hackathon";
import { loadJudgeProjects } from "@/lib/judge-projects";

export const dynamic = "force-dynamic";

export default async function JudgeProjectPage({
  params,
}: {
  params: Promise<{ slug: string; submissionId: string }>;
}) {
  const { slug, submissionId } = await params;
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

  // The loader already applied the assignment gate — a project outside this
  // judge's round simply doesn't exist for them.
  const project = projects.find((p) => p.submissionId === submissionId);
  if (!project) notFound();

  const roundLabel = round === "triagem" ? "Triagem" : "Final";

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <BackLink href={`/judge/h/${slug}`} label="Projetos" />

        <header>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">
            {hackathon.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-3xl font-bold sm:text-4xl">{project.projectName}</h1>
            <span className="rounded-full border-2 border-green-dark bg-yellow px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-green-dark">
              {roundLabel}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted">
            A nota final do projeto é a média das notas dos jurados. A sua é privada.
          </p>
        </header>

        <JudgeProjectCard
          project={project}
          hackathonId={hackathon.id}
          slug={slug}
          round={round}
          rating={project.rating}
        />
      </div>
    </div>
  );
}
