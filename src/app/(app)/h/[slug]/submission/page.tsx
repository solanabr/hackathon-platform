import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import { Badge } from "@/components/ui/badge";
import { CopyLink } from "@/components/ui/copy-link";
import { SubmissionEditor } from "@/components/submission/submission-editor";
import { Countdown } from "@/components/ui/countdown";
import { getHackathonBySlug, isSubmissionWindowOpen } from "@/lib/hackathon";
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

export const dynamic = "force-dynamic";

export default async function SubmissionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const state = await requireUser();
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon || hackathon.status === "draft") notFound();

  if (!isProfileComplete(state.profile)) redirect(`/account?next=/h/${slug}/submission`);

  const registration = await getRegistration(state.userId, hackathon.id);
  if (!isRegistrationComplete(registration)) redirect(`/h/${slug}/register`);

  const snapshot = await getTeamForHackathon(state.userId, hackathon.id);
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
        <BackLink href={`/h/${slug}/dashboard`} label="Painel" />

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
              <CopyLink href={`/h/${slug}/dashboard`} label="Copiar link do projeto" />
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

        <Card className="mt-8 p-6 sm:p-8">
          <SubmissionEditor
            teamId={team.id}
            isLeader={isLeader}
            editable={canEdit}
            initial={submission}
            initialImageUrl={imagePublicUrl}
            dashboardHref={`/h/${slug}/dashboard`}
            membersPending={membersPending}
            membersAccepted={membersAccepted}
          />
        </Card>
      </div>
    </div>
  );
}