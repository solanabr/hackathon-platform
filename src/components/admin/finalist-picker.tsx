"use client";

import { useState, useTransition } from "react";
import { StatusChip } from "@/components/ui/section-card";
import {
  setFinalist,
  setPlacement,
  notifyFinalists as runNotifyFinalists,
} from "@/app/(app)/admin/h/[slug]/finalistas/actions";
import type { FinalistCandidate } from "@/lib/finalists";

export function FinalistPicker({
  candidates,
  slug,
  hackathonId,
}: {
  candidates: FinalistCandidate[];
  slug: string;
  hackathonId: string;
}) {
  const [checked, setChecked] = useState(() =>
    Object.fromEntries(candidates.map((c) => [c.submissionId, c.isFinalist])),
  );
  const [placement, setPlacementValue] = useState(() =>
    Object.fromEntries(candidates.map((c) => [c.submissionId, c.placement])),
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function currentFor(c: FinalistCandidate): boolean {
    return checked[c.submissionId] ?? c.isFinalist;
  }

  function toggle(c: FinalistCandidate) {
    const on = !currentFor(c);
    setChecked((prev) => ({ ...prev, [c.submissionId]: on }));
    setError(null);
    setNotice(null);

    start(async () => {
      const result = await setFinalist({ slug, teamId: c.teamId, isFinalist: on });
      if (!result.ok) {
        setError(result.error);
        setChecked((prev) => ({ ...prev, [c.submissionId]: !on }));
      }
    });
  }

  function updatePlacement(c: FinalistCandidate, raw: string) {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1) return;
    setError(null);
    setNotice(null);
    setPlacementValue((prev) => ({ ...prev, [c.submissionId]: n }));
    start(async () => {
      const result = await setPlacement({ slug, teamId: c.teamId, placement: n });
      if (!result.ok) {
        setError(result.error);
        setPlacementValue((prev) => ({ ...prev, [c.submissionId]: c.placement }));
      }
    });
  }

  function notify() {
    setError(null);
    setNotice(null);

    start(async () => {
      const result = await runNotifyFinalists({ slug, hackathonId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotice(
        result.failed > 0
          ? `Finalistas notificados: ${result.sent}. Falhas: ${result.failed}.`
          : `Finalistas notificados: ${result.sent}.`,
      );
    });
  }

  const marked = candidates.filter((c) => currentFor(c));
  const pendingNotify = marked.filter((c) => !c.notified).length;

  return (
    <div className="space-y-5">
      {error && <p className="text-sm font-semibold text-red-400">{error}</p>}
      {notice && <p className="text-sm font-semibold text-emerald">{notice}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-green-dark/15 bg-surface-raised p-5">
        <p className="font-mono text-sm tabular-nums text-muted">
          {marked.length} de {candidates.length} marcado(s) · {pendingNotify} por notificar.
        </p>
        <button
          type="button"
          disabled={pending || pendingNotify === 0}
          onClick={notify}
          className="btn-primary min-h-11 px-5 py-2 text-sm text-[#1b231d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Notificando..." : "Notificar finalistas"}
        </button>
      </div>

      <ul className="space-y-3">
        {candidates.map((c, i) => {
          const on = currentFor(c);
          return (
            <li
              key={c.submissionId}
              className={`rounded-xl border-2 bg-surface-raised p-5 transition-colors ${
                on ? "border-yellow/40 bg-yellow/5" : "border-green-dark/15"
              }`}
            >
              <label className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={pending}
                    onChange={() => toggle(c)}
                    className="h-5 w-5 shrink-0 accent-emerald"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-heading text-lg font-bold">
                        <span
                          className={`mr-1 font-mono tabular-nums ${
                            on ? "text-emerald" : "text-muted"
                          }`}
                        >
                          {i + 1}.
                        </span>
                        {c.projectName}
                      </span>
                      {on && c.notified && <StatusChip tone="ok">notificado</StatusChip>}
                      {on && !c.notified && (
                        <StatusChip tone="pending">por notificar</StatusChip>
                      )}
                    </div>
                    <p className="text-sm text-muted">Time {c.teamName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  <label className="flex flex-col items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={placement[c.submissionId] ?? ""}
                      disabled={pending}
                      placeholder="—"
                      onChange={(e) => updatePlacement(c, e.target.value)}
                      className="h-9 w-14 rounded-lg border border-green-dark/15 bg-surface-deep px-2 text-center font-mono text-base font-semibold tabular-nums text-ink outline-none transition-colors focus:border-emerald"
                    />
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">
                      colocação
                    </span>
                  </label>
                  <div className="text-right">
                    <p className="font-mono text-xl font-semibold tabular-nums text-emerald">
                      {c.avgGrade === null
                        ? "—"
                        : c.avgGrade.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                    </p>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">
                      média
                    </p>
                  </div>
                  <p className="w-16 text-right font-mono text-sm tabular-nums text-muted">
                    {c.ratings} nota{c.ratings === 1 ? "" : "s"}
                  </p>
                </div>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
