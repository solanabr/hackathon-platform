"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { segmentedContainer, segmentClass } from "@/components/ui/segmented";

export type EditionCard = {
  slug: string;
  name: string;
  coverUrl: string | null;
  stage: "upcoming" | "running" | "finished";
  registrationOpen: boolean;
  startDay: number;
  startMonth: string;
  dateRange: string;
  locationCity: string | null;
  registrationClosesLabel: string | null;
  externalUrl?: string;
};

const FILTERS = [
  { key: "todos", label: "Todas" },
  { key: "running", label: "Acontecendo" },
  { key: "upcoming", label: "Em breve" },
  { key: "finished", label: "Encerradas" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

/**
 * Filtering is client state over the already-fetched list — a searchParams
 * navigation would remount the route's loading fallback (and its scroll
 * reset) on every pill click.
 */
export function EditionGallery({ editions }: { editions: EditionCard[] }) {
  const [filter, setFilter] = useState<FilterKey>("todos");

  const counts: Record<string, number> = { todos: editions.length };
  for (const e of editions) counts[e.stage] = (counts[e.stage] ?? 0) + 1;
  const filtered = filter === "todos" ? editions : editions.filter((e) => e.stage === filter);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h2 className="font-heading text-4xl font-black uppercase tracking-tight [font-stretch:118%] sm:text-5xl">
          Edições
        </h2>
        <div className={segmentedContainer} role="group" aria-label="Filtrar edições">
          {FILTERS.map((opt) => {
            const active = filter === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFilter(opt.key)}
                aria-pressed={active}
                className={segmentClass(active)}
              >
                {opt.label}
                <span
                  className={`ml-1.5 tabular-nums ${active ? "text-yellow" : "text-green-dark/50"}`}
                >
                  {counts[opt.key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 rounded-2xl border-2 border-dashed border-[#1b231d]/30 p-10 text-center text-green-dark/60">
          Nenhuma edição aqui ainda.
        </p>
      ) : (
        <ul className="-mx-4 mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
          {filtered.map((e) => {
            const cardClass =
              "group block overflow-hidden rounded-2xl border-2 border-[#1b231d] bg-[#fffdf6] shadow-sticker transition-transform duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-sticker focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b231d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7eacb]";
            const inner = (
              <>
                <div className="relative aspect-video overflow-hidden border-b-2 border-[#1b231d] bg-[#1b231d]">
                  {e.coverUrl ? (
                    <Image
                      src={e.coverUrl}
                      alt=""
                      fill
                      loading="lazy"
                      sizes="(min-width: 1024px) 550px, 100vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div
                      aria-hidden
                      className="morth absolute inset-8 bg-[#008c4c]"
                      style={{ maskImage: "url(/brand/stbr/elements/morth-11.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-11.svg)" }}
                    />
                  )}
                  {e.registrationOpen && (
                    <span className="absolute right-4 top-4 rounded-full bg-[#ffd23f] px-3 py-1 text-xs font-bold uppercase tracking-wide text-green-dark">
                      Inscrições abertas
                    </span>
                  )}
                </div>

                <div className="flex items-start gap-4 p-4">
                  <div className="shrink-0 text-center">
                    <p className="font-heading text-2xl font-black leading-none tabular-nums [font-stretch:118%]">
                      {e.startDay}
                    </p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-[#008c4c]">{e.startMonth}</p>
                  </div>
                  <div className="min-w-0 flex-1 border-l-2 border-[#1b231d]/10 pl-4">
                    <h3 className="truncate font-heading text-base font-bold">{e.name}</h3>
                    <p className="mt-0.5 truncate text-xs font-semibold text-green-dark/60">
                      {e.dateRange}
                      {e.locationCity ? ` · ${e.locationCity}` : ""}
                    </p>
                    <p className="mt-2.5 text-xs font-bold text-[#008c4c]">
                      {e.externalUrl
                        ? e.registrationOpen && e.registrationClosesLabel
                          ? `Inscrições até ${e.registrationClosesLabel}`
                          : "Acessar site"
                        : e.registrationOpen && e.registrationClosesLabel
                          ? `Inscrições até ${e.registrationClosesLabel}`
                          : e.stage === "finished"
                            ? "Ver projetos"
                            : "Ver detalhes"}
                      <span aria-hidden className="ml-1 inline-block transition-transform duration-200 group-hover:translate-x-1">
                        {e.externalUrl ? "↗" : "→"}
                      </span>
                    </p>
                  </div>
                </div>
              </>
            );

            return (
              <li key={e.slug} className="w-[85%] min-w-0 shrink-0 snap-center sm:w-auto sm:shrink">
                {e.externalUrl ? (
                  <a href={e.externalUrl} target="_blank" rel="noreferrer" className={cardClass}>
                    {inner}
                  </a>
                ) : (
                  <Link href={`/h/${e.slug}`} className={cardClass}>
                    {inner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
