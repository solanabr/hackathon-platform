"use client";

import { useMemo, useState } from "react";
import { EditionCard, type EditionCardData } from "@/components/layout/edition-card";

type Filter = "todos" | "running" | "upcoming" | "finished";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "running", label: "Acontecendo" },
  { key: "upcoming", label: "Em breve" },
  { key: "finished", label: "Encerrados" },
];

export function EditionGallery({
  editions,
  initialFilter = "todos",
}: {
  editions: EditionCardData[];
  initialFilter?: Filter;
}) {
  const [filter, setFilter] = useState<Filter>(initialFilter);

  function applyFilter(next: Filter) {
    setFilter(next);
    const url = next === "todos" ? window.location.pathname : `?f=${next}`;
    window.history.replaceState(null, "", url);
  }

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { todos: editions.length, running: 0, upcoming: 0, finished: 0 };
    for (const e of editions) c[e.stage] += 1;
    return c;
  }, [editions]);

  const visible = filter === "todos" ? editions : editions.filter((e) => e.stage === filter);

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar hackathons">
        {FILTERS.map(({ key, label }) => {
          const active = filter === key;
          const empty = counts[key] === 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => applyFilter(key)}
              disabled={empty}
              aria-pressed={active}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "bg-ink text-surface"
                  : "border border-green/25 bg-surface-raised/60 text-muted hover:border-green/50 hover:text-ink"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {label}
              <span className={`ml-1.5 text-xs ${active ? "text-surface/60" : "text-muted/60"}`}>{counts[key]}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="mt-10 text-muted">Nenhum hackathon nessa categoria por enquanto.</p>
      ) : (
        <div className={`mt-8 grid gap-6 ${visible.length === 1 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
          {visible.map((e, i) => (
            <EditionCard key={e.slug} edition={e} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
