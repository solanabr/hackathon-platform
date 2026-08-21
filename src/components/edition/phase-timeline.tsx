export type Phase = {
  key: string;
  label: string;
  when: string;
  detail: string;
  at: number;
};

function stateOf(phases: Phase[], index: number, now: number) {
  const next = phases[index + 1];
  if (now >= phases[index].at && (!next || now < next.at)) return "current" as const;
  return now >= phases[index].at ? ("done" as const) : ("todo" as const);
}

export function PhaseTimeline({ phases, now }: { phases: Phase[]; now: number }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {phases.map((phase, i) => {
        const state = stateOf(phases, i, now);
        const current = state === "current";
        const done = state === "done";

        return (
          <li
            key={phase.key}
            className={`relative flex flex-col gap-2 rounded-2xl border p-5 transition-colors ${
              current
                ? "border-emerald bg-emerald text-surface shadow-[0_12px_32px_rgba(0,140,76,0.25)]"
                : done
                  ? "border-green/15 bg-surface-raised/60 text-muted"
                  : "border-green/15 bg-surface-raised text-ink"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  current ? "text-surface/80" : "text-emerald"
                }`}
              >
                {phase.when}
              </span>
              {current && (
                <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald">
                  Agora
                </span>
              )}
              {done && (
                <span aria-label="concluído" className="text-sm font-bold text-emerald">
                  ✓
                </span>
              )}
            </div>

            <p className="font-heading text-lg font-bold leading-tight">{phase.label}</p>
            <p className={`text-sm leading-relaxed ${current ? "text-surface/85" : "text-muted"}`}>
              {phase.detail}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
