"use client";

import { useMemo, useState } from "react";
import { JudgeProjectCard, type JudgeProject } from "@/components/judge/project-card";
import { Card } from "@/components/ui/card";
import type { RatingRound } from "@/lib/hackathon";

type RatedProject = JudgeProject & { rating: { grade: number | null; comment: string } };

const FILTERS = [
  { key: "all", label: "Todas" },
  { key: "unrated", label: "Sem nota" },
  { key: "rated", label: "Com nota" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];
type SortKey = "default" | "unrated-first" | "asc" | "desc";

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "default", label: "Ordem padrão" },
  { key: "unrated-first", label: "Sem nota primeiro" },
  { key: "asc", label: "Nota crescente" },
  { key: "desc", label: "Nota decrescente" },
];

function compare(a: number | null, b: number | null, unratedFirst: boolean, desc: boolean) {
  if (a === null && b === null) return 0;
  if (a === null) return unratedFirst ? -1 : 1;
  if (b === null) return unratedFirst ? 1 : -1;
  return desc ? b - a : a - b;
}

export function JudgeProjectList({
  projects,
  hackathonId,
  slug,
  round,
}: {
  projects: RatedProject[];
  hackathonId: string;
  slug: string;
  round: RatingRound;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("default");

  const shown = useMemo(() => {
    const list = projects.filter((p) => {
      if (filter === "unrated") return p.rating.grade === null;
      if (filter === "rated") return p.rating.grade !== null;
      return true;
    });
    if (sort === "default") return list;
    const sorted = [...list];
    if (sort === "unrated-first") sorted.sort((a, b) => compare(a.rating.grade, b.rating.grade, true, true));
    if (sort === "asc") sorted.sort((a, b) => compare(a.rating.grade, b.rating.grade, false, false));
    if (sort === "desc") sorted.sort((a, b) => compare(a.rating.grade, b.rating.grade, false, true));
    return sorted;
  }, [projects, filter, sort]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex flex-wrap rounded-full border border-ink/10 bg-surface-deep p-1"
          role="group"
          aria-label="Filtrar projetos"
        >
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={`min-h-11 rounded-full px-4 text-sm font-semibold transition-colors ${
                filter === key
                  ? "bg-yellow text-green-dark"
                  : "text-muted hover:bg-green-dark/10 hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="min-h-11 rounded-full border border-ink/10 bg-surface-deep px-4 text-sm font-semibold text-muted outline-none transition-colors hover:border-emerald/50 focus:border-emerald"
        >
          {SORTS.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {shown.length === 0 ? (
        <Card className="p-7">
          <p className="font-mono text-sm text-muted">Nenhum projeto neste filtro.</p>
        </Card>
      ) : (
        <ul className="space-y-6">
          {shown.map((project) => (
            <li key={project.submissionId}>
              <JudgeProjectCard
                project={project}
                hackathonId={hackathonId}
                slug={slug}
                round={round}
                rating={project.rating}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
