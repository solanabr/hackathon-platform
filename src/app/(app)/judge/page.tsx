import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import { StatusChip } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { resolveRoleState } from "@/lib/roles";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { unwrap } from "@/lib/supabase/unwrap";
import { DAY_MONTH_YEAR, stripPeriods } from "@/lib/dates";
import { editionStage, ratingRound } from "@/lib/hackathon";
import type { Hackathon } from "@/types/db";

export const dynamic = "force-dynamic";

const DAY = DAY_MONTH_YEAR;

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

  const editions =
    (unwrap(await query, "judge.index.editions") as Hackathon[] | null) ?? [];

  // Grouped queries instead of a per-edition loop: one sweep for submitted
  // projects, then assignments and ratings for all of them at once — the
  // round-trip count no longer grows with the number of editions.
  const roundByEdition = new Map(editions.map((e) => [e.id, ratingRound(e)]));
  const rounds = [...new Set(roundByEdition.values())];

  const teams = editions.length
    ? unwrap(
        await supabase
          .from("teams")
          .select("hackathon_id, submissions!inner(id, status)")
          .in(
            "hackathon_id",
            editions.map((e) => e.id),
          ),
        "judge.index.teams",
      )
    : [];

  const submittedByEdition = new Map<string, string[]>();
  for (const t of (teams as Array<{
    hackathon_id: string;
    submissions: { id: string; status: string } | { id: string; status: string }[];
  }> | null) ?? []) {
    const subs = Array.isArray(t.submissions) ? t.submissions : [t.submissions];
    for (const s of subs) {
      if (s?.status !== "submitted") continue;
      const list = submittedByEdition.get(t.hackathon_id) ?? [];
      list.push(s.id);
      submittedByEdition.set(t.hackathon_id, list);
    }
  }
  const allIds = [...submittedByEdition.values()].flat();

  const [assignmentsResult, ratingsResult] = allIds.length
    ? await Promise.all([
        roles.isAdmin
          ? Promise.resolve(null)
          : supabase
              .from("submission_assignments")
              .select("submission_id, round")
              .eq("judge_id", roles.state.userId)
              .in("submission_id", allIds)
              .in("round", rounds),
        // A row only counts as rated once it carries a grade — a comment-only
        // save is a draft and must not move the progress bar.
        supabase
          .from("submission_ratings")
          .select("submission_id, round")
          .eq("judge_id", roles.state.userId)
          .in("submission_id", allIds)
          .in("round", rounds)
          .not("grade", "is", null),
      ])
    : [null, null];

  const assigned = new Set(
    (
      (assignmentsResult
        ? (unwrap(assignmentsResult, "judge.index.assignments") as Array<{
            submission_id: string;
            round: string;
          }> | null)
        : null) ?? []
    ).map((r) => `${r.submission_id}:${r.round}`),
  );
  const rated = new Set(
    (
      (ratingsResult
        ? (unwrap(ratingsResult, "judge.index.ratings") as Array<{
            submission_id: string;
            round: string;
          }> | null)
        : null) ?? []
    ).map((r) => `${r.submission_id}:${r.round}`),
  );

  const counts = new Map<string, { total: number; rated: number }>();
  for (const edition of editions) {
    const round = roundByEdition.get(edition.id)!;
    // The denominator has to be what this judge can open, not every submission,
    // or their progress never reaches the total and "done" is unreachable.
    const ids = (submittedByEdition.get(edition.id) ?? []).filter(
      (id) => roles.isAdmin || assigned.has(`${id}:${round}`),
    );
    counts.set(edition.id, {
      total: ids.length,
      rated: ids.filter((id) => rated.has(`${id}:${round}`)).length,
    });
  }

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <BackLink href="/h" label="Hackathons" />

        <header>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">
            Painel do jurado
          </p>
          <h1 className="mt-1 font-heading text-3xl font-bold sm:text-4xl">Avaliar</h1>
          <p className="mt-2 text-muted">
            {roles.isAdmin
              ? "Como admin você avalia qualquer edição."
              : `Você é jurado em ${roles.judgeFor.length} ${
                  roles.judgeFor.length === 1 ? "edição" : "edições"
                }.`}
          </p>
        </header>

        {editions.length === 0 ? (
          <EmptyState
            title="Nenhuma edição atribuída"
            description="Você ainda não foi indicado como jurado de nenhuma edição."
          />
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
                        <span className="font-mono tabular-nums">
                          {edition.presential_at
                            ? stripPeriods(DAY.format(new Date(edition.presential_at)))
                            : "a definir"}
                        </span>
                        {" · "}
                        <span className="font-mono tabular-nums">
                          {c.total === 0
                            ? roles.isAdmin
                              ? "nenhum projeto submetido"
                              : "nenhum projeto atribuído a você"
                            : `${c.rated} de ${c.total} avaliados`}
                        </span>
                      </p>
                    </div>

                    {c.total === 0 ? (
                      <span className="font-mono text-sm tabular-nums text-muted">
                        {roles.isAdmin ? "Aguardando submissões" : "Nada atribuído ainda"}
                      </span>
                    ) : (
                      <Link
                        href={`/judge/h/${edition.slug}`}
                        className={
                          done
                            ? "btn-secondary min-h-11 px-5 py-2 text-sm"
                            : "btn-primary min-h-11 px-5 py-2 text-sm text-green-dark"
                        }
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
