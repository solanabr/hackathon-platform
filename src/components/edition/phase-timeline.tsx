import { phaseState, type PhaseBounds } from "@/lib/hackathon";

export type Phase = PhaseBounds & {
  key: string;
  label: string;
  when: string;
  detail: string;
};

export function PhaseTimeline({ phases, now }: { phases: Phase[]; now: number }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {phases.map((phase) => {
        const state = phaseState(phase, now);
        const current = state === "current";
        const done = state === "done";

        return (
          <li
            key={phase.key}
            className={`relative flex flex-col gap-2 rounded-2xl border p-5 transition-colors ${
              current
                ? "border-emerald/40 bg-emerald/15 text-ink shadow-[0_12px_32px_rgba(0,140,76,0.15)]"
                : done
                  ? "border-ink/10 bg-surface-raised/60 text-muted"
                  : "border-ink/10 bg-surface-raised text-ink"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  current ? "text-green-dark" : "text-emerald"
                }`}
              >
                {phase.when}
              </span>
              {current && (
                <span className="rounded-full bg-yellow px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-dark">
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
            <p className="text-sm leading-relaxed text-muted">{phase.detail}</p>
          </li>
        );
      })}
    </ol>
  );
}
