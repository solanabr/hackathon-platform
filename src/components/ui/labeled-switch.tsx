"use client";

export function LabeledSwitch({
  active,
  ariaLabel,
  disabled = false,
  onToggle,
}: {
  active: boolean;
  ariaLabel: string;
  disabled?: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2">
      <span className={`text-xs font-bold ${active ? "text-emerald" : "text-muted"}`}>
        {active ? "Visível no mural" : "Oculto"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={ariaLabel}
        onClick={() => onToggle(!active)}
        disabled={disabled}
        className={`relative h-6 w-11 shrink-0 rounded-full border-2 border-green-dark transition-colors disabled:opacity-50 ${
          active ? "bg-yellow" : "bg-surface-deep"
        }`}
      >
        <span
          className={`absolute left-0 top-0.5 h-4 w-4 rounded-full bg-green-dark transition-transform ${
            active ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}
