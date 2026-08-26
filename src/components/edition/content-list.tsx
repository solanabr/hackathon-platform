"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { segmentedContainer, segmentClass } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/empty-state";

export type ContentCard = {
  id: string;
  kind: string;
  kindLabel: string;
  title: string;
  speaker: string | null;
  description: string | null;
  when: string | null;
  thumb: string | null;
  isYoutube: boolean;
  external: string | null;
  domain: string | null;
  href: string;
};

const FILTERS: Array<{ key: string; label: string; kinds: string[] }> = [
  { key: "todos", label: "Tudo", kinds: [] },
  { key: "aulas", label: "Aulas e workshops", kinds: ["aula", "workshop", "mentoria"] },
  { key: "materiais", label: "Materiais", kinds: ["material"] },
  { key: "links", label: "Links", kinds: ["link"] },
];

/**
 * Filtering is client state over the already-fetched list — a searchParams
 * navigation here would re-suspend the whole segment under its loading
 * boundary and flash the page on every filter click.
 */
export function ContentList({ items, children }: { items: ContentCard[]; children: ReactNode }) {
  const [filterKey, setFilterKey] = useState("todos");
  const filter = FILTERS.find((x) => x.key === filterKey) ?? FILTERS[0];
  const filtered =
    filter.kinds.length === 0 ? items : items.filter((i) => filter.kinds.includes(i.kind));

  return (
    <>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        {children}
        <div className={segmentedContainer} role="group" aria-label="Filtrar conteúdos">
          {FILTERS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFilterKey(opt.key)}
              aria-pressed={filter.key === opt.key}
              className={segmentClass(filter.key === opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="Nada por aqui ainda"
          description="Os conteúdos desta edição ainda não foram publicados. Volte em breve."
        />
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2">
          {filtered.map((item) => {
            const card = (
              <article className="group flex h-full flex-col overflow-hidden rounded-2xl border-2 border-green-dark bg-surface-raised shadow-sticker transition-transform duration-200 hover:-translate-y-0.5">
                {item.thumb && (
                  <div className="relative aspect-video overflow-hidden border-b-2 border-green-dark/15 bg-green-dark">
                    <Image
                      src={item.thumb}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    {item.isYoutube && (
                      <span
                        aria-hidden
                        className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-green-dark/85 pl-1 text-xl text-surface transition-transform duration-200 group-hover:scale-110"
                      >
                        ▶
                      </span>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-yellow px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-dark">
                      {item.kindLabel}
                    </span>
                  </div>
                )}

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                      {!item.thumb && `${item.kindLabel} · `}
                      {item.when ?? "sem data"}
                      {!item.thumb && item.domain && ` · ${item.domain}`}
                    </p>
                  </div>
                  <h2 className="mt-2 font-heading text-lg font-bold leading-tight">
                    {item.title}
                  </h2>
                  {item.speaker && (
                    <p className="mt-0.5 text-sm font-semibold text-emerald">{item.speaker}</p>
                  )}
                  {item.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
                      {item.description}
                    </p>
                  )}
                </div>
              </article>
            );

            return (
              <li key={item.id} className="min-w-0">
                {item.external ? (
                  <a href={item.external} target="_blank" rel="noreferrer" className="block h-full">
                    {card}
                  </a>
                ) : (
                  <Link href={item.href} className="block h-full">
                    {card}
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
