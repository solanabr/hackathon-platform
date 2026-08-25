import { notFound, redirect } from "next/navigation";
import Link from "next/link";
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
        <Card className="mx-auto max-w-xl p-8 text-center">
          <h1 className="font-heading text-2xl font-bold">Você não está em um time</h1>
          <p className="mt-2 text-muted">
            Crie um time como líder, ou peça ao líder para te adicionar pelo e-mail que você usa aqui.
          </p>
          <div className="mt-6">
            <Link href={`/h/${slug}/team/new`}>
              <Button variant="primary">Criar time</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const { team, members, isLeader } = snapshot;
  const acceptedCount = members.filter((m) => m.status === "accepted").length;
  const canInvite = isLeader && !team.locked && acceptedCount + members.filter((m) => m.status === "pending").length < 4;

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <BackLink href={`/h/${slug}/dashboard`} label="Painel" />

        <Card className="p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge tone={team.locked ? "neutral" : "emerald"}>
                {team.locked ? "Bloqueado" : "Em edição"}
              </Badge>
              <h1 className="mt-3 font-heading text-3xl font-bold">{team.name}</h1>
              {team.description && <p className="mt-2 text-sm text-muted">{team.description}</p>}
            </div>
            <Link href={`/h/${slug}/submission`}>
              <Button variant="secondary">Ver submissão</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-7">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold">Integrantes ({acceptedCount}/4)</h2>
            {team.locked && <Badge tone="neutral">Submetido</Badge>}
          </div>
          <ul className="mt-4 divide-y divide-green/15">
            {members.map((m) => (
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

        <Card className="p-7">
          <h2 className="font-heading text-lg font-semibold">Gerenciar time</h2>
          <div className="mt-5">
            <TeamDangerZone
              teamId={team.id}
              slug={slug}
              isLeader={isLeader}
              locked={team.locked}
              aloneInTeam={acceptedCount === 1}
              candidates={members
                .filter((m) => !m.is_leader && m.status === "accepted" && m.user_id)
                .map((m) => ({
                  userId: m.user_id as string,
                  label: m.user?.full_name ?? m.invited_email,
                }))}
            />
          </div>
        </Card>

        {canInvite && (
          <Card className="p-7">
            <h2 className="font-heading text-lg font-semibold">Adicionar integrante</h2>
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
