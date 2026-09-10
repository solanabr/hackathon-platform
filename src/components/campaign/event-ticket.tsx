import Image from "next/image";
import { PaperTexture } from "@/components/home/paper-texture";

/* O canhoto que atravessa a página carrega este mesmo número. Se ele existisse
   nos dois lugares como literal, um dia divergiria — e o número igual é
   justamente a prova de que é o mesmo ticket, não dois objetos parecidos. */
export const TICKET_SERIAL = "001417";

export function EventTicket() {
  return (
    <div className="ticket-shadow mt-8 w-full max-w-sm text-left md:max-w-xl lg:mt-0 lg:max-w-none">
      <div className="ticket-paper relative flex items-stretch overflow-hidden rounded-[4px] border-2 border-green-dark bg-[linear-gradient(105deg,#fffdf6_0%,#fbf3dd_55%,#f2e3bf_100%)]">
        {/* A trama do papel, a mesma da página. Ela mora no fundo e o miolo
            passa a ser posicionado, senão a camada absoluta cobre o texto. */}
        <PaperTexture className="opacity-50 [mask-image:radial-gradient(120%_100%_at_50%_50%,rgb(0_0_0/0.08)_18%,#000_88%)] [-webkit-mask-image:radial-gradient(120%_100%_at_50%_50%,rgb(0_0_0/0.08)_18%,#000_88%)]" />

        <div className="relative min-w-0 flex-1 px-4 py-4 sm:px-7 sm:py-6 lg:pb-14 lg:pt-7">
          <div className="flex items-baseline justify-between gap-3">
            <p className="flex min-w-0 items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-green-dark/80 sm:text-[10px]">
              <span
                aria-hidden
                className="h-[7px] w-[14px] shrink-0 rounded-[2px] bg-emerald"
              />
              <span className="truncate">Hackathon Colosseum</span>
            </p>
            <p className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-green-dark/80 sm:text-[10px]">
              Nº {TICKET_SERIAL}
            </p>
          </div>

          <div
            aria-hidden
            className="my-3 h-px bg-green-dark/25 sm:my-5 lg:my-5"
          />

          <dl className="flex flex-wrap items-end">
            <div className="min-w-0">
              <dt className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-green-dark/80 sm:text-[9px]">
                Período
              </dt>
              <dd className="mt-2 whitespace-nowrap font-heading text-base font-black uppercase leading-none tracking-tight text-ink [font-stretch:112%] sm:text-lg lg:text-xl">
                14 set – 12 out
              </dd>
            </div>

            <div className="mt-3 w-full min-w-0 sm:ml-auto sm:mt-0 sm:w-auto sm:border-l sm:border-dotted sm:border-green-dark/40 sm:pl-5 sm:text-right lg:ml-0 lg:mt-4 lg:w-full lg:border-l-0 lg:border-t lg:pl-0 lg:pt-4 lg:text-left">
              <dt className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-green-dark/80 sm:text-[9px]">
                Prêmios e investimento
              </dt>
              <dd className="mt-1.5">
                <span className="inline-block whitespace-nowrap bg-yellow px-2 font-heading text-base font-black uppercase leading-tight tracking-tight text-green-dark [font-stretch:112%] sm:text-lg lg:text-xl">
                  A anunciar
                </span>
              </dd>
            </div>
          </dl>

          <div
            aria-hidden
            className="my-3 border-t border-dotted border-green-dark/40 sm:my-5 lg:my-5"
          />

          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-green-dark/80 sm:text-[10px]">
            100% online · inscrição gratuita
          </p>
        </div>

        <div
          aria-hidden
          className="ticket-holes relative w-[1.15rem] shrink-0 sm:w-[1.4rem]"
        />

        <div className="relative flex shrink-0 items-center gap-2 bg-yellow px-2 sm:gap-3 sm:px-3">
          <div className="relative w-[1.35rem] self-stretch sm:w-[1.7rem]">
            <Image
              src="/brand/stbr/logo/ST-DARK-GREEN-HORIZONTAL.svg"
              alt="Superteam Brasil"
              width={508}
              height={87}
              className="absolute left-1/2 top-1/2 w-[6rem] max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-90 sm:w-[8.5rem]"
            />
          </div>
          <div
            aria-hidden
            className="ticket-barcode-v hidden h-[58%] w-4 self-center text-green-dark/70 sm:block"
          />
        </div>
      </div>
    </div>
  );
}
