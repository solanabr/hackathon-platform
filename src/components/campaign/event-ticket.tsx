const FIELDS = [
  { label: "Data", value: "14 set–12 out" },
  { label: "Formato", value: "100% online" },
  { label: "Inscrição", value: "Gratuita" },
];

export function EventTicket() {
  return (
    <div className="mx-auto mt-9 w-full max-w-sm text-left md:max-w-xl lg:mt-11 lg:max-w-2xl">
      <div className="ticket-edge relative overflow-hidden rounded-2xl border-2 border-green-dark bg-[linear-gradient(105deg,#fffdf6_0%,#fbf3dd_45%,#f0e0b6_100%)] shadow-[0_28px_70px_-32px_rgb(27_35_29_/_0.45)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:repeating-linear-gradient(45deg,var(--color-green-dark)_0_1px,transparent_1px_8px)]"
        />
        <div aria-hidden className="pointer-events-none absolute inset-[5px] rounded-xl border border-green-dark/25" />
        <div aria-hidden className="pointer-events-none absolute inset-[9px] rounded-lg border border-green-dark/12" />

        <div className="relative flex items-stretch">
          <div className="min-w-0 flex-1 p-4 pl-6 sm:px-8 sm:py-6 sm:pl-9">
            <div className="flex items-baseline justify-between gap-3">
              <p className="whitespace-nowrap font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-green-dark/70 sm:text-[10px]">
                Superteam Brasil apresenta
              </p>
              <p className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-green-dark/70 sm:text-[10px]">
                Nº 001417
              </p>
            </div>

            <div aria-hidden className="my-3 flex items-center gap-2 text-green-dark/35 sm:my-4">
              <span className="h-px flex-1 bg-current" />
              <svg viewBox="0 0 24 8" className="h-2 w-6" fill="currentColor" aria-hidden>
                <path d="M12 0 15 4 12 8 9 4Z" />
                <path d="M4 3h4v2H4ZM16 3h4v2h-4Z" />
              </svg>
              <span className="h-px flex-1 bg-current" />
            </div>

            <div className="relative">
              <h2 className="font-heading text-[2rem] font-black uppercase leading-none tracking-tight text-ink [font-stretch:118%] sm:text-5xl">
                Colosseum
              </h2>
              <p className="mt-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-green-dark/60 sm:text-[10px]">
                Hackathon global<span className="hidden sm:inline"> · Prêmio do Crypto World&apos;s Fair</span>
              </p>

              <svg
                viewBox="0 0 100 100"
                className="ticket-stamp absolute -top-3 right-0 hidden h-24 w-24 -rotate-[14deg] text-green/45 sm:block"
                aria-hidden
              >
                <defs>
                  <path id="ticket-postmark-ring" d="M50 50m-40 0a40 40 0 1 1 80 0a40 40 0 1 1-80 0" />
                </defs>
                <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="2.5" />
                <circle cx="50" cy="50" r="33" fill="none" stroke="currentColor" strokeWidth="1" />
                <text fill="currentColor" fontSize="8" fontWeight="700" letterSpacing="1.8">
                  <textPath href="#ticket-postmark-ring" startOffset="6%">
                    · BRASIL · ONCHAIN · 2026 ·
                  </textPath>
                </text>
                <text x="50" y="48" textAnchor="middle" fill="currentColor" fontSize="14" fontWeight="800" letterSpacing="0.5">
                  14 SET
                </text>
                <text x="50" y="62" textAnchor="middle" fill="currentColor" fontSize="9" fontWeight="700" letterSpacing="1.5">
                  12 OUT
                </text>
              </svg>
            </div>

            <div className="mt-4 flex items-end gap-3 sm:mt-6 sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-green-dark/70 sm:text-[10px]">
                  Portador
                </p>
                <div className="border-b-2 border-dotted border-green-dark/50 pb-1">
                  <p className="font-heading text-xl font-black uppercase leading-none text-ink [font-stretch:115%] sm:text-2xl">
                    Seu time
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-baseline gap-1.5 rounded-lg border-2 border-green-dark bg-yellow px-2.5 py-1.5 sm:px-4 sm:py-2">
                <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-green-dark/70 sm:text-[10px]">até</span>
                <span className="font-heading text-base font-black leading-none tracking-tight text-green-dark sm:text-xl">USD 250k</span>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-3 items-end sm:mt-6">
              {FIELDS.map((field, i) => (
                <div
                  key={field.label}
                  className={
                    i === 0
                      ? "min-w-0"
                      : "min-w-0 border-l border-dotted border-green-dark/35 pl-2.5 sm:pl-5"
                  }
                >
                  <dt className="font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-green-dark/70 [@media(max-width:359px)]:tracking-[0.06em] sm:text-[10px] sm:tracking-[0.2em]">
                    {field.label}
                  </dt>
                  <dd className="mt-1 whitespace-nowrap font-heading text-[10px] font-black uppercase leading-none tracking-tight text-ink [font-stretch:100%] [@media(max-width:359px)]:text-[8px] sm:text-lg sm:[font-stretch:112%]">
                    {field.value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 flex items-center justify-between gap-4 border-t border-dotted border-green-dark/35 pt-3 sm:mt-5">
              <p className="truncate font-mono text-[8px] uppercase tracking-[0.12em] text-green-dark/60 sm:text-[10px] sm:tracking-[0.18em]">
                R$15M+ captados por times brasileiros
              </p>
              <div aria-hidden className="ticket-barcode hidden h-7 w-28 shrink-0 text-green-dark/70 sm:block" />
            </div>
          </div>

          <div className="relative w-[3.25rem] shrink-0 border-l-2 border-dashed border-green-dark/50 bg-yellow sm:w-[4.5rem]">
            <p className="absolute inset-0 flex items-center justify-center whitespace-nowrap font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-green-dark [writing-mode:vertical-rl] rotate-180 sm:text-xs">
              Admite 1 time
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
