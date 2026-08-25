import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import { StatusChip } from "@/components/ui/section-card";
import { resolveRoleState } from "@/lib/roles";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { editionStage, ratingRound } from "@/lib/hackathon";
import type { Hackathon } from "@/types/db";

export const dynamic = "force-dynamic";

const DAY = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

const STAGE_LABEL: Record<string, string> = {
  upcoming: "ainda não começou",
  running: "em andamento",
  finished: "encerrado",
};

export default async function JudgeIndexPage() {
  const roles = await resolveRoleState();
  if (!roles) notFound();
  if (!roles.isAdmin && roles.judgeFor.length === 0) notFound();

  const supabase = await createServiceRoleClient();

  let query = supabase
    .from("hackathons")
    .select("*")
    .neq("status", "draft")
    .order("starts_at", { ascending: false });
  if (!roles.isAdmin) query = query.in("id", roles.judgeFor);

  const { data } = await query;
  const editions = (data as Hackathon[] | null) ?? [];

  const counts = new Map<string, { total: number; rated: number }>();
  for (const edition of editions) {
    const { data: teams } = await supabase
      .from("teams")
      .select("submissions!inner(id, status)")
      .eq("hackathon_id", edition.id);

    let ids = ((teams as Array<{ submissions: { id: string; status: string } | { id: string; status: string }[] }> | null) ?? [])
      .flatMap((t) => (Array.isArray(t.submissions) ? t.submissions : [t.submissions]))
      .filter((s) => s?.status === "submitted")
      .map((s) => s.id);

    // The denominator has to be what this judge can open, not every submission,
    // or their progress never reaches the total and "done" is unreachable.
    if (!roles.isAdmin && ids.length) {
      const { data: mine } = await supabase
        .from("submission_assignments")
        .select("submission_id")
        .eq("judge_id", roles.state.userId)
        .eq("round", ratingRound(edition))
        .in("submission_id", ids);

      const allowed = new Set(
        ((mine as Array<{ submission_id: string }> | null) ?? []).map((r) => r.submission_id),
      );
      ids = ids.filter((id) => allowed.has(id));
    }

    // A row only counts as rated once it carries a grade — a comment-only save
    // is a draft and must not move the progress bar.
    const { count } = ids.length
      ? await supabase
          .from("submission_ratings")
          .select("submission_id", { count: "exact", head: true })
          .in("submission_id", ids)
          .eq("judge_id", roles.state.userId)
          .eq("round", ratingRound(edition))
          .not("grade", "is", null)
      : { count: 0 };

    counts.set(edition.id, { total: ids.length, rated: count ?? 0 });
  }

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <BackLink href="/" label="Hackathons" />

        <header>
          <h1 className="font-heading text-3xl font-bold sm:text-4xl">Avaliação</h1>
          <p className="mt-2 text-muted">
            {roles.isAdmin
              ? "Como admin você avalia qualquer edição."
              : `Você é jurado em ${roles.judgeFor.length} ${
                  roles.judgeFor.length === 1 ? "edição" : "edições"
                }.`}
          </p>
        </header>

        {editions.length === 0 ? (
          <Card className="p-7">
            <p className="text-muted">Nenhuma edição atribuída a você ainda.</p>
          </Card>
        ) : (
          <ul className="space-y-4">
            {editions.map((edition) => {
              const c = counts.get(edition.id) ?? { total: 0, rated: 0 };
              const stage = editionStage(edition);
              const done = c.total > 0 && c.rated === c.total;

              return (
                <li key={edition.id}>
                  <Card className="flex flex-wrap items-center justify-between gap-5 p-6 sm:p-7">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="font-heading text-xl font-bold">{edition.name}</h2>
                        <StatusChip tone={stage === "running" ? "ok" : "muted"}>
                          {STAGE_LABEL[stage]}
                        </StatusChip>
                      </div>
                      <p className="mt-1.5 text-sm text-muted">
                        Pitch Day{" "}
                        {edition.presential_at
                          ? DAY.format(new Date(edition.presential_at)).replace(/\./g, "")
                          : "a definir"}
                        {" · "}
                        {c.total === 0
                          ? roles.isAdmin
                            ? "nenhum projeto submetido"
                            : "nenhum projeto atribuído a você"
                          : `${c.rated} de ${c.total} avaliados`}
                      </p>
                    </div>

                    {c.total === 0 ? (
                      <span className="text-sm text-muted">
                        {roles.isAdmin ? "Aguardando submissões" : "Nada atribuído ainda"}
                      </span>
                    ) : (
                      <Link
                        href={`/judge/h/${edition.slug}`}
                        className={done ? "btn-secondary px-5 py-2 text-sm" : "btn-primary px-5 py-2 text-sm"}
                      >
                        {done ? "Revisar notas" : "Avaliar projetos"}
                      </Link>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
