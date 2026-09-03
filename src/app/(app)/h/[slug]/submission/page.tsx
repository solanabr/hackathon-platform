import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import { PainelNav } from "@/components/edition/painel-nav";
import { Badge } from "@/components/ui/badge";
import { CopyLink } from "@/components/ui/copy-link";
import { SubmissionEditor } from "@/components/submission/submission-editor";
import { Countdown } from "@/components/ui/countdown";
import { getHackathonBySlug, isSubmissionWindowOpen, editionUsesTeams } from "@/lib/hackathon";
import {
  confirmedMemberIds,
  getRegistration,
  isProfileComplete,
  isRegistrationComplete,
  membersPendingRegistration,
} from "@/lib/registration";
import { getTeamForHackathon } from "@/lib/team";
import { requireUser } from "@/lib/user-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  DAY_MONTH as DAY,
  DAY_MONTH_LONG_TIME as FULL,
  stripPeriods as clean,
} from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function SubmissionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [state, hackathon] = await Promise.all([requireUser(), getHackathonBySlug(slug)]);
  if (!hackathon || hackathon.status === "draft") notFound();

  if (!isProfileComplete(state.profile)) redirect(`/account?next=/h/${slug}/submission`);

  const [registration, snapshot] = await Promise.all([
    getRegistration(state.userId, hackathon.id),
    getTeamForHackathon(state.userId, hackathon.id),
  ]);
  if (!isRegistrationComplete(registration)) redirect(`/h/${slug}/register`);
  if (!editionUsesTeams(hackathon)) redirect(`/h/${slug}/dashboard`);
  if (!snapshot) redirect(`/h/${slug}/dashboard`);

  const { team, submission, isLeader } = snapshot;
  const confirmed = await confirmedMemberIds(
    hackathon.id,
    snapshot.members.map((m) => m.user_id).filter(Boolean) as string[],
  );
  const membersPending = membersPendingRegistration(snapshot.members, confirmed).length;
  const membersAccepted = snapshot.members.filter((m) => m.status === "accepted").length;
  const open = isSubmissionWindowOpen(hackathon);
  const canEdit = open && !team.locked && isLeader;
  const windowOpen = open && !team.locked;

  let imagePublicUrl: string | null = null;
  if (submission.image_path) {
    const supabase = await createServerSupabaseClient();
    const { data } = supabase.storage.from("project-images").getPublicUrl(submission.image_path);
    imagePublicUrl = data.publicUrl;
  }

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <BackLink href={`/h/${slug}/dashboard`} label="Painel" />
          <PainelNav slug={slug} />
        </div>

        {submission.status === "submitted" ? (
          <div className="mt-4 rounded-2xl border border-emerald/40 bg-emerald/10 p-6 sm:p-8">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
              Projeto submetido
            </p>
            <h1 className="mt-2 font-heading text-3xl font-bold sm:text-4xl">Tudo certo, {team.name}.</h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
              Sua submissão está fechada e não pode mais ser editada. Acompanhe a divulgação dos
              finalistas pelo painel.
            </p>
            <div className="mt-5">
              <CopyLink href={`/h/${slug}/projetos/${submission.id}`} />
            </div>
          </div>
        ) : (
          <header className="mt-4">
            <p className="text-[12px] font-bold uppercase tracking-wider text-emerald">SUBMISSÃO</p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-heading text-3xl font-bold sm:text-4xl">{team.name}</h1>
              <Badge tone={canEdit ? "yellow" : windowOpen ? "neutral" : "neutral"}>
                {canEdit ? "Editável" : windowOpen ? "Somente leitura" : "Bloqueado"}
              </Badge>
            </div>
            {canEdit && (
              <p className="mt-1 text-sm text-muted">
                Você pode editar e salvar quantas vezes quiser até o prazo final. Encerra em{" "}
                <strong className="font-mono tabular-nums text-ink">
                  <Countdown deadlineIso={hackathon.submission_deadline_at} />
                </strong>
                .
              </p>
            )}
            {windowOpen && !isLeader && (
              <p className="mt-1 text-sm text-muted">
                Só o líder do time edita e envia a submissão. Você acompanha por aqui.
              </p>
            )}
            {!windowOpen && (
              <p className="mt-1 text-sm font-medium text-red-300">
                Prazo encerrado. As edições estão bloqueadas; o rascunho atual será considerado.
              </p>
            )}
          </header>
        )}

        {submission.status === "submitted" ? (
          <Card className="mt-8 p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald text-surface">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                  aria-hidden
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <div>
                <h2 className="font-heading text-xl font-bold">Projeto submetido</h2>
                {submission.submitted_at && (
                  <p className="mt-0.5 text-sm text-muted">
                    Submetido em {FULL.format(new Date(submission.submitted_at))} (horário de
                    Brasília).
                  </p>
                )}
              </div>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-muted">
              {hackathon.finalists_announced_at && (
                <>
                  Os finalistas saem em{" "}
                  <strong className="text-ink">
                    {clean(DAY.format(new Date(hackathon.finalists_announced_at)))}
                  </strong>
                  .{" "}
                </>
              )}
              {hackathon.presential_at && (
                <>
                  O Pitch Day é em{" "}
                  <strong className="text-ink">
                    {clean(DAY.format(new Date(hackathon.presential_at)))}
                  </strong>
                  {hackathon.location_city ? `, em ${hackathon.location_city}` : ""}.
                </>
              )}
            </p>
            <div className="mt-6 space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                Compartilhe seu projeto
              </p>
              <CopyLink href={`/h/${slug}/projetos/${submission.id}`} />
            </div>
            <div className="mt-6">
              <Link href={`/h/${slug}/dashboard`} className="btn-secondary">
                Voltar ao painel
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="mt-8 p-6 sm:p-8">
            <SubmissionEditor
              teamId={team.id}
              teamName={team.name}
              isLeader={isLeader}
              editable={canEdit}
              initial={submission}
              initialImageUrl={imagePublicUrl}
              dashboardHref={`/h/${slug}/dashboard`}
              membersPending={membersPending}
              membersAccepted={membersAccepted}
              judgeGithubHandle={hackathon.judge_github_handle}
            />
          </Card>
        )}
      </div>
    </div>
  );
}