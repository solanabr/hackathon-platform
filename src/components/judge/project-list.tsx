"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { segmentedContainer, segmentClass } from "@/components/ui/segmented";
import type { JudgeProject } from "@/components/judge/project-card";

type RatedProject = JudgeProject & { rating: { grade: number | null; comment: string } };

const FILTERS = [
  { key: "all", label: "Todos" },
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

export function JudgeProjectList({ projects, slug }: { projects: RatedProject[]; slug: string }) {
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
        <div className={segmentedContainer} role="group" aria-label="Filtrar projetos">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={segmentClass(filter === key)}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="min-h-11 rounded-full border-2 border-green-dark/15 bg-surface-raised px-4 text-sm font-bold text-ink outline-none transition-colors hover:border-green-dark focus:border-emerald"
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
        <ul className="grid gap-5 sm:grid-cols-2">
          {shown.map((project) => {
            const graded = project.rating.grade !== null;
            return (
              <li key={project.submissionId}>
                <Link
                  href={`/judge/h/${slug}/${project.submissionId}`}
                  className="group block h-full focus-visible:outline-none"
                >
                  <Card
                    sticker
                    className="flex h-full flex-col overflow-hidden p-0 transition-transform duration-200 group-hover:-translate-y-1 group-focus-visible:ring-2 group-focus-visible:ring-emerald"
                  >
                    {project.imageUrl ? (
                      <Image
                        src={project.imageUrl}
                        alt=""
                        width={640}
                        height={256}
                        className="h-36 w-full border-b-2 border-green-dark object-cover"
                      />
                    ) : (
                      <div className="flex h-36 w-full items-center justify-center border-b-2 border-green-dark bg-emerald/10">
                        <span className="font-heading text-3xl font-bold text-emerald/40">
                          {project.projectName.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="min-w-0 font-heading text-lg font-bold leading-snug group-hover:text-emerald">
                          {project.projectName}
                        </h2>
                        <span
                          className={`inline-flex shrink-0 items-center rounded-lg border-2 px-2.5 py-1 font-mono text-sm font-bold tabular-nums ${
                            graded
                              ? "border-green-dark bg-yellow text-green-dark"
                              : "border-ink/10 text-muted"
                          }`}
                        >
                          {graded ? project.rating.grade : "—"}
                        </span>
                      </div>
                      {project.description && (
                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">
                          {project.description}
                        </p>
                      )}
                      <p className="mt-auto pt-4 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
                        {graded ? "Rever avaliação →" : "Avaliar projeto →"}
                      </p>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
