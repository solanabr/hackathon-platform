/**
 * Instant fallback for tab-to-tab navigation inside an edition (painel and
 * admin). Without a boundary at the segment that changes, the router holds
 * the old page until the server answers and a click feels dead.
 */
export function SectionSkeleton() {
  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8" aria-busy="true" aria-label="Carregando">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-9 w-56 animate-pulse rounded-full bg-green-dark/10" />
        <div className="h-36 animate-pulse rounded-3xl border-2 border-green-dark/10 bg-surface-raised" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-80 animate-pulse rounded-3xl border-2 border-green-dark/10 bg-surface-raised lg:col-span-2" />
          <div className="space-y-6">
            <div className="h-40 animate-pulse rounded-3xl border-2 border-green-dark/10 bg-surface-raised" />
            <div className="h-32 animate-pulse rounded-3xl border-2 border-green-dark/10 bg-surface-raised" />
          </div>
        </div>
      </div>
    </div>
  );
}
