/**
 * The dark marquee band. Items are real facts, never decoration: the homepage
 * feeds it platform-level lines, an edition page feeds it that edition's
 * deadlines. Pauses entirely under prefers-reduced-motion (globals.css).
 */
export function TickerStrip({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div aria-hidden className="relative overflow-hidden border-y-4 border-green-dark bg-green-dark py-3">
      <div className="animate-marquee flex w-max whitespace-nowrap">
        {[0, 1].map((half) => (
          <div key={half} className="flex">
            {items.map((item) => (
              <span
                key={`${half}-${item}`}
                className="px-8 font-heading text-sm font-bold uppercase tracking-[0.14em] text-yellow [font-stretch:110%]"
              >
                {item}
                <span className="ml-16 inline-block h-2 w-2 rounded-full bg-emerald align-middle" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
