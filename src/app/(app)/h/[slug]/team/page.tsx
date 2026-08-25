import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import { Badge } from "@/components/ui/badge";
import { AddMemberForm } from "@/components/team/add-member-form";
import { TeamDangerZone } from "@/components/team/team-danger-zone";
import { MemberRow } from "@/components/team/member-row";
import { getHackathonBySlug } from "@/lib/hackathon";
import { getRegistration, isProfileComplete, isRegistrationComplete } from "@/lib/registration";
import { getPendingTeamForHackathon, getTeamForHackathon } from "@/lib/team";
import { requireUser } from "@/lib/user-state";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const state = await requireUser();
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon || hackathon.status === "draft") notFound();

  if (!isProfileComplete(state.profile)) redirect(`/account?next=/h/${slug}/register`);

  const registration = await getRegistration(state.userId, hackathon.id);
  if (!isRegistrationComplete(registration)) redirect(`/h/${slug}/register`);

  const snapshot = await getTeamForHackathon(state.userId, hackathon.id);
  const pendingTeam = await getPendingTeamForHackathon(hackathon.id);
  if (!snapshot) {
    if (pendingTeam) {
      return (
        <div className="px-4 py-16 sm:px-6 lg:px-8">
          <Card className="mx-auto max-w-xl p-8 text-center">
            <h1 className="font-heading text-2xl font-bold">
              Você foi adicionado ao time {pendingTeam.teamName}
            </h1>
            <p className="mt-2 text-muted">
              {pendingTeam.leaderName ?? "O líder do time"} te adicionou por e-mail.{" "}
              {pendingTeam.locked || pendingTeam.full
                ? "O time já está com a submissão fechada ou sem vagas: sua entrada continua pendente até o líder liberar um lugar."
                : "A entrada é confirmada assim que você mantiver a inscrição completa."}
            </p>
            <div className="mt-6">
              <Link href={`/h/${slug}/dashboard`}>
                <Button variant="primary">Voltar ao painel</Button>
              </Link>
            </div>
          </Card>
        </div>
      );
    }
    return (
      <div className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-surface-raised p-10 text-center">
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
              Crie um time como líder, ou peça ao líder para te adicionar pelo e-mail que você usa
              aqui.
            </p>
            <div className="mt-6">
              <Link href={`/h/${slug}/team/new`}>
                <Button variant="primary">Criar time</Button>
              </Link>
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

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <BackLink href={`/h/${slug}/dashboard`} label="Painel" />

        <header className="rounded-3xl border border-white/10 bg-surface-raised p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wider text-emerald">TIME</p>
              <h1 className="mt-1 font-heading text-3xl font-bold">{team.name}</h1>
              {team.description && <p className="mt-2 text-sm text-muted">{team.description}</p>}
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

        <Card className="p-7">
          <p className="text-[12px] font-bold uppercase tracking-wider text-emerald">MEMBROS</p>
          <div className="mt-1 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold">Integrantes</h2>
            <p className="font-mono text-xs tabular-nums text-muted">{acceptedCount}/4</p>
          </div>
          <ul className="mt-4 divide-y divide-white/10">
            {acceptedMembers.map((m) => (
              <MemberRow
                key={m.id}
                memberId={m.id}
                email={m.user?.email ?? m.invited_email}
                fullName={m.user?.full_name ?? null}
                avatarUrl={m.user?.avatar_url ?? null}
                isLeader={m.is_leader}
                status={m.status}
                hasAccount={!!m.user}
                canRemove={isLeader && !m.is_leader && !team.locked}
              />
            ))}
          </ul>
        </Card>

        {pendingMembers.length > 0 && (
          <div className="rounded-2xl border border-emerald/40 bg-emerald/10 p-6">
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
                  email={m.user?.email ?? m.invited_email}
                  fullName={m.user?.full_name ?? null}
                  avatarUrl={m.user?.avatar_url ?? null}
                  isLeader={m.is_leader}
                  status={m.status}
                  hasAccount={!!m.user}
                  canRemove={isLeader && !m.is_leader && !team.locked}
                />
              ))}
            </ul>
          </div>
        )}

        <Card className="p-7">
          <p className="text-[12px] font-bold uppercase tracking-wider text-emerald">GESTÃO</p>
          <h2 className="mt-1 font-heading text-lg font-semibold">Zona de perigo</h2>
          <div className="mt-5">
            <TeamDangerZone
              teamId={team.id}
              slug={slug}
              isLeader={isLeader}
              locked={team.locked}
              aloneInTeam={acceptedCount === 1}
              candidates={acceptedMembers
                .filter((m) => !m.is_leader && m.user_id)
                .map((m) => ({
                  userId: m.user_id as string,
                  label: m.user?.full_name ?? m.invited_email,
                }))}
            />
          </div>
        </Card>

        {canInvite && (
          <Card className="p-7">
            <p className="text-[12px] font-bold uppercase tracking-wider text-emerald">CONVITES</p>
            <h2 className="mt-1 font-heading text-lg font-semibold">Adicionar integrante</h2>
            <p className="mt-1 text-sm text-muted">
              Digite o e-mail. Se a pessoa já tiver conta, entra direto no time.
              Senão, vai aparecer automaticamente quando ela se cadastrar com este e-mail.
            </p>
            <div className="mt-5">
              <AddMemberForm teamId={team.id} />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
