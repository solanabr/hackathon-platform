import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import { PainelNav } from "@/components/edition/painel-nav";
import { Badge } from "@/components/ui/badge";
import { AddMemberForm } from "@/components/team/add-member-form";
import { PendingInviteActions } from "@/components/team/pending-invite-actions";
import { TeamDangerZone } from "@/components/team/team-danger-zone";
import { MemberRow } from "@/components/team/member-row";
import { RecruitingCard } from "./recruiting-card";
import { ApplicationsCard, type PendingApplication } from "./applications-card";
import { getHackathonBySlug } from "@/lib/hackathon";
import { getRegistration, isProfileComplete, isRegistrationComplete } from "@/lib/registration";
import { getPendingTeamForHackathon, getTeamForHackathon } from "@/lib/team";
import { requireUser } from "@/lib/user-state";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { unwrap } from "@/lib/supabase/unwrap";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [state, hackathon] = await Promise.all([requireUser(), getHackathonBySlug(slug)]);
  if (!hackathon || hackathon.status === "draft") notFound();

  if (!isProfileComplete(state.profile)) redirect(`/account?next=/h/${slug}/register`);

  const [registration, snapshot, pendingTeam] = await Promise.all([
    getRegistration(state.userId, hackathon.id),
    getTeamForHackathon(state.userId, hackathon.id),
    getPendingTeamForHackathon(hackathon.id),
  ]);
  if (!isRegistrationComplete(registration)) redirect(`/h/${slug}/register`);
  if (!snapshot) {
    if (pendingTeam) {
      return (
        <div className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl space-y-6">
          <PainelNav slug={slug} />
          <Card sticker className="mx-auto max-w-xl p-8 text-center">
            <h1 className="font-heading text-2xl font-bold">
              Você foi adicionado ao time {pendingTeam.teamName}
            </h1>
            <p className="mt-2 text-muted">
              {pendingTeam.leaderName ?? "O líder do time"} te convidou por e-mail.{" "}
              {pendingTeam.locked || pendingTeam.full
                ? "O time já está com a submissão fechada ou sem vagas: sua entrada fica pendente até o líder liberar um lugar."
                : "Você decide: aceite para entrar no time, ou recuse para liberar a vaga."}
            </p>
            <PendingInviteActions
              teamId={pendingTeam.teamId}
              blocked={pendingTeam.locked || pendingTeam.full}
            />
            <div className="mt-4">
              <Link
                href={`/h/${slug}/dashboard`}
                className="text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline"
              >
                Voltar ao painel
              </Link>
            </div>
          </Card>
          </div>
        </div>
      );
    }
    return (
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
        <PainelNav slug={slug} />
        <div className="relative mx-auto max-w-xl overflow-hidden rounded-3xl border-2 border-green-dark bg-surface-raised p-10 text-center shadow-sticker">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 opacity-[0.12]">
            <Image
              src="/brand/stbr/elements/morth-12.svg"
              alt=""
              width={260}
              height={260}
              className="animate-float-b"
            />
          </div>
          <div className="relative">
            <h1 className="font-heading text-2xl font-bold">Você não está em um time</h1>
            <p className="mx-auto mt-2 max-w-sm text-muted">
              Crie um time como líder, encontre um time no mural, ou peça ao líder para te
              adicionar pelo e-mail que você usa aqui.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href={`/h/${slug}/team/new`}>
                <Button variant="primary">Criar time</Button>
              </Link>
              <Link href={`/h/${slug}/team-up`}>
                <Button variant="secondary">Encontrar time</Button>
              </Link>
            </div>
          </div>
        </div>
        </div>
      </div>
    );
  }

  const { team, members, isLeader } = snapshot;
  const acceptedMembers = members.filter((m) => m.status === "accepted");
  const pendingMembers = members.filter((m) => m.status === "pending");
  const acceptedCount = acceptedMembers.length;
  const canInvite = isLeader && !team.locked && acceptedCount + pendingMembers.length < 4;
  const canRecruit = isLeader && !team.locked;

  let opening: { roles: string[]; note: string | null; active: boolean } | null = null;
  let applications: PendingApplication[] = [];
  if (canRecruit) {
    const supabase = await createServerSupabaseClient();
    const admin = await createServiceRoleClient();
    const [openingResult, applicationsResult] = await Promise.all([
      supabase.from("team_openings").select("roles, note, active").eq("team_id", team.id).maybeSingle(),
      admin
        .from("team_applications")
        .select(
          "id, message, created_at, applicant:users!team_applications_user_id_fkey(id, full_name, avatar_url, headline, github_url, twitter_url, linkedin_url, telegram_handle)",
        )
        .eq("team_id", team.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
    ]);
    opening = unwrap(openingResult, "team.page.opening");
    applications = (unwrap(applicationsResult, "team.page.applications") as unknown as PendingApplication[]) ?? [];
  }
  const showApplicationsCard = canRecruit && (applications.length > 0 || Boolean(opening?.active));

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <BackLink href={`/h/${slug}/dashboard`} label="Painel" />
          <PainelNav slug={slug} />
        </div>

        <header className="rounded-3xl border-2 border-green-dark bg-surface-raised p-7 shadow-sticker">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
                Time
              </p>
              <h1 className="mt-1 font-heading text-3xl font-bold">{team.name}</h1>
              {team.description && team.description !== team.name && (
                <p className="mt-2 text-sm text-muted">{team.description}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-3">
              <Badge tone={team.locked ? "neutral" : "emerald"}>
                {team.locked ? "Bloqueado" : "Em edição"}
              </Badge>
              <Link href={`/h/${slug}/submission`}>
                <Button variant="secondary" className="px-5 py-2 text-sm">
                  Ver submissão
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <Card sticker className="p-7">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
            Membros
          </p>
          <div className="mt-1 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold">Integrantes</h2>
            <p className="font-mono text-xs tabular-nums text-muted">{acceptedCount}/4</p>
          </div>
          {isLeader && !team.locked && acceptedCount > 1 && (
            <p className="mt-1 text-xs text-muted">
              Quem for líder passa a ser a única pessoa que edita e envia a submissão.
            </p>
          )}
          <ul className="mt-4 divide-y divide-green-dark/10">
            {acceptedMembers.map((m) => (
              <MemberRow
                key={m.id}
                memberId={m.id}
                userId={m.user_id}
                teamId={team.id}
                slug={slug}
                email={m.user?.email ?? m.invited_email}
                fullName={m.user?.full_name ?? null}
                avatarUrl={m.user?.avatar_url ?? null}
                isLeader={m.is_leader}
                status={m.status}
                hasAccount={!!m.user}
                canRemove={isLeader && !m.is_leader && !team.locked}
                canPromote={isLeader && !m.is_leader && !team.locked && !!m.user_id}
              />
            ))}
          </ul>
        </Card>

        {pendingMembers.length > 0 && (
          <div className="rounded-2xl border-2 border-green-dark bg-emerald/10 p-6 shadow-sticker">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
              Convites pendentes
            </p>
            <p className="mt-1 text-sm text-muted">
              Ainda não aceitaram. A pessoa entra no time ao se cadastrar com este e-mail.
            </p>
            <ul className="mt-4 divide-y divide-emerald/15">
              {pendingMembers.map((m) => (
                <MemberRow
                  key={m.id}
                  memberId={m.id}
                  userId={m.user_id}
                  teamId={team.id}
                  slug={slug}
                  email={m.user?.email ?? m.invited_email}
                  fullName={m.user?.full_name ?? null}
                  avatarUrl={m.user?.avatar_url ?? null}
                  isLeader={m.is_leader}
                  status={m.status}
                  hasAccount={!!m.user}
                  canRemove={isLeader && !m.is_leader && !team.locked}
                  canPromote={false}
                />
              ))}
            </ul>
          </div>
        )}

        {!team.locked && (isLeader ? acceptedCount === 1 : true) && (
          <Card sticker className="p-6">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
              Gestão
            </p>
            <h2 className="mt-1 font-heading text-lg font-semibold">
              {isLeader ? "Excluir o time" : "Sair do time"}
            </h2>
            <div className="mt-3">
              <TeamDangerZone
                teamId={team.id}
                slug={slug}
                isLeader={isLeader}
                locked={team.locked}
                aloneInTeam={acceptedCount === 1}
              />
            </div>
          </Card>
        )}

        {canInvite && (
          <Card sticker className="p-7">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
              Convites
            </p>
            <h2 className="mt-1 font-heading text-lg font-semibold">Adicionar integrante</h2>
            <p className="mt-1 text-sm text-muted">
              Digite o e-mail. Se a pessoa já tiver conta, ela recebe o convite e aceita no
              painel. Senão, entra automaticamente ao se cadastrar com este e-mail.
            </p>
            <div className="mt-5">
              <AddMemberForm teamId={team.id} />
            </div>
          </Card>
        )}

        {canRecruit &&
          (acceptedCount >= 4 && !opening?.active ? (
            <Card sticker className="p-6">
              <p className="font-heading text-lg font-bold">Recrutamento</p>
              <p className="mt-2 text-sm text-muted">
                Time completo — não é possível anunciar vagas com 4 integrantes.
              </p>
            </Card>
          ) : (
            <RecruitingCard slug={slug} teamId={team.id} initial={opening} />
          ))}

        {showApplicationsCard && <ApplicationsCard applications={applications} />}
      </div>
    </div>
  );
}
