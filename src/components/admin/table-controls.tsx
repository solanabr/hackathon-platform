"use client";

export function FilterPills<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`rounded-full border-2 px-3 py-1 text-xs font-bold transition-colors ${
              active
                ? "border-green-dark bg-green-dark text-surface"
                : "border-green-dark/20 text-muted hover:border-green-dark hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function TablePager({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="font-mono text-xs tabular-nums text-muted">
        página {page} de {pageCount}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="rounded-full border-2 border-green-dark/20 px-4 py-1.5 text-sm font-bold text-ink transition-colors hover:border-green-dark disabled:opacity-30"
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
          className="rounded-full border-2 border-green-dark/20 px-4 py-1.5 text-sm font-bold text-ink transition-colors hover:border-green-dark disabled:opacity-30"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}

export const searchInputClass =
  "w-full max-w-xs rounded-full border border-green-dark/15 bg-surface-deep px-4 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-emerald";
