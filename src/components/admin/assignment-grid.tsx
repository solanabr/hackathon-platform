"use client";

import { useState, useTransition } from "react";
import { setAssignment } from "@/app/(app)/admin/h/[slug]/judges/actions";
import type { RatingRound } from "@/lib/hackathon";

export type AssignmentProject = {
  submissionId: string;
  projectName: string;
  teamName: string;
  judgeIds: string[];
};

export function AssignmentGrid({
  projects,
  judges,
  slug,
  round,
}: {
  projects: AssignmentProject[];
  judges: Array<{ id: string; name: string }>;
  slug: string;
  round: RatingRound;
}) {
  const [state, setState] = useState(() =>
    Object.fromEntries(projects.map((p) => [p.submissionId, new Set(p.judgeIds)])),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  /**
   * Local state is seeded once, but the server re-renders this component after
   * every assignment. A team submitting while the page is open adds a project
   * the map has never seen, so fall back to what the server just sent.
   */
  function currentFor(project: AssignmentProject): Set<string> {
    return state[project.submissionId] ?? new Set(project.judgeIds);
  }

  function toggle(submissionId: string, judgeId: string, fallback: Set<string>) {
    const current = state[submissionId] ?? fallback;
    const assigned = !current.has(judgeId);

    setState((prev) => {
      const next = new Set(prev[submissionId] ?? current);
      if (assigned) next.add(judgeId);
      else next.delete(judgeId);
      return { ...prev, [submissionId]: next };
    });
    setError(null);

    start(async () => {
      const result = await setAssignment({ slug, submissionId, judgeId, round, assigned });
      if (!result.ok) {
        setError(result.error);
        setState((prev) => {
          const next = new Set(prev[submissionId] ?? current);
          if (assigned) next.delete(judgeId);
          else next.add(judgeId);
          return { ...prev, [submissionId]: next };
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm font-semibold text-red-400">{error}</p>}

      <ul className="space-y-3">
        {projects.map((project) => {
          const assigned = currentFor(project);
          const short = assigned.size < 2;

          return (
            <li
              key={project.submissionId}
              className="rounded-xl border-2 border-green-dark/15 bg-surface-raised p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-heading text-lg font-bold">{project.projectName}</h3>
                  <p className="text-sm text-muted">Time {project.teamName}</p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center rounded border px-2 py-1 font-mono text-[11px] font-semibold tabular-nums ${
                    short
                      ? "border-yellow-strong/60 bg-yellow/40 text-green-dark"
                      : "border-emerald/30 bg-emerald/10 text-emerald"
                  }`}
                >
                  {assigned.size} de 2 jurados
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {judges.map((judge) => {
                  const on = assigned.has(judge.id);
                  return (
                    <button
                      key={judge.id}
                      type="button"
                      disabled={pending}
                      aria-pressed={on}
                      onClick={() => toggle(project.submissionId, judge.id, assigned)}
                      className={`min-h-11 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                        on
                          ? "border-emerald bg-emerald text-white"
                          : "border-green-dark/20 text-muted hover:border-emerald/50 hover:text-ink"
                      }`}
                    >
                      {judge.name}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
