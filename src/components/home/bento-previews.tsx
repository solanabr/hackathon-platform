import Image from "next/image";
import type { ReactNode } from "react";
import {
  CheckCircleIcon,
  DiscordLogoIcon,
  HashIcon,
  WhatsappLogoIcon,
  YoutubeLogoIcon,
} from "@phosphor-icons/react/dist/ssr";

/* A trama de papel mora dentro do palco, não no card inteiro: os pontos
   emolduram a peça pelas bordas e clareiam no miolo, onde ela se apoia. */
const CORNERS = [
  "left-0 top-0",
  "right-0 top-0",
  "left-0 bottom-0",
  "right-0 bottom-0",
];

function StageTexture() {
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgb(27_35_29/0.22)_1px,transparent_1px)] [background-size:10px_10px] [mask-image:radial-gradient(120%_100%_at_50%_50%,rgb(0_0_0/0.15)_25%,#000_85%)] [-webkit-mask-image:radial-gradient(120%_100%_at_50%_50%,rgb(0_0_0/0.15)_25%,#000_85%)]"
      />
      <span aria-hidden className="pointer-events-none absolute inset-3">
        {CORNERS.map((pos) => (
          <span
            key={pos}
            className={`absolute h-1.5 w-1.5 rounded-[1px] bg-green-dark/20 ${pos}`}
          />
        ))}
      </span>
    </>
  );
}

/* Palco recuado, com respiro largo: a peça se apoia nele inteira. A altura é
   travada no desktop para os dois cards do bento emoldurarem igual — a folga
   de cada card sobra no bloco de texto, não entre o recorte e ele. */
function PreviewStage({
  children,
  tone = "bg-surface-deeper",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <div className="flex flex-col p-4 pb-0 sm:p-6 sm:pb-0">
      <div
        className={`relative flex min-h-[17rem] items-center rounded-xl ${tone} px-4 py-9 shadow-[inset_0_2px_8px_rgb(27_35_29/0.07)] ring-1 ring-inset ring-green-dark/10 sm:h-[29.5rem] sm:px-8 sm:py-11`}
      >
        <StageTexture />
        <div className="relative w-full">{children}</div>
      </div>
    </div>
  );
}

/* Dentro do palco a profundidade vem da sombra, não da borda: a linha dura
   fica reservada ao card do bento, senão o recorte lê como adesivo. */
const CARD =
  "rounded-2xl shadow-[0_1px_2px_rgb(27_35_29/0.1),0_14px_30px_-10px_rgb(27_35_29/0.3)]";
const CARD_OVER =
  "rounded-2xl shadow-[0_2px_5px_rgb(27_35_29/0.1),0_22px_45px_-12px_rgb(27_35_29/0.45)]";

const EARN_LISTINGS = [
  {
    title: "Trilha Brasil · Colosseum 2026",
    tag: "Bounty",
    due: "Fecha em 12 out",
    featured: true,
  },
  {
    title: "Landing page para protocolo de staking",
    tag: "Project",
    due: "Fecha em 22 set",
  },
  {
    title: "Thread técnica sobre token extensions",
    tag: "Bounty",
    due: "Fecha em 30 set",
  },
];

/** Recorte do feed do Superteam Earn com a Trilha Brasil no topo. */
export function EarnPreview() {
  return (
    <PreviewStage>
      <div className={`overflow-hidden bg-surface-raised ${CARD}`}>
        <header className="flex items-center gap-3 border-b border-green-dark/10 px-5 py-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-dark">
            <Image
              src="/brand/stbr/logo/symbol-fwhite.png"
              alt=""
              width={18}
              height={17}
              className="h-4 w-auto"
            />
          </span>
          <p className="font-heading text-[15px] font-bold text-ink">
            Superteam Earn
          </p>
          <span className="ml-auto shrink-0 rounded-full bg-emerald/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald">
            Abertos
          </span>
        </header>

        <ul className="divide-y divide-green-dark/8">
          {EARN_LISTINGS.map((l) => (
            <li
              key={l.title}
              className={`flex items-center gap-3.5 px-5 py-3.5 ${
                l.featured
                  ? "shadow-[inset_3px_0_0_var(--color-yellow-strong)]"
                  : ""
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface">
                <Image
                  src="/brand/stbr/logo/SYMBOL-EMERALD-GREEN.svg"
                  alt=""
                  width={18}
                  height={17}
                  className="h-[18px] w-auto"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold leading-snug text-ink">
                  {l.title}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted">
                  <span className="truncate">Superteam Brasil</span>
                  <CheckCircleIcon
                    weight="fill"
                    className="h-3.5 w-3.5 shrink-0 text-emerald"
                  />
                  <span aria-hidden className="hidden sm:inline">
                    ·
                  </span>
                  <span className="hidden shrink-0 sm:inline">{l.due}</span>
                </p>
              </div>
              <span className="hidden shrink-0 rounded-full bg-surface px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-green-dark/60 sm:block">
                {l.tag}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Escalonado como na referência: desce por cima da borda do painel e
          desloca para a direita, para as duas peças não lerem como uma pilha. */}
      <div
        className={`relative -mt-3 ml-auto w-[90%] bg-yellow px-5 py-4 ${CARD_OVER}`}
      >
        <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-green-dark/70">
          <span className="rounded bg-green-dark px-1.5 py-0.5 text-yellow">
            BR
          </span>
          Prêmio extra
        </p>
        <p className="mt-2 text-pretty text-[15px] font-medium leading-snug text-green-dark">
          O mesmo projeto do Colosseum concorre de novo aqui, só entre times
          brasileiros.
        </p>
      </div>
    </PreviewStage>
  );
}

const MESSAGES = [
  {
    author: "Mentor",
    tone: "bg-yellow text-green-dark",
    body: "Subi o passo a passo do deploy na devnet.",
  },
  {
    author: "Bia",
    tone: "bg-emerald text-surface-raised",
    body: "Procuro alguém de front pro time, alguém topa?",
  },
  {
    author: "Superteam",
    tone: "bg-surface text-green-dark",
    body: "Workshop de submissão hoje, link fixado no topo.",
  },
  {
    author: "Caio",
    tone: "bg-green text-surface-raised",
    body: "Consegui, era só ajustar o Anchor.toml. Valeu!",
  },
];

const CHANNELS = [
  "colosseum-2026",
  "procura-time",
  "duvidas-tecnicas",
  "workshops",
];

/** Recorte da comunidade: servidor no Discord com o grupo do WhatsApp por baixo. */
export function CommunityPreview() {
  return (
    <PreviewStage tone="bg-yellow">
      <div className={`flex overflow-hidden bg-green-dark ${CARD}`}>
        <aside className="flex w-[6.75rem] shrink-0 flex-col border-r border-surface/10 py-4 sm:w-40">
          <p className="flex items-center gap-2 px-3.5 pb-3.5 font-heading text-[12px] font-bold text-surface-raised sm:px-4 sm:text-[13px]">
            <DiscordLogoIcon
              weight="fill"
              className="h-4 w-4 shrink-0 text-yellow"
            />
            Superteam BR
          </p>
          <ul>
            {CHANNELS.map((c, i) => (
              <li
                key={c}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-[11px] sm:px-4 sm:text-[12px] ${
                  i === 0
                    ? "bg-surface/12 font-semibold text-surface-raised shadow-[inset_2px_0_0_var(--color-yellow)]"
                    : "text-surface/50"
                }`}
              >
                <HashIcon weight="bold" className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{c}</span>
              </li>
            ))}
          </ul>
        </aside>

        <ul className="flex min-w-0 flex-1 flex-col justify-center gap-3.5 px-4 py-4 sm:px-5">
          {MESSAGES.map((m, i) => (
            <li
              key={m.author}
              className={`gap-2.5 ${i === MESSAGES.length - 1 ? "hidden sm:flex" : "flex"}`}
            >
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-heading text-[11px] font-black ${m.tone}`}
              >
                {m.author[0]}
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-surface-raised">
                  {m.author}
                </p>
                <p className="mt-0.5 text-pretty text-[13px] leading-snug text-surface/70">
                  {m.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div
        className={`relative -mt-3 ml-auto w-[90%] bg-surface-raised px-5 py-4 ${CARD_OVER}`}
      >
        <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-green-dark/55">
          <WhatsappLogoIcon weight="fill" className="h-4 w-4 text-emerald" />
          Grupo do WhatsApp
          <YoutubeLogoIcon
            weight="fill"
            className="ml-auto h-4 w-4 text-green-dark/30"
          />
        </p>
        <p className="mt-2 text-pretty text-[15px] font-medium leading-snug text-ink">
          Avisos, aulas gravadas e ajuda rápida — sem sair do seu celular.
        </p>
      </div>
    </PreviewStage>
  );
}
