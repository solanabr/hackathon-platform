import { DAY_MONTH, DAY_MONTH_LONG_TIME, stripPeriods } from "@/lib/dates";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Morth } from "@/components/ui/morth";
import { Countdown } from "@/components/ui/countdown";
import { Card } from "@/components/ui/card";
import { CopyLink } from "@/components/ui/copy-link";
import { Badge } from "@/components/ui/badge";
import { BackLink } from "@/components/ui/back-link";
import { SectionCard, StatusChip, CheckRow } from "@/components/ui/section-card";
import { EditionInfoCard } from "@/components/edition/info-card";
import { Avatar } from "@/components/ui/avatar";
import { PainelNav } from "@/components/edition/painel-nav";
import { buildMilestones } from "@/lib/milestones";
import {
  getHackathonBySlug,
  isSubmissionWindowOpen,
  submissionTarget,
  teamLimits,
  editionUsesMentorship,
} from "@/lib/hackathon";
import { ExternalSubmissionPanel } from "@/components/edition/external-submission-panel";
import {
  confirmedMemberIds,
  getRegistration,
  isRegistrationComplete,
  membersPendingRegistration,
} from "@/lib/registration";
import { getPendingTeamForHackathon, getTeamForHackathon } from "@/lib/team";
import { TRACK_LABEL } from "@/lib/mentorship";
import { getMentorshipBoard } from "@/lib/mentorship-server";
import { requireUser } from "@/lib/user-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/supabase/unwrap";

export const dynamic = "force-dynamic";

const DAY = DAY_MONTH;

const FULL = DAY_MONTH_LONG_TIME;

const clean = stripPeriods;

// project_name is not listed: it mirrors the team name via trigger, so it can
// never be missing.
const REQUIRED: Array<{ key: string; label: string }> = [
  { key: "description", label: "Descrição" },
  { key: "pitch_deck_url", label: "Pitch deck" },
  { key: "pitch_video_url", label: "Vídeo demo" },
  { key: "github_url", label: "Repositório" },
  { key: "github_access_granted", label: "Acesso ao repositório" },
];

export default async function PainelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [state, hackathon] = await Promise.all([requireUser(), getHackathonBySlug(slug)]);
  if (!hackathon || hackathon.status === "draft") notFound();

  const supabase = await createServerSupabaseClient();
  const target = submissionTarget(hackathon);

  // Registration, team, pending invite and the schedule count only need the
  // user and the edition — one batch instead of four sequential round-trips.
  // External editions have no teams, so those two lookups are skipped.
  const [registration, snapshot, pendingTeam, scheduleResult] = await Promise.all([
    getRegistration(state.userId, hackathon.id),
    target.mode === "platform" ? getTeamForHackathon(state.userId, hackathon.id) : Promise.resolve(null),
    target.mode === "platform" ? getPendingTeamForHackathon(hackathon.id) : Promise.resolve(null),
    supabase
      .from("public_schedule")
      .select("id", { count: "exact", head: true })
      .eq("hackathon_id", hackathon.id),
  ]);
  if (!isRegistrationComplete(registration)) redirect(`/h/${slug}/register`);

  // After the registration redirect, not inside the batch above: the board RPC
  // raises for an unregistered caller, and only a team has mentorships at all.
  const mentorship =
    snapshot && editionUsesMentorship(hackathon) ? await getMentorshipBoard(hackathon.id) : null;

  if (scheduleResult.error) logQueryError("painel.scheduleCount", scheduleResult.error);
  const totalCount = scheduleResult.count;

  if (target.mode === "external") {
    return (
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <BackLink href={`/h/${slug}`} label={hackathon.name} />
            <PainelNav slug={slug} usesTeams={false} />
          </div>
          <ExternalSubmissionPanel
            hackathon={hackathon}
            slug={slug}
            firstName={state.profile?.full_name?.split(" ")[0] ?? null}
            submissionUrl={target.url}
            contentCount={totalCount ?? 0}
          />
        </div>
      </div>
    );
  }

  const open = isSubmissionWindowOpen(hackathon);
  // Server component, one render per request — "now" is a request input.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const submitted = snapshot?.submission.status === "submitted";

  const memberIds = (snapshot?.members ?? []).map((m) => m.user_id).filter(Boolean) as string[];
  const confirmedIds = await confirmedMemberIds(hackathon.id, memberIds);
  const pendingMembers = membersPendingRegistration(snapshot?.members ?? [], confirmedIds);
  const acceptedMembers = (snapshot?.members ?? []).filter((m) => m.status === "accepted").length;
  const { min: teamMin } = teamLimits(hackathon);

  const submission = snapshot?.submission;
  const missing = submission
    ? REQUIRED.filter((f) => {
        const v = (submission as unknown as Record<string, unknown>)[f.key];
        return f.key === "github_access_granted" ? v !== true : !v || String(v).trim() === "";
      })
    : REQUIRED;

  // The checklist shows the team conditions too, so the count covers them.
  const checklistTotal = REQUIRED.length + 2;
  const checklistDone =
    REQUIRED.length -
    missing.length +
    (acceptedMembers >= teamMin ? 1 : 0) +
    (pendingMembers.length === 0 ? 1 : 0);

  // The hero counts down to whichever milestone comes next: the submission
  // deadline while the window is open, then the finalists, then Pitch Day.
  const finalistsAt = hackathon.finalists_announced_at
    ? new Date(hackathon.finalists_announced_at).getTime()
    : null;
  const pitchAt = hackathon.presential_at ? new Date(hackathon.presential_at).getTime() : null;

  const milestones = buildMilestones(hackathon);
  const closingLabel = milestones.find((m) => m.key === "ends")?.label ?? "Encerramento";

  const hero = (() => {
    if (open) {
      return {
        target: hackathon.submission_deadline_at,
        label: "Submissão fecha em",
        badge: null,
        tone: "yellow" as const,
      };
    }
    if (finalistsAt !== null && now < finalistsAt) {
      return {
        target: hackathon.finalists_announced_at as string,
        label: "Finalistas saem em",
        badge: "Submissão encerrada",
        tone: "neutral" as const,
      };
    }
    if (pitchAt !== null && now < pitchAt) {
      return {
        target: hackathon.presential_at as string,
        label: `${closingLabel} em`,
        badge: closingLabel,
        tone: "emerald" as const,
      };
    }
    return {
      target:
        hackathon.presential_at ??
        hackathon.finalists_announced_at ??
        hackathon.submission_deadline_at,
      label: "Edição encerrada",
      badge: "Edição encerrada",
      tone: "neutral" as const,
    };
  })();

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <BackLink href={`/h/${slug}`} label={hackathon.name} />
          <PainelNav slug={slug} />
        </div>

        <header className="relative overflow-hidden rounded-3xl border-2 border-green-dark bg-surface-raised p-6 shadow-sticker sm:p-8">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 opacity-[0.12]">
            <Morth id="05" width={320} height={320} className="animate-float-b" />
          </div>

          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
                Painel
              </p>
              <h1 className="mt-2 font-heading text-3xl font-black uppercase tracking-tight [font-stretch:118%] sm:text-4xl">
                Olá, {state.profile?.full_name?.split(" ")[0]}.
              </h1>
              <p className="mt-1.5 font-semibold text-muted">{hackathon.name}</p>
            </div>

            <div className="rounded-2xl border-2 border-green-dark bg-yellow/20 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                  {hero.label}
                </p>
                {hero.badge && <Badge tone={hero.tone}>{hero.badge}</Badge>}
              </div>
              <Countdown
                deadlineIso={hero.target}
                variant="segments"
                size="md"
                className="mt-2 !justify-start !gap-3"
              />
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                {FULL.format(new Date(hero.target))}
              </p>
            </div>
          </div>
        </header>

        {pendingTeam && (
          <Card sticker className="p-5 sm:p-6">
            <p className="font-heading text-lg font-bold">
              Você foi adicionado ao time {pendingTeam.teamName}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {pendingTeam.leaderName ?? "O líder do time"} te convidou para participar. Entre no
              time para ver o projeto e a submissão.
            </p>
            <Link href={`/h/${slug}/team`} className="btn-primary mt-4 inline-block px-5 py-2 text-sm">
              Entrar no time
            </Link>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="space-y-6">
          <SectionCard
            sticker
            title={snapshot ? snapshot.team.name : "Você ainda não tem time"}
            action={snapshot ? { href: `/h/${slug}/team`, label: "Gerenciar" } : undefined}
          >
            {snapshot ? (
              <>
                <ul className="space-y-2.5">
                  {snapshot.members.map((m) => {
                    const name = m.user?.full_name ?? m.invited_email;
                    const confirmed = m.user_id ? confirmedIds.has(m.user_id) : false;
                    return (
                      <li key={m.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Avatar
                            src={m.user?.avatar_url}
                            name={name}
                            size="sm"
                            className={m.is_leader ? "ring-2 ring-emerald/20" : ""}
                          />
                          <span className="min-w-0 truncate">
                            {name}
                            {m.is_leader && (
                              <span className="ml-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-yellow">
                                líder
                              </span>
                            )}
                          </span>
                        </span>
                        <StatusChip tone={confirmed ? "ok" : "pending"}>
                          {confirmed ? "inscrição ok" : "falta confirmar"}
                        </StatusChip>
                      </li>
                    );
                  })}
                </ul>
                {pendingMembers.length > 0 && (
                  <p className="mt-4 rounded-xl border border-yellow/25 bg-yellow/10 px-4 py-3 text-sm leading-relaxed text-ink">
                    Todos os integrantes precisam confirmar a inscrição antes de o líder submeter.
                  </p>
                )}
              </>
            ) : (
              <div className="relative flex flex-col items-center overflow-hidden rounded-xl px-4 py-6 text-center">
                <Morth id="12" width={120} height={120} className="opacity-20" />
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Crie o seu como líder, ou peça para o líder do seu time te adicionar pelo e-mail{" "}
                  <strong className="text-ink">{state.email}</strong>.
                </p>
                <Link href={`/h/${slug}/team/new`} className="btn-primary mt-5 px-5 py-2 text-sm">
                  Criar time
                </Link>
                <p className="mt-3 text-sm text-muted">
                  Ainda sem time?{" "}
                  <Link
                    href={`/h/${slug}/team-up`}
                    className="font-semibold text-emerald underline-offset-4 hover:underline"
                  >
                    Encontre um time ou chame alguém
                  </Link>
                </p>
              </div>
            )}
          </SectionCard>

          <SectionCard
            sticker
            title="Submissão"
            action={
              snapshot
                ? { href: `/h/${slug}/submission`, label: submitted ? "Ver" : "Editar" }
                : undefined
            }
          >
            {!snapshot ? (
              <p className="text-sm leading-relaxed text-muted">
                Disponível assim que você estiver em um time.
              </p>
            ) : submitted ? (
              <div className="rounded-2xl border border-emerald/40 bg-emerald/10 p-5">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
                  Projeto enviado
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted">
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
                      {closingLabel} é em{" "}
                      <strong className="text-emerald">
                        {clean(DAY.format(new Date(hackathon.presential_at)))}
                      </strong>
                      {hackathon.location_city ? `, em ${hackathon.location_city}` : ""}.
                    </>
                  )}
                </p>
                <div className="mt-5 space-y-1.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">
                    Compartilhe seu projeto
                  </p>
                  <CopyLink href={`/h/${slug}/projetos/${snapshot.submission.id}`} />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted">
                    {checklistDone === checklistTotal
                      ? "Tudo pronto. O líder pode enviar."
                      : missing.length > 0
                        ? `Faltam ${checklistTotal - checklistDone} de ${checklistTotal} itens.`
                        : acceptedMembers < teamMin
                          ? `O time precisa de pelo menos ${teamMin} integrantes.`
                          : `Falta a inscrição de ${pendingMembers.length} ${
                              pendingMembers.length === 1 ? "integrante" : "integrantes"
                            }.`}
                  </p>
                  <p className="shrink-0 font-mono text-xs tabular-nums text-ink">
                    {checklistDone}/{checklistTotal} itens
                  </p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-deep">
                  <div
                    className="h-1.5 rounded-full bg-emerald transition-[width]"
                    style={{ width: `${(checklistDone / checklistTotal) * 100}%` }}
                  />
                </div>
                <ul className="mt-4 space-y-2.5">
                  {REQUIRED.map((f) => (
                    <CheckRow key={f.key} done={!missing.some((m) => m.key === f.key)}>
                      {f.label}
                    </CheckRow>
                  ))}
                  <CheckRow done={acceptedMembers >= teamMin}>
                    Pelo menos {teamMin} integrantes no time
                  </CheckRow>
                  <CheckRow done={pendingMembers.length === 0}>
                    Time todo confirmado na inscrição
                  </CheckRow>
                </ul>
              </>
            )}
          </SectionCard>
          </div>

          <aside className="space-y-6">
            <EditionInfoCard hackathon={hackathon} />
            {mentorship && (mentorship.mentors.length > 0 || mentorship.bookings.length > 0) && (
              <Card sticker className="p-6 sm:p-7">
                <h2 className="font-heading text-xl font-bold">Mentorias</h2>
                {mentorship.bookings.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm text-muted">
                    {mentorship.bookings.map((booking) => (
                      <li key={booking.id}>
                        <span className="font-bold text-ink">{TRACK_LABEL[booking.track]}:</span>{" "}
                        {booking.mentor_name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    Seu time escolhe um mentor técnico e um de negócios. O horário é marcado na
                    agenda do mentor.
                  </p>
                )}
                <Link
                  href={`/h/${slug}/mentorship`}
                  className={`${mentorship.isLeader ? "btn-primary" : "btn-secondary"} mt-4 inline-block px-5 py-2 text-sm`}
                >
                  {mentorship.isLeader && mentorship.bookings.length === 0
                    ? "Escolher mentores"
                    : "Ver mentorias"}
                </Link>
              </Card>
            )}
            {(totalCount ?? 0) > 0 && (
              <Card sticker className="p-6 sm:p-7">
                <h2 className="font-heading text-xl font-bold">Conteúdos</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  Explore os conteúdos e materiais disponíveis da edição — gravações, arquivos e
                  links.
                </p>
                <Link
                  href={`/h/${slug}/content`}
                  className="btn-primary mt-4 inline-block px-5 py-2 text-sm"
                >
                  Ver conteúdos
                </Link>
              </Card>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
