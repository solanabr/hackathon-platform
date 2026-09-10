"use client";

import Image from "next/image";
import {
  useCallback,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
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

/* ---------------------------------------------------------------------------
 * `--bu` — A UNIDADE DO BILHETE
 *
 * O bilhete vive em dois tamanhos: pequeno no canto do hero e grande, virado,
 * estacionado na seção seguinte. É a MESMA peça — então ela não pode ter dois
 * desenhos, e também não pode ser só um `scale` do outro: escalar um cartão de
 * papel escala o serrilhado, o furo e o corpo da letra junto, e o que era
 * impressão vira ampliação de impressão.
 *
 * Então toda medida interna é escrita em `calc(x * var(--bu))`. Uma unidade só
 * governa corpo de letra, respiro, largura do canhoto, passo do picote e
 * tamanho do selo. Quem escreve `--bu` é a instância: 1 no hero, e a razão
 * entre as duas larguras quando estacionado — e é essa mesma razão, invertida,
 * que o voo usa como `scale`. As duas pontas fecham por construção.
 * ------------------------------------------------------------------------- */

/**
 * O PAPEL — a chapa que as duas faces dividem.
 *
 * Recorte serrilhado, trama, vergatura, mancha de polpa e a luz. Tudo o que é
 * suporte mora aqui; o que é conteúdo entra como `children`. Sem isso as duas
 * faces divergiriam na primeira correção de textura — e um cartão cuja frente e
 * cujo verso são de papéis diferentes deixa de ser um cartão.
 */
function Papel({
  children,
  espelhado = false,
}: {
  children: ReactNode;
  espelhado?: boolean;
}) {
  return (
    <div
      className={`ticket-cut ticket-paper relative flex h-full items-stretch overflow-hidden rounded-[calc(4px*var(--bu))] border-[calc(2px*var(--bu))] border-green-dark bg-[linear-gradient(105deg,#fffdf6_0%,#fbf3dd_55%,#f2e3bf_100%)] ${
        espelhado ? "flex-row-reverse" : ""
      }`}
    >
      {/* A trama do papel, a mesma da página. Ela mora no fundo e o miolo
          passa a ser posicionado, senão a camada absoluta cobre o texto. */}
      <PaperTexture className="opacity-50 [mask-image:radial-gradient(120%_100%_at_50%_50%,rgb(0_0_0/0.08)_18%,#000_88%)] [-webkit-mask-image:radial-gradient(120%_100%_at_50%_50%,rgb(0_0_0/0.08)_18%,#000_88%)]" />
      <span
        aria-hidden
        className="bilhete-mancha pointer-events-none absolute inset-0"
      />
      <span
        aria-hidden
        className="bilhete-vergatura pointer-events-none absolute inset-0 opacity-70"
      />

      {children}

      {/* A LUZ. Última camada, atravessando papel e canhoto no mesmo eixo:
          uma fonte só para a peça inteira. */}
      <span
        aria-hidden
        className="bilhete-luz pointer-events-none absolute inset-0"
      />
    </div>
  );
}

/** O canhoto amarelo com o hot stamp. Igual nas duas faces: o canhoto de um
 *  ingresso é a mesma tira de foil vista dos dois lados. */
function Canhoto() {
  return (
    <div className="bilhete-canhoto relative flex shrink-0 items-center bg-yellow gap-[calc(0.5rem*var(--bu))] px-[calc(0.5rem*var(--bu))] sm:gap-[calc(0.75rem*var(--bu))] sm:px-[calc(0.75rem*var(--bu))]">
      {/* AS CAMADAS DO HOT STAMP, na ordem física: pérola, íris, especular,
          tinta. Trocar a ordem é o que faz um foil parecer adesivo colorido. */}
      <span aria-hidden className="foil-perola absolute inset-0" />
      <span aria-hidden className="foil-iris absolute inset-0" />
      <span aria-hidden className="foil-brilho absolute inset-0" />
      <FaixaGuilhoche className="foil-linha inset-0 h-full w-full text-green-dark/20" />

      <div className="relative w-[calc(1.35rem*var(--bu))] self-stretch sm:w-[calc(1.7rem*var(--bu))]">
        <Image
          src="/brand/stbr/logo/ST-DARK-GREEN-HORIZONTAL.svg"
          alt="Superteam Brasil"
          width={508}
          height={87}
          className="absolute left-1/2 top-1/2 w-[calc(6rem*var(--bu))] max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-90 sm:w-[calc(8.5rem*var(--bu))]"
        />
      </div>
      <div
        aria-hidden
        className="ticket-barcode-v relative hidden h-[58%] w-[calc(1rem*var(--bu))] self-center text-green-dark/70 sm:block"
      />
    </div>
  );
}

/** A linha de picote: furos vazados até o creme, com a rebarba que o punção
 *  deixa no papel. */
function Picote() {
  return (
    <div
      aria-hidden
      className="ticket-holes relative w-[calc(1.15rem*var(--bu))] shrink-0 sm:w-[calc(1.4rem*var(--bu))]"
    />
  );
}

/* --- A FRENTE ------------------------------------------------------------
 * O que está impresso no bilhete desde o começo: a edição, o número, o período
 * e a condição. É o lado que a pessoa vê na primeira dobra.                  */
export function TicketFrente() {
  return (
    <Papel>
      <div className="relative min-w-0 flex-1 px-[calc(1rem*var(--bu))] py-[calc(1rem*var(--bu))] sm:px-[calc(1.75rem*var(--bu))] sm:py-[calc(1.5rem*var(--bu))] lg:pb-[calc(3.5rem*var(--bu))] lg:pt-[calc(1.75rem*var(--bu))]">
        {/* O MEDALHÃO. Sai do quadro pela direita e é cortado pelo picote,
            como numa cédula — guilhoché que respeita a moldura do texto parece
            carimbo de fundo de página, não impressão de segurança. */}
        <Medalhao className="top-1/2 h-[calc(13rem*var(--bu))] w-[calc(13rem*var(--bu))] -translate-y-1/2 text-green-dark/[0.085] [right:calc(-6.5rem*var(--bu))] sm:h-[calc(15rem*var(--bu))] sm:w-[calc(15rem*var(--bu))] sm:[right:calc(-7.5rem*var(--bu))] lg:h-[calc(17rem*var(--bu))] lg:w-[calc(17rem*var(--bu))] lg:[right:calc(-8.5rem*var(--bu))]" />

        <div className="relative flex items-baseline justify-between gap-[calc(0.75rem*var(--bu))]">
          <p className="bilhete-prensa flex min-w-0 items-center gap-[calc(0.5rem*var(--bu))] font-mono text-[calc(9px*var(--bu))] font-bold uppercase tracking-[0.2em] text-green-dark/80 sm:text-[calc(10px*var(--bu))]">
            <span
              aria-hidden
              className="h-[calc(7px*var(--bu))] w-[calc(14px*var(--bu))] shrink-0 rounded-[calc(2px*var(--bu))] bg-emerald"
            />
            <span className="truncate">Hackathon Colosseum</span>
          </p>
          <div className="shrink-0 text-right">
            <p className="bilhete-prensa font-mono text-[calc(9px*var(--bu))] font-bold uppercase tracking-[0.2em] text-green-dark/80 sm:text-[calc(10px*var(--bu))]">
              Nº {TICKET_SERIAL}
            </p>
            <p
              aria-hidden
              className="font-mono text-[calc(7px*var(--bu))] font-bold uppercase leading-none tracking-[0.34em] text-green-dark/40 sm:text-[calc(8px*var(--bu))]"
            >
              {TICKET_SERIAL_ROMANO}
            </p>
          </div>
        </div>

        {/* Onde havia um fio separando o cabeçalho do corpo agora corre a
            grega. Mesma altura, mesma função — o fio só passou a ter desenho. */}
        <Meandro className="relative my-[calc(0.75rem*var(--bu))] h-[calc(8px*var(--bu))] w-full text-green-dark/35 sm:my-[calc(1.25rem*var(--bu))] sm:h-[calc(11px*var(--bu))]" />

        <dl className="relative flex flex-wrap items-end">
          <div className="min-w-0">
            <dt className="bilhete-prensa font-mono text-[calc(8px*var(--bu))] font-bold uppercase tracking-[0.18em] text-green-dark/80 sm:text-[calc(9px*var(--bu))]">
              Período
            </dt>
            <dd className="bilhete-prensa mt-[calc(0.5rem*var(--bu))] whitespace-nowrap font-heading text-[calc(1rem*var(--bu))] font-black uppercase leading-none tracking-tight text-ink [font-stretch:112%] sm:text-[calc(1.125rem*var(--bu))] lg:text-[calc(1.25rem*var(--bu))]">
              14 set – 12 out
            </dd>
          </div>

          <div className="mt-[calc(0.75rem*var(--bu))] w-full min-w-0 sm:ml-auto sm:mt-0 sm:w-auto sm:border-l sm:border-dotted sm:border-green-dark/40 sm:pl-[calc(1.25rem*var(--bu))] sm:text-right lg:ml-0 lg:mt-[calc(1rem*var(--bu))] lg:w-full lg:border-l-0 lg:border-t lg:pl-0 lg:pt-[calc(1rem*var(--bu))] lg:text-left">
            <dt className="bilhete-prensa font-mono text-[calc(8px*var(--bu))] font-bold uppercase tracking-[0.18em] text-green-dark/80 sm:text-[calc(9px*var(--bu))]">
              Prêmios e investimento
            </dt>
            <dd className="mt-[calc(0.375rem*var(--bu))]">
              <span className="inline-block whitespace-nowrap bg-yellow px-[calc(0.5rem*var(--bu))] font-heading text-[calc(1rem*var(--bu))] font-black uppercase leading-tight tracking-tight text-green-dark [font-stretch:112%] sm:text-[calc(1.125rem*var(--bu))] lg:text-[calc(1.25rem*var(--bu))]">
                A anunciar
              </span>
            </dd>
          </div>
        </dl>

        <div
          aria-hidden
          className="relative my-[calc(0.75rem*var(--bu))] border-t border-dotted border-green-dark/40 sm:my-[calc(1.25rem*var(--bu))]"
        />

        <p className="bilhete-prensa relative font-mono text-[calc(9px*var(--bu))] font-bold uppercase tracking-[0.2em] text-green-dark/80 sm:text-[calc(10px*var(--bu))]">
          100% online · inscrição gratuita
        </p>

        {/* O SELO. Batido por cima do picote e fora do eixo, porque carimbo é
            gesto de mão. Só de `lg` para cima, e isso é o enquadramento
            decidindo: abaixo desse ponto o bilhete é largo e baixo, a linha do
            rodapé quebra em duas e o canto de baixo à direita — o único lugar
            onde um carimbo cai bem — é onde ela termina. */}
        <SeloRomano className="absolute bottom-[calc(0.75rem*var(--bu))] right-[calc(1.25rem*var(--bu))] hidden h-[calc(4.75rem*var(--bu))] w-[calc(4.75rem*var(--bu))] -rotate-[9deg] text-emerald-deep/25 lg:block" />

        {/* O microtexto corre na aresta de baixo do miolo. Parado é uma
            textura; na aproximação vira palavra. */}
        <Microtexto
          texto={MICROTEXTO}
          className="bilhete-microtexto absolute inset-x-0 bottom-0 h-[calc(7px*var(--bu))] text-green-dark/45"
        />
      </div>

      <Picote />
      <Canhoto />
    </Papel>
  );
}

export type FatoBilhete = {
  figure: string;
  title: string;
  body: string;
  accent?: boolean;
};

/* --- O VERSO -------------------------------------------------------------
 * O que um ingresso de verdade tem atrás: as condições, na mesma tinta e em
 * corpo miúdo. É por isso que o conteúdo da seção cabe aqui sem virar outra
 * coisa — a seção É a letra miúda deste bilhete. O título dela fica de fora
 * porque título é da PÁGINA, não da peça: quem anuncia a seção é a folha.
 *
 * O canhoto troca de lado, e não é detalhe gratuito: vire um ingresso na mão e
 * o canhoto aparece do outro lado. Mantê-lo à direita denunciaria que o verso
 * é uma segunda imagem, e não o outro lado da mesma folha.                   */
export function TicketVerso({
  fatos,
  nota,
}: {
  fatos: readonly FatoBilhete[];
  nota?: string;
}) {
  return (
    <Papel espelhado>
      {/* O verso é escrito em MEIA unidade do que a frente usaria. Não é
          inconsistência: a frente só é vista reduzida pelo voo (`--bu` para
          cima, `scale` para baixo, uma anula a outra), e o verso é visto no
          tamanho grande, sem redução. Escrever os dois na mesma escala daria
          um verso com corpo de letra de cartaz. */}
      <div className="relative flex min-w-0 flex-1 flex-col px-[calc(1.25rem*var(--bu))] py-[calc(1rem*var(--bu))]">
        <Medalhao className="top-1/2 h-[calc(9rem*var(--bu))] w-[calc(9rem*var(--bu))] -translate-y-1/2 text-green-dark/[0.07] [left:calc(-4.5rem*var(--bu))]" />

        <div className="relative flex items-baseline justify-between gap-[calc(0.75rem*var(--bu))]">
          <p className="bilhete-prensa font-mono text-[calc(5.5px*var(--bu))] font-bold uppercase tracking-[0.2em] text-green-dark/80">
            Verso · condições da edição
          </p>
          <p className="bilhete-prensa shrink-0 font-mono text-[calc(5.5px*var(--bu))] font-bold uppercase tracking-[0.2em] text-green-dark/80">
            Nº {TICKET_SERIAL}
          </p>
        </div>

        <Meandro className="relative my-[calc(0.6rem*var(--bu))] h-[calc(6px*var(--bu))] w-full text-green-dark/35" />

        {/* As quatro cláusulas. Sem moldura e sem sombra: elas estão IMPRESSAS
            no papel, não coladas nele — um sticker card por cima do bilhete
            faria o bilhete virar fundo de outro objeto. O que separa uma da
            outra é o fio, que é como um documento separa cláusula. */}
        <dl className="relative grid flex-1 content-start gap-x-[calc(1.75rem*var(--bu))] gap-y-[calc(0.8rem*var(--bu))] sm:grid-cols-2">
          {fatos.map((fato) => (
            <div
              key={fato.figure}
              className="min-w-0 border-t border-dotted border-green-dark/40 pt-[calc(0.5rem*var(--bu))]"
            >
              <dt className="text-balance font-heading text-[calc(0.94rem*var(--bu))] font-black uppercase leading-[0.95] tracking-[-0.03em] text-green-dark [font-stretch:115%]">
                {fato.accent ? (
                  <span className="inline-block bg-yellow px-[calc(0.25rem*var(--bu))] pb-[0.06em] [clip-path:polygon(0_5%,100%_0,100%_95%,0_100%)]">
                    {fato.figure}
                  </span>
                ) : (
                  fato.figure
                )}
              </dt>
              <dd>
                <p className="bilhete-prensa mt-[calc(0.28rem*var(--bu))] font-mono text-[calc(5.5px*var(--bu))] font-bold uppercase tracking-[0.16em] text-green-dark/80">
                  {fato.title}
                </p>
                <p className="mt-[calc(0.28rem*var(--bu))] text-pretty text-[calc(7px*var(--bu))] leading-[1.6] text-ink/75">
                  {fato.body}
                </p>
              </dd>
            </div>
          ))}
        </dl>

        {nota ? (
          <p className="bilhete-prensa relative mt-[calc(0.7rem*var(--bu))] border-t border-dotted border-green-dark/40 pt-[calc(0.5rem*var(--bu))] font-mono text-[calc(5.5px*var(--bu))] font-bold uppercase tracking-[0.2em] text-green-dark/80">
            {nota}
          </p>
        ) : null}

        <SeloRomano className="absolute bottom-[calc(0.3rem*var(--bu))] left-[calc(1.25rem*var(--bu))] h-[calc(2.6rem*var(--bu))] w-[calc(2.6rem*var(--bu))] rotate-[7deg] text-emerald-deep/20" />

        <Microtexto
          texto={MICROTEXTO}
          className="bilhete-microtexto absolute inset-x-0 bottom-0 h-[calc(4px*var(--bu))] text-green-dark/45"
        />
      </div>

      <Picote />
      <Canhoto />
    </Papel>
  );
}

/* --- A PEÇA NO HERO ------------------------------------------------------
 * Uma face só, com a pose de ponteiro. É o bilhete do canto da primeira dobra
 * e o estado de repouso de quem não recebe a virada — e, quando o voo está
 * ativo, é a ÂNCORA: fica `visibility: hidden` mas continua ocupando a caixa,
 * porque é a caixa dela que diz ao voo onde fica o canto do hero.            */
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
        <TicketFrente />
      </div>
    </div>
  );
}
