"use client";

import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { RatingForm } from "./rating-form";

export type Member = {
  email: string;
  full_name: string | null;
  is_leader: boolean;
  github_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  telegram_handle: string | null;
};

export type Rating = {
  judge_id: string;
  judge_email: string;
  judge_full_name: string | null;
  grade: number | null;
  comment: string | null;
  updated_at: string;
};

export type Row = {
  team_id: string;
  submission_id: string | null;
  team_name: string;
  team_locked: boolean;
  status: "draft" | "submitted";
  submitted_at: string | null;
  project_name: string | null;
  description: string | null;
  pitch_url: string | null;
  pitch_video_url: string | null;
  demo_video_url: string | null;
  github_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
  image_path: string | null;
  members: Member[];
  ratings: Rating[];
  my_rating: Rating | null;
};

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function SubmissionCard({ row }: { row: Row }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const imageUrl = row.image_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/project-images/${row.image_path}`
    : null;

  const submittedAtFull = row.submitted_at
    ? DATE_FORMATTER.format(new Date(row.submitted_at))
    : null;
  const submittedAtShort = row.submitted_at
    ? SHORT_DATE_FORMATTER.format(new Date(row.submitted_at))
    : null;

  const memberCountLabel = `${row.members.length} ${row.members.length === 1 ? "membro" : "membros"}`;

  const gradedRatings = row.ratings.filter((r) => r.grade !== null);
  const avgGrade =
    gradedRatings.length > 0
      ? gradedRatings.reduce((sum, r) => sum + (r.grade ?? 0), 0) / gradedRatings.length
      : null;
  const myJudgeId = row.my_rating?.judge_id ?? null;
  const otherRatings = myJudgeId
    ? row.ratings.filter((r) => r.judge_id !== myJudgeId)
    : row.ratings;

  function open() {
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) close();
  }

  const hasProjectLinks =
    row.github_url ||
    row.pitch_url ||
    row.pitch_video_url ||
    row.demo_video_url ||
    row.website_url ||
    row.twitter_url;

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="group block w-full rounded-2xl border border-bh-border bg-bh-surface/80 text-left backdrop-blur-sm transition hover:border-bh-violet/60 hover:bg-bh-surface focus:outline-none focus:ring-2 focus:ring-bh-violet/60"
      >
        <div className="flex gap-4 p-5">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-bh-border bg-bh-surface-2">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={row.project_name ?? row.team_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-bh-muted">
                sem imagem
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={row.status === "submitted" ? "emerald" : "neutral"}>
                {row.status === "submitted" ? "Submetido" : "Rascunho"}
              </Badge>
              {avgGrade !== null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-bh-violet px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white ring-1 ring-white/20">
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                    className="h-2.5 w-2.5"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
                  </svg>
                  {avgGrade.toFixed(1)} ({gradedRatings.length})
                </span>
              )}
            </div>
            <p className="truncate text-[11px] uppercase tracking-wider text-bh-muted">
              {row.team_name}
            </p>
            <h3 className="font-heading text-base font-semibold leading-tight text-bh-text transition-colors group-hover:text-bh-violet">
              {row.project_name ?? <span className="text-bh-muted">— sem nome —</span>}
            </h3>
            {row.description && (
              <p className="line-clamp-2 text-sm text-bh-muted">{row.description}</p>
            )}
            <p className="pt-0.5 text-[11px] text-bh-muted">
              {memberCountLabel}
              {submittedAtShort && ` · ${submittedAtShort}`}
            </p>
          </div>
        </div>
      </button>

      <dialog
        ref={dialogRef}
        onClick={handleBackdropClick}
        className="m-auto max-h-[90svh] w-[calc(100vw_-_2rem)] max-w-3xl overflow-hidden rounded-2xl border border-bh-border bg-bh-bg p-0 text-bh-text shadow-2xl backdrop:bg-bh-bg/80 backdrop:backdrop-blur-sm"
      >
        <div className="max-h-[90svh] overflow-y-auto">
          <div className="relative h-56 w-full bg-bh-surface-2">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={row.project_name ?? row.team_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-bh-muted">
                Sem imagem
              </div>
            )}
            <button
              type="button"
              onClick={close}
              aria-label="Fechar"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-bh-border bg-bh-bg/70 text-bh-text backdrop-blur-sm transition hover:bg-bh-bg"
            >
              ✕
            </button>
            <div className="absolute bottom-4 left-4">
              <Badge tone={row.status === "submitted" ? "emerald" : "neutral"}>
                {row.status === "submitted" ? "Submetido" : "Rascunho"}
              </Badge>
            </div>
          </div>

          <div className="space-y-6 p-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-bh-muted">{row.team_name}</p>
              <h2 className="mt-1 font-heading text-2xl font-bold sm:text-3xl">
                {row.project_name ?? <span className="text-bh-muted">— sem nome —</span>}
              </h2>
            </div>

            {row.description && (
              <section>
                <p className="text-xs uppercase tracking-wider text-bh-muted">Descrição</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-bh-text">
                  {row.description}
                </p>
              </section>
            )}

            {hasProjectLinks && (
              <section>
                <p className="text-xs uppercase tracking-wider text-bh-muted">Links do projeto</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {row.github_url && <LinkChip label="GitHub" href={row.github_url} />}
                  {row.pitch_url && <LinkChip label="Deck" href={row.pitch_url} />}
                  {row.pitch_video_url && <LinkChip label="Pitch" href={row.pitch_video_url} />}
                  {row.demo_video_url && <LinkChip label="Demo" href={row.demo_video_url} />}
                  {row.website_url && <LinkChip label="Site" href={row.website_url} />}
                  {row.twitter_url && <LinkChip label="X" href={row.twitter_url} />}
                </div>
              </section>
            )}

            <section>
              <p className="text-xs uppercase tracking-wider text-bh-muted">
                Time ({row.members.length})
              </p>
              <ul className="mt-3 space-y-3">
                {row.members.map((m) => (
                  <MemberRow key={m.email} member={m} />
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-bh-violet/30 bg-bh-violet/5 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs uppercase tracking-wider text-bh-violet">
                  Minha avaliação
                </p>
                {avgGrade !== null && (
                  <p className="text-xs text-bh-muted">
                    Média do painel:{" "}
                    <span className="font-semibold text-bh-text">
                      {avgGrade.toFixed(1)}
                    </span>{" "}
                    ({gradedRatings.length})
                  </p>
                )}
              </div>
              {row.submission_id ? (
                <div className="mt-3">
                  <RatingForm
                    submissionId={row.submission_id}
                    initialGrade={row.my_rating?.grade ?? null}
                    initialComment={row.my_rating?.comment ?? ""}
                  />
                </div>
              ) : (
                <p className="mt-2 text-sm text-bh-muted">
                  Submissão indisponível para avaliação.
                </p>
              )}
            </section>

            {otherRatings.length > 0 && (
              <section>
                <p className="text-xs uppercase tracking-wider text-bh-muted">
                  Outras avaliações ({otherRatings.length})
                </p>
                <ul className="mt-3 space-y-3">
                  {otherRatings.map((r) => (
                    <RatingRow key={r.judge_id} rating={r} />
                  ))}
                </ul>
              </section>
            )}

            {submittedAtFull && (
              <p className="border-t border-bh-border pt-4 text-xs text-bh-muted">
                Submetido em {submittedAtFull}
              </p>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}

function MemberRow({ member }: { member: Member }) {
  const initials =
    (member.full_name ?? member.email)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?";

  const hasSocials =
    member.github_url ||
    member.twitter_url ||
    member.linkedin_url ||
    member.telegram_handle;

  return (
    <li className="flex items-start gap-3 rounded-xl border border-bh-border bg-bh-surface-2 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-bh-border bg-bh-surface font-heading text-sm font-bold text-bh-text">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="font-medium text-bh-text">{member.full_name ?? member.email}</p>
          {member.is_leader && (
            <span className="text-[10px] uppercase tracking-wider text-stbr-yellow">Líder</span>
          )}
        </div>
        {member.full_name && (
          <p className="truncate text-xs text-bh-muted">{member.email}</p>
        )}
        {hasSocials && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {member.github_url && <SocialChip label="GitHub" href={member.github_url} />}
            {member.twitter_url && <SocialChip label="X" href={member.twitter_url} />}
            {member.linkedin_url && <SocialChip label="LinkedIn" href={member.linkedin_url} />}
            {member.telegram_handle && (
              <SocialChip
                label={`TG ${member.telegram_handle}`}
                href={`https://t.me/${member.telegram_handle.replace(/^@/, "")}`}
              />
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function RatingRow({ rating }: { rating: Rating }) {
  const display = rating.judge_full_name ?? rating.judge_email;
  const initials =
    display
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?";

  return (
    <li className="flex items-start gap-3 rounded-xl border border-bh-border bg-bh-surface-2 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-bh-border bg-bh-surface font-heading text-sm font-bold text-bh-text">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-bh-text">{display}</p>
            {rating.judge_full_name && (
              <p className="truncate text-xs text-bh-muted">{rating.judge_email}</p>
            )}
          </div>
          {rating.grade !== null && (
            <span className="shrink-0 rounded-full border border-bh-violet/40 bg-bh-violet/10 px-2.5 py-0.5 text-xs font-semibold text-purple-200">
              {rating.grade} / 10
            </span>
          )}
        </div>
        {rating.comment && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-bh-text">{rating.comment}</p>
        )}
      </div>
    </li>
  );
}

function LinkChip({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-full border border-bh-border bg-bh-surface-2 px-3 py-1 text-xs font-medium text-bh-text transition-colors hover:border-bh-violet hover:text-bh-violet"
    >
      {label} ↗
    </a>
  );
}

function SocialChip({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-full border border-bh-border/60 bg-bh-bg px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-bh-muted transition-colors hover:border-bh-violet hover:text-bh-violet"
    >
      {label}
    </a>
  );
}
