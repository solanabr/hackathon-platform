"use client";

import Link from "next/link";
import Image from "next/image";
import { useEntranceAnimation } from "@/hooks/use-entrance-animation";

export type EditionCardData = {
  slug: string;
  name: string;
  tagline: string | null;
  coverUrl: string | null;
  stage: "upcoming" | "running" | "finished";
  registrationOpen: boolean;
  startDay: number;
  startMonth: string;
  dateRange: string;
  locationName: string | null;
  locationCity: string | null;
  prizeSummary: string | null;
  registrationClosesLabel: string | null;
};

const STAGE_LABEL: Record<EditionCardData["stage"], string> = {
  upcoming: "Em breve",
  running: "Acontecendo agora",
  finished: "Encerrado",
};

export function EditionCard({ edition, index }: { edition: EditionCardData; index: number }) {
  const { ref, isVisible } = useEntranceAnimation<HTMLAnchorElement>();
  const e = edition;

  return (
    <Link
      ref={ref}
      href={`/h/${e.slug}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-white-10 bg-green-dark shadow-[0_8px_32px_rgba(0,140,76,0.12)] transition-[transform,opacity,border-color,box-shadow] duration-500 hover:-translate-y-1 hover:border-emerald/50 hover:shadow-[0_16px_48px_rgba(0,140,76,0.25)] hover:ring-2 hover:ring-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
      style={{ transitionDelay: `${150 + index * 120}ms` }}
    >
      <div className="relative flex h-44 items-center justify-center overflow-hidden">
        {e.coverUrl && (
          <Image src={e.coverUrl} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-green-dark via-green-dark/40 to-green-dark/10" />

        <div className="absolute left-4 top-4 rounded-xl bg-surface-raised px-3 py-2 text-center shadow-[0_8px_24px_rgba(0,140,76,0.2)]">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald">{e.startMonth}</p>
          <p className="font-heading text-2xl font-bold leading-none text-ink">{e.startDay}</p>
        </div>

        {e.registrationOpen ? (
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-yellow px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink shadow-[0_8px_24px_rgba(0,140,76,0.2)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute h-full w-full animate-ping rounded-full bg-ink/40" />
              <span className="relative h-2 w-2 rounded-full bg-ink" />
            </span>
            Inscrições abertas
          </span>
        ) : (
          <span className="absolute right-4 top-4 rounded-full bg-surface/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink backdrop-blur-sm">
            {STAGE_LABEL[e.stage]}
          </span>
        )}

        {!e.coverUrl && (
          <h3 className="relative z-10 px-8 text-center font-heading text-2xl font-bold leading-tight text-ink">
            {e.name}
          </h3>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {e.coverUrl && (
          <h3 className="font-heading text-xl font-bold leading-tight text-ink">{e.name}</h3>
        )}
        {e.tagline && <p className="line-clamp-2 text-sm leading-relaxed text-muted">{e.tagline}</p>}

        <dl className="mt-auto space-y-1.5 text-sm text-muted">
          <div className="flex items-baseline gap-2">
            <dt className="w-14 shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted">Quando</dt>
            <dd className="min-w-0 font-semibold">{e.dateRange}</dd>
          </div>
          {(e.locationName || e.locationCity) && (
            <div className="flex items-baseline gap-2">
              <dt className="w-14 shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted">Onde</dt>
              <dd className="min-w-0 line-clamp-1">{e.locationCity ?? e.locationName}</dd>
            </div>
          )}
          {e.prizeSummary && (
            <div className="flex items-baseline gap-2">
              <dt className="w-14 shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted">Prêmios</dt>
              <dd className="min-w-0 line-clamp-1">{e.prizeSummary}</dd>
            </div>
          )}
        </dl>

        <div className="flex items-center justify-between border-t border-white-10 pt-3">
          {e.registrationOpen && e.registrationClosesLabel ? (
            <p className="text-xs text-muted">
              Inscrições até <strong className="text-yellow">{e.registrationClosesLabel}</strong>
            </p>
          ) : (
            <span />
          )}
          <span className="text-sm font-semibold text-yellow transition-transform duration-300 group-hover:translate-x-1">
            Ver detalhes →
          </span>
        </div>
      </div>
    </Link>
  );
}
