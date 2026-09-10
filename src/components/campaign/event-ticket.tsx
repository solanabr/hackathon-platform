"use client";

import Image from "next/image";
import { useCallback, useRef, useState, type PointerEvent } from "react";
import { PaperTexture } from "@/components/home/paper-texture";
import {
  FaixaGuilhoche,
  Meandro,
  Medalhao,
  Microtexto,
  SeloRomano,
} from "@/components/campaign/gravacao";

/* O canhoto que atravessa a página carrega este mesmo número. Se ele existisse
   nos dois lugares como literal, um dia divergiria — e o número igual é
   justamente a prova de que é o mesmo ticket, não dois objetos parecidos. */
export const TICKET_SERIAL = "001417";

/* O mesmo número na numeração da casa. Não é enfeite: é o segundo registro que
   toda peça numerada de verdade carrega, e é ele que dá ao bilhete a data
   romana do selo sem precisar escrever "2026" duas vezes. */
const TICKET_SERIAL_ROMANO = "MCDXVII";

const MICROTEXTO =
  "SUPERTEAM BRASIL · HACKATHON COLOSSEUM · CRYPTO WORLD'S FAIR · MMXXVI · ";

/* Curso da pose, em graus. Sete é o teto que mantém o retângulo lendo como
   retângulo: acima disso a perspectiva começa a estreitar visivelmente um dos
   lados e o bilhete vira placa de vitrine girando. */
const POSE_MAX = 7;

export function EventTicket() {
  const cena = useRef<HTMLDivElement>(null);
  const [pousado, setPousado] = useState(true);

  /* A luz e a pose saem do MESMO ponto: é uma fonte de luz só, na posição do
     ponteiro. Escrever as duas coisas de dois handlers diferentes é como o
     brilho e a inclinação acabam discordando — e um foil que acende do lado
     errado da inclinação é pior do que foil nenhum. */
  const seguirPonteiro = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = cena.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;

    el.style.setProperty("--pose-y", `${(x - 0.5) * 2 * POSE_MAX}deg`);
    el.style.setProperty("--pose-x", `${(0.5 - y) * 2 * POSE_MAX}deg`);
    el.style.setProperty("--foil-x", `${x * 100}%`);
    el.style.setProperty("--foil-y", `${y * 100}%`);
    setPousado(false);
  }, []);

  const pousar = useCallback(() => {
    const el = cena.current;
    if (el) {
      /* Remover em vez de zerar: o repouso volta a ser o valor inicial do
         `@property`, que é o desenho aprovado — e não um zero que esta função
         precisaria manter em sincronia com o CSS para sempre. */
      for (const v of ["--pose-x", "--pose-y", "--foil-x", "--foil-y"]) {
        el.style.removeProperty(v);
      }
    }
    setPousado(true);
  }, []);

  return (
    <div
      ref={cena}
      data-pousado={pousado}
      onPointerMove={seguirPonteiro}
      onPointerLeave={pousar}
      className="bilhete-cena ticket-shadow mt-8 w-full max-w-sm text-left md:max-w-xl lg:mt-0 lg:max-w-none"
    >
      <div className="bilhete-pose relative">
        {/* O LADO DO CARTÃO. Mesmo recorte, em tinta, atrás da peça — e é o
            deslocamento contra a inclinação que o transforma em espessura em
            vez de contorno. */}
        <div aria-hidden className="bilhete-espessura ticket-cut" />

        <div className="ticket-cut ticket-paper relative flex items-stretch overflow-hidden rounded-[4px] border-2 border-green-dark bg-[linear-gradient(105deg,#fffdf6_0%,#fbf3dd_55%,#f2e3bf_100%)]">
          {/* A trama do papel, a mesma da página. Ela mora no fundo e o miolo
              passa a ser posicionado, senão a camada absoluta cobre o texto. */}
          <PaperTexture className="opacity-50 [mask-image:radial-gradient(120%_100%_at_50%_50%,rgb(0_0_0/0.08)_18%,#000_88%)] [-webkit-mask-image:radial-gradient(120%_100%_at_50%_50%,rgb(0_0_0/0.08)_18%,#000_88%)]" />

          {/* A vergatura. Fica ACIMA da trama e abaixo de tudo o mais: é
              estrutura da folha, não fundo dela. */}
          <span
            aria-hidden
            className="bilhete-mancha pointer-events-none absolute inset-0"
          />
          <span
            aria-hidden
            className="bilhete-vergatura pointer-events-none absolute inset-0 opacity-70"
          />

          <div className="relative min-w-0 flex-1 px-4 py-4 sm:px-7 sm:py-6 lg:pb-14 lg:pt-7">
            {/* O MEDALHÃO. Sai do quadro pela direita e é cortado pelo picote,
                como numa cédula — guilhoché que respeita a moldura do texto
                parece carimbo de fundo de página, não impressão de segurança. */}
            <Medalhao className="top-1/2 h-[13rem] w-[13rem] -translate-y-1/2 text-green-dark/[0.085] [right:-6.5rem] sm:h-[15rem] sm:w-[15rem] sm:[right:-7.5rem] lg:h-[17rem] lg:w-[17rem] lg:[right:-8.5rem]" />

            <div className="relative flex items-baseline justify-between gap-3">
              <p className="bilhete-prensa flex min-w-0 items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-green-dark/80 sm:text-[10px]">
                <span
                  aria-hidden
                  className="h-[7px] w-[14px] shrink-0 rounded-[2px] bg-emerald"
                />
                <span className="truncate">Hackathon Colosseum</span>
              </p>
              <div className="shrink-0 text-right">
                <p className="bilhete-prensa font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-green-dark/80 sm:text-[10px]">
                  Nº {TICKET_SERIAL}
                </p>
                <p
                  aria-hidden
                  className="font-mono text-[7px] font-bold uppercase leading-none tracking-[0.34em] text-green-dark/40 sm:text-[8px]"
                >
                  {TICKET_SERIAL_ROMANO}
                </p>
              </div>
            </div>

            {/* Onde havia um fio separando o cabeçalho do corpo agora corre
                a grega. Mesma altura, mesma função — o fio só passou a ter
                desenho. */}
            <Meandro className="relative my-3 h-[8px] w-full text-green-dark/35 sm:my-5 sm:h-[11px] lg:my-5" />

            <dl className="relative flex flex-wrap items-end">
              <div className="min-w-0">
                <dt className="bilhete-prensa font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-green-dark/80 sm:text-[9px]">
                  Período
                </dt>
                <dd className="bilhete-prensa mt-2 whitespace-nowrap font-heading text-base font-black uppercase leading-none tracking-tight text-ink [font-stretch:112%] sm:text-lg lg:text-xl">
                  14 set – 12 out
                </dd>
              </div>

              <div className="mt-3 w-full min-w-0 sm:ml-auto sm:mt-0 sm:w-auto sm:border-l sm:border-dotted sm:border-green-dark/40 sm:pl-5 sm:text-right lg:ml-0 lg:mt-4 lg:w-full lg:border-l-0 lg:border-t lg:pl-0 lg:pt-4 lg:text-left">
                <dt className="bilhete-prensa font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-green-dark/80 sm:text-[9px]">
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
              className="relative my-3 border-t border-dotted border-green-dark/40 sm:my-5 lg:my-5"
            />

            <p className="bilhete-prensa relative font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-green-dark/80 sm:text-[10px]">
              100% online · inscrição gratuita
            </p>

            {/* O SELO. Batido por cima do picote e fora do eixo, porque
                carimbo é gesto de mão. Só de `lg` para cima, e isso é o
                enquadramento decidindo, não o tamanho: abaixo desse ponto o
                bilhete é largo e baixo, a linha do rodapé quebra em duas e o
                canto de baixo à direita — o único lugar onde um carimbo cai
                bem — é justamente onde ela termina. */}
            <SeloRomano className="absolute bottom-3 right-5 hidden h-[4.75rem] w-[4.75rem] -rotate-[9deg] text-emerald-deep/25 lg:block" />

            {/* O microtexto corre na aresta de baixo do miolo. Parado é uma
                textura; na aproximação vira palavra. */}
            <Microtexto
              texto={MICROTEXTO}
              className="bilhete-microtexto absolute inset-x-0 bottom-0 h-[7px] text-green-dark/45"
            />
          </div>

          <div
            aria-hidden
            className="ticket-holes relative w-[1.15rem] shrink-0 sm:w-[1.4rem]"
          />

          <div className="bilhete-canhoto relative flex shrink-0 items-center gap-2 bg-yellow px-2 sm:gap-3 sm:px-3">
            {/* AS QUATRO CAMADAS DO HOT STAMP, na ordem física: pérola,
                difração, especular, tinta. Trocar a ordem é o que faz um foil
                parecer adesivo colorido. */}
            <span aria-hidden className="foil-perola absolute inset-0" />
            <span aria-hidden className="foil-iris absolute inset-0" />
            <span aria-hidden className="foil-brilho absolute inset-0" />
            <FaixaGuilhoche className="foil-linha inset-0 h-full w-full text-green-dark/20" />

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
              className="ticket-barcode-v relative hidden h-[58%] w-4 self-center text-green-dark/70 sm:block"
            />
          </div>

          {/* A LUZ. Última camada, atravessando papel e canhoto no mesmo eixo:
              uma fonte só para a peça inteira. */}
          <span
            aria-hidden
            className="bilhete-luz pointer-events-none absolute inset-0"
          />
        </div>
      </div>
    </div>
  );
}
