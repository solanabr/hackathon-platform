import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { AdminEditionNav } from "@/components/admin/admin-edition-nav";
import { AssignmentGrid, type AssignmentProject } from "@/components/admin/assignment-grid";
import { requireEditionAdminBySlug } from "@/lib/roles";
import { getHackathonBySlug, ratingRound } from "@/lib/hackathon";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminJudgesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gate = await requireEditionAdminBySlug(slug);
  if (!gate.ok) redirect(gate.reason === "unauthenticated" ? "/auth" : "/");

  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon) notFound();

  const supabase = await createServiceRoleClient();
  const round = ratingRound(hackathon);

  const { data: roleRows } = await supabase
    .from("platform_roles")
    .select("user_id, users(full_name, email)")
    .eq("role", "judge")
    .eq("hackathon_id", hackathon.id);

  type RoleRow = { user_id: string; users: { full_name: string | null; email: string } | null };
  const judges = ((roleRows as RoleRow[] | null) ?? []).map((r) => ({
    id: r.user_id,
    name: r.users?.full_name ?? r.users?.email ?? "sem nome",
  }));

  const { data: teamRows } = await supabase
    .from("teams")
    .select("id, name, submissions(id, project_name, status)")
    .eq("hackathon_id", hackathon.id)
    .order("name", { ascending: true });

  type TeamRow = {
    id: string;
    name: string;
    submissions:
      | { id: string; project_name: string | null; status: string }
      | { id: string; project_name: string | null; status: string }[]
      | null;
  };

  const submitted = ((teamRows as TeamRow[] | null) ?? [])
    .map((t) => {
      const s = Array.isArray(t.submissions) ? t.submissions[0] : t.submissions;
      if (!s || s.status !== "submitted") return null;
      return { submissionId: s.id, projectName: s.project_name ?? t.name, teamName: t.name };
    })
    .filter((p): p is { submissionId: string; projectName: string; teamName: string } => p !== null);

  const { data: assignmentRows } = submitted.length
    ? await supabase
        .from("submission_assignments")
        .select("submission_id, judge_id")
        .eq("round", round)
        .in(
          "submission_id",
          submitted.map((p) => p.submissionId),
        )
    : { data: [] };

  const bySubmission = new Map<string, string[]>();
  for (const row of (assignmentRows as Array<{ submission_id: string; judge_id: string }> | null) ??
    []) {
    bySubmission.set(row.submission_id, [
      ...(bySubmission.get(row.submission_id) ?? []),
      row.judge_id,
    ]);
  }

  const projects: AssignmentProject[] = submitted.map((p) => ({
    ...p,
    judgeIds: bySubmission.get(p.submissionId) ?? [],
  }));

  const short = projects.filter((p) => p.judgeIds.length < 2).length;

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <BackLink href={`/admin/h/${slug}`} label={hackathon.name} />
          <AdminEditionNav slug={slug} />
        </div>

        <header>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">
            Atribuição
          </p>
          <h1 className="mt-1 font-heading text-3xl font-bold">Jurados por projeto</h1>
          <p className="mt-2 text-muted">
            {hackathon.name} · rodada de {round === "triagem" ? "triagem" : "banca final"}.
          </p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            O regulamento pede dois jurados por projeto na triagem. Um jurado só enxerga os
            projetos atribuídos a ele.
          </p>
        </header>

        {judges.length === 0 ? (
          <p className="rounded-2xl border border-yellow/40 bg-yellow/10 p-5 text-sm leading-relaxed">
            Nenhum jurado nesta edição ainda. Conceda o papel em{" "}
            <strong>Administração · Pessoas</strong> antes de atribuir projetos. A pessoa precisa
            ter entrado na plataforma pelo menos uma vez.
          </p>
        ) : projects.length === 0 ? (
          <p className="font-mono text-sm text-muted">Nenhum projeto submetido ainda.</p>
        ) : (
          <>
            {short > 0 && (
              <p className="rounded-2xl border border-yellow/40 bg-yellow/10 p-5 text-sm leading-relaxed">
                {short} {short === 1 ? "projeto ainda não tem" : "projetos ainda não têm"} dois
                jurados.
              </p>
            )}
            <AssignmentGrid projects={projects} judges={judges} slug={slug} round={round} />
          </>
        )}
      </div>
    </div>
  );
}
