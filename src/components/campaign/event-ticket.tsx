import Image from "next/image";

export function EventTicket() {
  return (
    <div className="ticket-shadow mx-auto mt-8 w-full max-w-sm text-left md:max-w-xl lg:mt-10 lg:max-w-2xl">
      <div className="ticket-paper relative flex items-stretch overflow-hidden rounded-[4px] border-2 border-green-dark bg-[linear-gradient(105deg,#fffdf6_0%,#fbf3dd_55%,#f2e3bf_100%)]">
        <div className="relative flex w-[3.25rem] shrink-0 items-center justify-center overflow-hidden bg-[radial-gradient(130%_130%_at_18%_0%,#2f6b3f_0%,#1b231d_72%)] px-2.5 sm:w-[6.5rem] sm:px-3.5 lg:w-[8.5rem] lg:px-4">
          <Image
            src="/brand/stbr/logo/symbol-yellow.svg"
            alt="Superteam Brasil"
            width={997}
            height={963}
            className="h-auto w-full sm:hidden"
          />
          <Image
            src="/brand/stbr/logo/horizontal-yellow.svg"
            alt="Superteam Brasil"
            width={508}
            height={87}
            className="hidden h-auto w-full sm:block"
          />
        </div>

        <div className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-green-dark/65 sm:text-[10px]">
              Hackathon global
            </p>
            <p className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-green-dark/65 sm:text-[10px]">
              Nº 001417
            </p>
          </div>

          <div aria-hidden className="my-3 h-px bg-green-dark/20 sm:my-4" />

          <dl className="flex flex-wrap items-end">
            <div className="min-w-0">
              <dt className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-green-dark/60 sm:text-[9px]">
                Período
              </dt>
              <dd className="mt-1.5 whitespace-nowrap font-heading text-base font-black uppercase leading-none tracking-tight text-ink [font-stretch:112%] sm:text-lg lg:text-2xl">
                14 set – 12 out
              </dd>
            </div>

            <div className="mt-3 w-full min-w-0 sm:ml-auto sm:mt-0 sm:w-auto sm:border-l sm:border-dotted sm:border-green-dark/40 sm:pl-5 sm:text-right">
              <dt className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-green-dark/60 sm:text-[9px]">
                Prêmios
              </dt>
              <dd className="mt-1.5">
                <span className="inline-block whitespace-nowrap bg-yellow px-1.5 font-heading text-base font-black uppercase leading-tight tracking-tight text-green-dark [font-stretch:112%] sm:text-lg lg:text-2xl">
                  USD 250k
                </span>
              </dd>
            </div>
          </dl>

          <div aria-hidden className="my-3 border-t border-dotted border-green-dark/40 sm:my-4" />

          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-green-dark/60 sm:text-[10px]">
            100% online · inscrição gratuita
          </p>
        </div>

        <div aria-hidden className="ticket-holes w-[1.15rem] shrink-0 sm:w-[1.4rem]" />

        <div className="flex shrink-0 items-center gap-1.5 bg-yellow px-1.5 sm:gap-2 sm:px-2">
          <p className="whitespace-nowrap font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-green-dark [writing-mode:vertical-rl] rotate-180 sm:text-[11px]">
            Admite 1 time
          </p>
          <div aria-hidden className="ticket-barcode-v hidden h-[70%] w-5 self-center text-green-dark/80 sm:block" />
        </div>
      </div>
    </div>
  );
}
