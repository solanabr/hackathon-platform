import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { Reveal } from "@/components/ui/reveal";
import { QuestionGlyph } from "./question-glyph";

export type CaseCard = {
  name: string;
  url?: string;
  logo?: string;
  figure?: string;
  result?: string;
  tagline: string;
  body?: ReactNode;
  tone?: "light" | "dark";
  /** Carta-ilustração: só este sinal no meio do quadro, sem uma linha de
   * texto. A leitura fica com o leitor de tela, pelo rótulo da carta. */
  glyph?: string;
};

/* Assinatura da carta: selo, nome e uma linha de contexto. Mora fora da
   CaseTile porque a carta-ilustração fecha do mesmo jeito — só o miolo dela é
   que muda. */
function TileFooter({ item }: { item: CaseCard }) {
  const dark = item.tone === "dark";
  return (
    <div
      className={`flex items-center gap-3 border-t-2 pt-4 ${
        dark ? "border-surface/20" : "border-green-dark/10"
      }`}
    >
      {item.logo ? (
        <Image
          src={item.logo}
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 rounded-xl border-2 border-green-dark/10 object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-yellow font-heading text-lg font-black text-yellow"
        >
          ?
        </span>
      )}
      <div className="min-w-0">
        <p
          className={`font-heading text-base font-bold ${
            item.url ? "group-hover:underline" : ""
          }`}
        >
          {item.name}
        </p>
        <p
          className={`text-[13px] leading-snug ${
            dark ? "text-surface/65" : "text-muted"
          }`}
        >
          {item.tagline}
        </p>
      </div>
    </div>
  );
}

/* Carta-ilustração: o meio-tom ocupa o quadro inteiro no lugar do número e do
   parágrafo, e só a assinatura fica embaixo. */
function GlyphTile({ item }: { item: CaseCard }) {
  return (
    <div className="card-cut card-cut-dark flex h-full min-h-[17rem] flex-col p-6 sm:p-8 xl:p-9">
      <div className="flex min-h-0 flex-1 items-center justify-center py-2">
        <QuestionGlyph className="h-full max-h-[12rem] w-auto text-yellow" />
      </div>
      <TileFooter item={item} />
    </div>
  );
}

function CaseTile({ item }: { item: CaseCard }) {
  const dark = item.tone === "dark";
  const inner = (
    <>
      <p
        className={`font-heading text-[clamp(2.1rem,3.6vw,2.9rem)] font-black uppercase leading-[0.85] tracking-tight [font-stretch:118%] ${
          dark ? "text-yellow" : "text-green-dark"
        }`}
      >
        {item.figure}
      </p>
      <p
        className={`mt-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] ${
          dark ? "text-surface/75" : "text-ink/70"
        }`}
      >
        {item.result}
      </p>
      <p
        className={`mb-6 mt-4 flex-1 text-pretty text-sm leading-relaxed ${
          dark ? "text-surface/85" : "text-ink/75"
        }`}
      >
        {item.body}
      </p>
      <TileFooter item={item} />
    </>
  );

  const shell = `card-cut group flex h-full flex-col p-6 sm:p-8 xl:p-9 ${
    dark ? "card-cut-dark" : ""
  }`;

  if (item.glyph) return <GlyphTile item={item} />;

  return item.url ? (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={shell}
    >
      {inner}
    </a>
  ) : (
    <div className={shell}>{inner}</div>
  );
}

/* Uma faixa só para as três cartas, em escada: cada uma desce um degrau
   igual da anterior e as das pontas passam dos trilhos, então a fila ocupa o
   palco inteiro. O passo é constante de propósito — o que solta a composição
   é a inclinação e a sangria, não um desalinho aleatório em cada carta. A
   preta fecha a fila mais estreita: é a única de fundo cheio e ficaria pesada
   na mesma largura das outras duas. */
const SLOT = [
  "z-30 lg:col-start-1 lg:col-span-7 lg:ml-[calc(-1*clamp(1rem,(100vw-72rem)/2+1rem,2.5rem))] lg:max-w-none xl:ml-[calc(-1*clamp(2rem,(100vw-80rem)/2+2rem,4rem))]",
  "z-20 max-lg:-mt-4 max-lg:self-end lg:col-start-8 lg:col-span-8 lg:mt-12 lg:-ml-4 lg:max-w-none xl:-ml-6",
  "z-10 max-lg:-mt-4 sm:max-lg:ml-10 lg:col-start-16 lg:col-span-5 lg:mt-24 lg:-ml-4 lg:mr-[calc(-1*clamp(1rem,(100vw-72rem)/2+1rem,2.5rem))] lg:max-w-none xl:-ml-6 xl:mr-[calc(-1*clamp(2rem,(100vw-80rem)/2+2rem,4rem))]",
];
const POSE = ["-rotate-[1.75deg]", "rotate-[1.25deg]", "-rotate-[1deg]"];

export function CasesFan({
  cases,
  title,
  intro,
}: {
  cases: CaseCard[];
  title: ReactNode;
  intro: ReactNode;
}) {
  return (
    <div className="relative">
      {/* Manchete e texto de apoio dividem a primeira linha: o título ocupa a
          coluna larga e o parágrafo fecha a direita, descido até a segunda
          linha da manchete — encostado no topo dela os dois blocos empatam e
          nenhum manda. A faixa de cartas herda o palco inteiro embaixo. */}
      <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-10">
        <div className="lg:col-span-8">{title}</div>
        <div className="mt-8 lg:col-span-4 lg:col-start-9 lg:mt-24">{intro}</div>
      </div>

      {/* A fila sobe pelo lado esquerdo: quem define a altura da linha de cima é
          o parágrafo, à direita, e sem esse puxão a primeira carta ficaria
          pendurada longe da manchete. O degrau entre as três continua igual. */}
      <div className="relative mt-12 flex flex-col items-start sm:mt-14 lg:-mt-4 lg:grid lg:grid-cols-20 lg:items-start lg:gap-0">
        {cases.map((item, i) => (
          <Reveal
            key={item.name}
            index={i + 1}
            tone="papel"
            className={`relative w-full max-w-lg lg:w-auto ${SLOT[i] ?? ""}`}
          >
            {/* A escada abre com a rolagem: cada carta anda um degrau a mais
                que a anterior, então o intervalo entre as três cresce
                enquanto a faixa atravessa a tela e fecha de novo na saída. O
                índice é a única coisa escrita aqui — a distância sai do token
                de deriva, como todo stagger desta base. */}
            <div
              className="cena-carta h-full"
              style={{ "--carta-i": i + 1 } as CSSProperties}
            >
              <div
                className={`h-full transition-transform duration-(--dur-rapida) ease-mola hover:rotate-0 ${
                  POSE[i] ?? ""
                }`}
              >
                <CaseTile item={item} />
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
