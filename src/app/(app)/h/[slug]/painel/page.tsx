import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Countdown } from "@/components/ui/countdown";
import { PhaseTimeline, type Phase } from "@/components/edition/phase-timeline";
import { getHackathonBySlug, isSubmissionWindowOpen } from "@/lib/hackathon";
import { getRegistration, isRegistrationComplete } from "@/lib/registration";
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
  if (!isRegistrationComplete(registration)) redirect(`/h/${slug}/inscricao`);

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
  const { data: memberRegs } = memberIds.length
    ? await supabase
        .from("hackathon_registrations")
        .select("user_id, luma_confirmed_at")
        .eq("hackathon_id", hackathon.id)
        .in("user_id", memberIds)
    : { data: [] };

  const confirmedIds = new Set(
    ((memberRegs as { user_id: string; luma_confirmed_at: string | null }[] | null) ?? [])
      .filter((r) => r.luma_confirmed_at)
      .map((r) => r.user_id),
  );

  const submission = snapshot?.submission;
  const missing = submission
    ? REQUIRED.filter((f) => {
        const v = (submission as unknown as Record<string, unknown>)[f.key];
        return f.key === "github_access_granted" ? v !== true : !v || String(v).trim() === "";
      })
    : REQUIRED;

  const phases: Phase[] = [
    {
      key: "fase1",
      label: "Fase 1, online",
      when: `${clean(DAY.format(new Date(hackathon.starts_at)))} a ${clean(DAY.format(new Date(hackathon.registration_closes_at ?? hackathon.submission_deadline_at)))}`,
      detail: "Aulas e mentorias. Monte seu time nesse período.",
      at: new Date(hackathon.starts_at).getTime(),
    },
    {
      key: "submissao",
      label: "Submissão",
      when: `${clean(DAY.format(new Date(hackathon.submission_deadline_at)))}, ${TIME.format(new Date(hackathon.submission_deadline_at))}`,
      detail: "O líder envia deck, demo e repositório.",
      at: new Date(hackathon.submission_deadline_at).getTime(),
    },
    ...(hackathon.finalists_announced_at
      ? [
          {
            key: "selecao",
            label: "Seleção",
            when: clean(DAY.format(new Date(hackathon.finalists_announced_at))),
            detail: `Os ${hackathon.finalists_count} finalistas são anunciados.`,
            at: new Date(hackathon.finalists_announced_at).getTime(),
          },
        ]
      : []),
    ...(hackathon.presential_at
      ? [
          {
            key: "fase2",
            label: "Fase 2, presencial",
            when: clean(DAY.format(new Date(hackathon.presential_at))),
            detail: "Pitch Day e premiação.",
            at: new Date(hackathon.presential_at).getTime(),
          },
        ]
      : []),
  ];

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold sm:text-4xl">
              Olá, {state.profile?.full_name?.split(" ")[0]}.
            </h1>
            <p className="mt-1 text-muted">{hackathon.name}</p>
          </div>

          <div className="rounded-2xl border border-green/15 bg-surface-raised px-5 py-3">
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
          </div>
        </header>

        <section aria-label="Etapas">
          <PhaseTimeline phases={phases} now={now} />
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section
            aria-label="Seu time"
            className="rounded-2xl border border-green/15 bg-surface-raised/70 p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-heading text-xl font-bold">
                {snapshot ? snapshot.team.name : "Seu time"}
              </h2>
              {snapshot && (
                <Link
                  href={`/h/${slug}/time`}
                  className="shrink-0 text-sm font-semibold text-emerald underline-offset-4 hover:underline"
                >
                  Gerenciar
                </Link>
              )}
            </div>

            {snapshot ? (
              <>
                <ul className="mt-4 space-y-2.5">
                  {snapshot.members.map((m) => {
                    const name = m.user?.full_name ?? m.invited_email;
                    const confirmed = m.user_id ? confirmedIds.has(m.user_id) : false;
                    return (
                      <li key={m.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate">
                          {name}
                          {m.is_leader && (
                            <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                              líder
                            </span>
                          )}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            confirmed
                              ? "bg-emerald/12 text-emerald"
                              : "bg-yellow/25 text-ink"
                          }`}
                        >
                          {confirmed ? "inscrição ok" : "falta confirmar"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {snapshot.members.some((m) => !(m.user_id && confirmedIds.has(m.user_id))) && (
                  <p className="mt-4 text-sm leading-relaxed text-muted">
                    Todos os integrantes precisam confirmar a inscrição antes de o líder submeter.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Você ainda não está em um time. Crie o seu como líder, ou peça para o líder do seu
                  time te adicionar pelo e-mail <strong className="text-ink">{state.email}</strong>.
                </p>
                <Link href={`/h/${slug}/time/novo`} className="btn-primary mt-5 px-5 py-2 text-sm">
                  Criar time
                </Link>
              </>
            )}
          </section>

          <section
            aria-label="Sua submissão"
            className="rounded-2xl border border-green/15 bg-surface-raised/70 p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-heading text-xl font-bold">Submissão</h2>
              {snapshot && (
                <Link
                  href={`/h/${slug}/submissao`}
                  className="shrink-0 text-sm font-semibold text-emerald underline-offset-4 hover:underline"
                >
                  {submitted ? "Ver" : "Editar"}
                </Link>
              )}
            </div>

            {!snapshot ? (
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Disponível assim que você estiver em um time.
              </p>
            ) : submitted ? (
              <div className="mt-4">
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
                <p className="mt-3 text-sm text-muted">
                  {missing.length === 0
                    ? "Tudo preenchido. O líder pode enviar."
                    : `Faltam ${missing.length} de ${REQUIRED.length} itens.`}
                </p>
                <ul className="mt-4 space-y-2">
                  {REQUIRED.map((f) => {
                    const done = !missing.some((m) => m.key === f.key);
                    return (
                      <li key={f.key} className="flex items-center gap-2.5 text-sm">
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                            done ? "bg-emerald text-surface" : "bg-green/10 text-muted"
                          }`}
                        >
                          {done ? "✓" : ""}
                        </span>
                        <span className={done ? "text-muted line-through" : ""}>{f.label}</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>
        </div>

        <section
          aria-label="Conteúdos"
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-green/15 bg-surface-raised/70 p-6"
        >
          <div>
            <h2 className="font-heading text-xl font-bold">Conteúdos</h2>
            <p className="mt-1 text-sm text-muted">
              {publishedCount ?? 0} de {totalCount ?? 0} disponíveis. As gravações entram depois de
              cada encontro.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/h/${slug}/conteudos`} className="btn-primary px-5 py-2 text-sm">
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
        </section>
      </div>
    </div>
  );
}
