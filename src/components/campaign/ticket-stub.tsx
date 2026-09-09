"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { TrackedCta } from "@/components/ui/tracked-cta";
import { useSfx } from "@/components/campaign/sound-toggle";

/**
 * O canhoto do ticket da primeira dobra.
 *
 * O ticket é a metáfora da página inteira e antes disso ele morria a 800px de
 * scroll. Aqui ele atravessa: quando o ticket sai de campo o canhoto se
 * destaca pela picotagem e viaja junto, e quando a última chamada entra ele
 * recolhe — ali o ticket inteiro está de volta e um segundo botão flutuando
 * por cima vira tralha. O número de série é o MESMO do hero de propósito: é a
 * prova de que é o mesmo objeto, não um CTA fixo com cara de ticket.
 */
export function TicketStub({
  href,
  serial,
  label,
  fromId,
  untilId,
}: {
  href: string;
  serial: string;
  label: string;
  /** O ticket do hero. O canhoto só existe depois que ele sai de campo. */
  fromId: string;
  /** A última chamada. Chegando lá, o canhoto recolhe. */
  untilId: string;
}) {
  const [torn, setTorn] = useState(false);
  const [arrived, setArrived] = useState(false);
  const cue = useSfx();

  /* O rasgo toca uma vez, no destaque — não em toda entrada e saída do
     observer, senão vira metralhadora de papel em scroll de vaivém. */
  const tore = useRef(false);
  useEffect(() => {
    if (torn && !tore.current) {
      tore.current = true;
      cue("papel");
    }
  }, [torn, cue]);

  useEffect(() => {
    const from = document.getElementById(fromId);
    const until = document.getElementById(untilId);
    const kill: Array<() => void> = [];

    if (from) {
      const io = new IntersectionObserver(([e]) => setTorn(!e.isIntersecting), {
        rootMargin: "-72px 0px 0px 0px",
      });
      io.observe(from);
      kill.push(() => io.disconnect());
    }
    if (until) {
      /* -50% faz o canhoto recolher só quando a última chamada cruza o meio
         da tela. Com -25% ele sumia ainda no meio do FAQ, que é exatamente
         onde quem hesita mais precisa da saída à mão. */
      const io = new IntersectionObserver(([e]) => setArrived(e.isIntersecting), {
        rootMargin: "0px 0px -50% 0px",
      });
      io.observe(until);
      kill.push(() => io.disconnect());
    }
    return () => kill.forEach((f) => f());
  }, [fromId, untilId]);

  const shown = torn && !arrived;

  return (
    <div
      inert={!shown}
      /* Entra depositado, com a curva de carimbo; sai com a curva de saída e
         mais rápido, porque nesse ponto o olho tem que ir para a chamada de
         verdade e não acompanhar o canhoto indo embora. */
      className={`ticket-stub fixed bottom-3 left-[4.25rem] right-3 z-40 sm:left-auto sm:right-5 sm:bottom-5 ${
        shown
          ? "ticket-stub-in"
          : "pointer-events-none ticket-stub-out"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="ticket-shadow">
        <div className="ticket-paper flex items-stretch overflow-hidden rounded-[3px] border-2 border-green-dark bg-yellow">
          <div
            aria-hidden
            /* O picote precisa de furo suficiente para ler como linha de rasgo:
               a 50px de altura cabiam dois e virava listra. Passo mais curto
               que o do ticket inteiro, porque o objeto é menor. */
            className="ticket-holes w-[1.15rem] shrink-0 [--ticket-hole-fill:var(--color-green-dark)] [background-size:100%_15px]"
          />
          <TrackedCta
            href={href}
            event="cta_clicked"
            properties={{ cta: "cadastro", location: "canhoto" }}
            className="flex min-h-11 flex-1 flex-col justify-center gap-1 px-4 py-3 text-green-dark sm:px-5 sm:py-3.5"
          >
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-green-dark/75">
              Nº {serial}
            </span>
            <span className="flex items-center gap-2 font-heading text-sm font-black uppercase leading-none tracking-tight [font-stretch:110%]">
              {label}
              {/* No celular o canhoto ocupa a largura toda e a seta ancora na
                  borda direita, onde o polegar está; a partir de sm o objeto
                  é pequeno e a seta volta a andar colada ao rótulo. */}
              <ArrowRightIcon
                aria-hidden
                size={14}
                weight="bold"
                className="ml-auto sm:ml-0"
              />
            </span>
          </TrackedCta>
        </div>
      </div>
    </div>
  );
}
