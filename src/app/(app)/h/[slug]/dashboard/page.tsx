import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Countdown } from "@/components/ui/countdown";
import { Card } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import { SectionCard, StatusChip, CheckRow } from "@/components/ui/section-card";
import { Avatar } from "@/components/ui/avatar";
import { PhaseTimeline, type Phase } from "@/components/edition/phase-timeline";
import { getHackathonBySlug, isSubmissionWindowOpen, phaseBoundaries } from "@/lib/hackathon";
import {
  confirmedMemberIds,
  getRegistration,
  isRegistrationComplete,
  membersPendingRegistration,
} from "@/lib/registration";
import { getTeamForHackathon } from "@/lib/team";
import { requireUser } from "@/lib/user-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DAY = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "America/Sao_Paulo",
});

const FULL = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const TIME = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function clean(s: string): string {
  return s.replace(/\./g, "");
}

const REQUIRED: Array<{ key: string; label: string }> = [
  { key: "project_name", label: "Nome do projeto" },
  { key: "description", label: "Descrição" },
  { key: "pitch_deck_url", label: "Pitch deck" },
  { key: "pitch_video_url", label: "Vídeo demo" },
  { key: "github_url", label: "Repositório" },
  { key: "github_access_granted", label: "Acesso ao repositório" },
];

export default async function PainelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const state = await requireUser();
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon || hackathon.status === "draft") notFound();

  const registration = await getRegistration(state.userId, hackathon.id);
  if (!isRegistrationComplete(registration)) redirect(`/h/${slug}/register`);

  const snapshot = await getTeamForHackathon(state.userId, hackathon.id);
  const open = isSubmissionWindowOpen(hackathon);
  const now = Date.now();
  const submitted = snapshot?.submission.status === "submitted";

  const supabase = await createServerSupabaseClient();

  const { count: publishedCount } = await supabase
    .from("hackathon_contents")
    .select("id", { count: "exact", head: true })
    .eq("hackathon_id", hackathon.id);

  const { count: totalCount } = await supabase
    .from("public_schedule")
    .select("id", { count: "exact", head: true })
    .eq("hackathon_id", hackathon.id);

  const memberIds = (snapshot?.members ?? []).map((m) => m.user_id).filter(Boolean) as string[];
  const confirmedIds = await confirmedMemberIds(hackathon.id, memberIds);
  const pendingMembers = membersPendingRegistration(snapshot?.members ?? [], confirmedIds);
  const acceptedMembers = (snapshot?.members ?? []).filter((m) => m.status === "accepted").length;

  const submission = snapshot?.submission;
  const missing = submission
    ? REQUIRED.filter((f) => {
        const v = (submission as unknown as Record<string, unknown>)[f.key];
        return f.key === "github_access_granted" ? v !== true : !v || String(v).trim() === "";
      })
    : REQUIRED;

  const bounds = phaseBoundaries(hackathon);
  const phases: Phase[] = [
    {
      ...bounds.fase1,
      key: "fase1",
      label: "Fase 1, capacitação",
      when: `${clean(DAY.format(new Date(hackathon.starts_at)))} a ${clean(DAY.format(new Date(bounds.fase1.endsAt - 1)))}`,
      detail: "Minicursos e conteúdos preparatórios. Monte seu time nesse período.",
    },
    {
      ...bounds.submissao,
      key: "submissao",
      label: "Desenvolvimento e submissão",
      when: `${clean(DAY.format(new Date(bounds.submissao.startsAt)))} a ${clean(DAY.format(new Date(hackathon.submission_deadline_at)))}, ${TIME.format(new Date(hackathon.submission_deadline_at))}`,
      detail: "Mentoria no dia 5. O líder envia deck, vídeo e repositório.",
    },
    ...(bounds.selecao && hackathon.finalists_announced_at
      ? [
          {
            ...bounds.selecao,
            key: "selecao",
            label: "Seleção",
            when: clean(DAY.format(new Date(hackathon.finalists_announced_at))),
            detail: hackathon.finalists_count
              ? `Os ${hackathon.finalists_count} finalistas são anunciados.`
              : "As equipes classificadas são anunciadas.",
          },
        ]
      : []),
    ...(bounds.fase2 && hackathon.presential_at
      ? [
          {
            ...bounds.fase2,
            key: "fase2",
            label: "Fase 2, presencial",
            when: clean(DAY.format(new Date(hackathon.presential_at))),
            detail: "Pitch Day e premiação.",
          },
        ]
      : []),
  ];

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-10">
        <BackLink href={`/h/${slug}`} label={hackathon.name} />

        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold sm:text-4xl">
              Olá, {state.profile?.full_name?.split(" ")[0]}.
            </h1>
            <p className="mt-1 text-muted">{hackathon.name}</p>
          </div>

          <Card className="px-5 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
              {open ? "Submissão fecha em" : "Submissão encerrada"}
            </p>
            {open ? (
              <>
                <p className="font-heading text-xl font-bold">
                  <Countdown deadlineIso={hackathon.submission_deadline_at} />
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {FULL.format(new Date(hackathon.submission_deadline_at))}
                </p>
              </>
            ) : (
              <p className="font-heading text-xl font-bold">
                {FULL.format(new Date(hackathon.submission_deadline_at))}
              </p>
            )}
          </Card>
        </header>

        <section aria-label="Etapas">
          <PhaseTimeline phases={phases} now={now} />
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <SectionCard
            eyebrow="Seu time"
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
                          <Avatar src={m.user?.avatar_url} name={name} size="sm" />
                          <span className="min-w-0 truncate">
                            {name}
                            {m.is_leader && (
                              <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-muted">
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
                  <p className="mt-4 text-sm leading-relaxed text-muted">
                    Todos os integrantes precisam confirmar a inscrição antes de o líder submeter.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-muted">
                  Crie o seu como líder, ou peça para o líder do seu time te adicionar pelo e-mail{" "}
                  <strong className="text-ink">{state.email}</strong>.
                </p>
                <Link href={`/h/${slug}/team/new`} className="btn-primary mt-5 px-5 py-2 text-sm">
                  Criar time
                </Link>
              </>
            )}
          </SectionCard>

          <SectionCard
            eyebrow="Projeto"
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
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-emerald px-3 py-1 text-sm font-semibold text-surface">
                  Projeto enviado
                </p>
                <p className="mt-4 text-sm leading-relaxed text-muted">
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
              </div>
            ) : (
              <>
                <p className="text-sm text-muted">
                  {missing.length === 0 && pendingMembers.length === 0 && acceptedMembers >= 2
                    ? "Tudo pronto. O líder pode enviar."
                    : missing.length > 0
                      ? `Faltam ${missing.length} de ${REQUIRED.length} itens.`
                      : acceptedMembers < 2
                        ? "O time precisa de pelo menos 2 integrantes."
                        : `Falta a inscrição de ${pendingMembers.length} ${
                            pendingMembers.length === 1 ? "integrante" : "integrantes"
                          }.`}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {REQUIRED.map((f) => (
                    <CheckRow key={f.key} done={!missing.some((m) => m.key === f.key)}>
                      {f.label}
                    </CheckRow>
                  ))}
                  <CheckRow done={acceptedMembers >= 2}>
                    Pelo menos 2 integrantes no time
                  </CheckRow>
                  <CheckRow done={pendingMembers.length === 0}>
                    Time todo confirmado na inscrição
                  </CheckRow>
                </ul>
              </>
            )}
          </SectionCard>
        </div>

        <Card className="flex flex-wrap items-center justify-between gap-4 p-6 sm:p-7">
          <div>
            <h2 className="font-heading text-xl font-bold">Conteúdos</h2>
            <p className="mt-1 text-sm text-muted">
              {publishedCount ?? 0} de {totalCount ?? 0} disponíveis. As gravações entram depois de
              cada encontro.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/h/${slug}/content`} className="btn-primary px-5 py-2 text-sm">
              Ver conteúdos
            </Link>
            {hackathon.community_url && (
              <a
                href={hackathon.community_url}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary px-5 py-2 text-sm"
              >
                Comunidade
              </a>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
