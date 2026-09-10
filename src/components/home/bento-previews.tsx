"use client";

import Image from "next/image";
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { PaperTexture } from "@/components/home/paper-texture";
import { useEntranceAnimation } from "@/hooks/use-entrance-animation";
import { trackClient } from "@/lib/analytics-browser";
import {
  ArrowUpRightIcon,
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
      <PaperTexture />
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
  stageRef,
  ...rest
}: {
  children: ReactNode;
  tone?: string;
  stageRef?: React.Ref<HTMLDivElement>;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="flex flex-col p-4 pb-0 sm:p-6 sm:pb-0" {...rest}>
      <div
        ref={stageRef}
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

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2";

/* ---------------------------------------------------------------------------
 * Navegação por abas com tabindex itinerante.
 *
 * Os dois recortes são a mesma coisa por baixo — uma lista de opções e um
 * painel que responde — e a diferença é só a orientação. Sem isto cada mock
 * viraria um punhado de <button> soltos: o leitor de tela não anunciaria a
 * relação, e o teclado gastaria um Tab por canal em vez de uma seta.
 * ------------------------------------------------------------------------- */
function useRovingTabs(
  count: number,
  index: number,
  select: (i: number) => void,
  orientation: "horizontal" | "vertical",
) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (i: number) => {
    select(i);
    refs.current[i]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const [back, fwd] =
      orientation === "vertical"
        ? ["ArrowUp", "ArrowDown"]
        : ["ArrowLeft", "ArrowRight"];
    if (e.key === fwd) {
      e.preventDefault();
      move((index + 1) % count);
    } else if (e.key === back) {
      e.preventDefault();
      move((index - 1 + count) % count);
    } else if (e.key === "Home") {
      e.preventDefault();
      move(0);
    } else if (e.key === "End") {
      e.preventDefault();
      move(count - 1);
    }
  };

  const tabProps = (i: number, id: string) => ({
    ref: (el: HTMLButtonElement | null) => {
      refs.current[i] = el;
    },
    type: "button" as const,
    role: "tab" as const,
    id: `${id}-tab-${i}`,
    "aria-selected": i === index,
    "aria-controls": `${id}-panel`,
    tabIndex: i === index ? 0 : -1,
    onKeyDown,
    onClick: () => select(i),
  });

  return { tabProps };
}

/* O mock só começa a girar quando entra em tela e para de vez no primeiro
   gesto: um carrossel que continua avançando debaixo do cursor tira o
   controle de quem estava lendo. Movimento reduzido nunca inicia. */
const DWELL_MS = 5_200;

function useAutoCycle(count: number) {
  const { ref, isVisible } = useEntranceAnimation<HTMLDivElement>({
    threshold: 0.35,
  });
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!isVisible || held) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), DWELL_MS);
    return () => clearInterval(id);
  }, [isVisible, held, count]);

  const select = (i: number) => {
    setHeld(true);
    setIndex(i);
  };

  return { ref, index, select, hold: () => setHeld(true) };
}

const rowStyle = (i: number) => ({ "--row-i": i }) as CSSProperties;

/* ---------------------------------------------------------------------------
 * TRILHA BRASIL — recorte do feed do Superteam Earn.
 * ------------------------------------------------------------------------- */

const EARN_URL = "https://superteam.fun/earn/s/superteambr";

type Listing = {
  title: string;
  kind: "bounty" | "project";
  due: string;
  featured?: boolean;
};

const LISTINGS: Listing[] = [
  {
    title: "Trilha Brasil · Colosseum 2026",
    kind: "bounty",
    due: "12 out",
    featured: true,
  },
  { title: "Landing page de protocolo DeFi", kind: "project", due: "22 set" },
  { title: "Thread sobre token extensions", kind: "bounty", due: "30 set" },
  { title: "Vídeo explicando compressed NFTs", kind: "bounty", due: "05 out" },
  { title: "Carteira embutida em app mobile", kind: "project", due: "28 set" },
  { title: "Dashboard de métricas on-chain", kind: "project", due: "10 out" },
];

const EARN_TABS = [
  { key: "todos", label: "Todos" },
  { key: "bounty", label: "Bounties" },
  { key: "project", label: "Projetos" },
] as const;

const KIND_LABEL: Record<Listing["kind"], string> = {
  bounty: "Bounty",
  project: "Project",
};

/** Recorte do feed do Superteam Earn com a Trilha Brasil no topo. */
export function EarnPreview() {
  const [tab, setTab] = useState(0);
  const { tabProps } = useRovingTabs(
    EARN_TABS.length,
    tab,
    setTab,
    "horizontal",
  );

  const key = EARN_TABS[tab].key;
  const matches =
    key === "todos" ? LISTINGS : LISTINGS.filter((l) => l.kind === key);
  /* Sempre três linhas: o palco tem altura travada e uma lista que encolhe
     faria o card inteiro pular a cada troca de filtro. */
  const rows = matches.slice(0, 3);

  return (
    <PreviewStage>
      <div className={`overflow-hidden bg-surface-raised ${CARD}`}>
        <header className="flex items-center gap-3 px-5 pb-3 pt-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-dark">
            <Image
              src="/brand/stbr/logo/symbol-fwhite.png"
              alt=""
              width={18}
              height={17}
              className="h-4 w-auto"
            />
          </span>
          <p className="whitespace-nowrap font-heading text-[15px] font-bold text-ink">
            Superteam Earn
          </p>
          <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-emerald/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-deep">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-emerald bento-pulse"
            />
            <span className="tabular-nums">{matches.length}</span>
            <span className="sr-only sm:not-sr-only">abertos</span>
          </span>
        </header>

        {/* A barra de filtros é a parte jogável do recorte: mexer nela é o que
            transforma a captura de tela em produto. */}
        <div
          role="tablist"
          aria-label="Filtrar oportunidades por tipo"
          aria-orientation="horizontal"
          className="flex gap-1 border-b border-green-dark/10 px-4"
        >
          {EARN_TABS.map((t, i) => (
            <button
              key={t.key}
              {...tabProps(i, "earn")}
              className={`-mb-px cursor-pointer border-b-2 px-2.5 pb-2.5 pt-1 text-[12px] font-bold transition-colors duration-(--dur-instant) ease-entrada ${FOCUS_RING} focus-visible:ring-offset-surface-raised ${
                i === tab
                  ? "border-emerald text-emerald-deep"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <ul
          key={key}
          id="earn-panel"
          role="tabpanel"
          aria-labelledby={`earn-tab-${tab}`}
          /* O selo amarelo desce 12px por cima da borda: a folga extra aqui
             embaixo é para ele cobrir vazio, não a última linha do feed. */
          className="divide-y divide-green-dark/8 pb-2"
        >
          {rows.map((l, i) => (
            <li key={l.title} className="bento-row" style={rowStyle(i)}>
              <a
                href={EARN_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackClient("campaign_link_clicked", {
                    target: "earn_listing",
                    location: "bento_trilha",
                  })
                }
                className={`group flex items-center gap-3.5 px-5 py-3.5 transition-colors duration-(--dur-instant) ease-entrada hover:bg-surface/60 ${FOCUS_RING} focus-visible:ring-inset focus-visible:ring-offset-0 ${
                  l.featured
                    ? "shadow-[inset_3px_0_0_var(--color-yellow-strong)]"
                    : ""
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface transition-transform duration-(--dur-rapida) ease-mola group-hover:scale-105">
                  <Image
                    src="/brand/stbr/logo/SYMBOL-EMERALD-GREEN.svg"
                    alt=""
                    width={18}
                    height={17}
                    className="h-[18px] w-auto"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-pretty text-[14px] font-semibold leading-snug text-ink">
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
                    <span className="hidden shrink-0 sm:inline">
                      Fecha em {l.due}
                    </span>
                  </p>
                </div>
                {/* A seta ocupa a vaga da etiqueta em vez de abrir uma nova:
                    a coluna é estreita e qualquer largura extra quebra o
                    título em duas linhas. */}
                <span className="relative hidden h-6 w-[4.5rem] shrink-0 sm:block">
                  <span className="absolute inset-0 flex items-center justify-end">
                    <span className="rounded-full bg-surface px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-green-dark/80 transition-opacity duration-(--dur-instant) ease-entrada group-hover:opacity-0 group-focus-visible:opacity-0">
                      {KIND_LABEL[l.kind]}
                    </span>
                  </span>
                  <span className="absolute inset-0 flex items-center justify-end pr-1.5 opacity-0 transition-opacity duration-(--dur-instant) ease-entrada group-hover:opacity-100 group-focus-visible:opacity-100">
                    <ArrowUpRightIcon
                      aria-hidden
                      weight="bold"
                      className="h-4 w-4 text-emerald-deep"
                    />
                  </span>
                </span>
              </a>
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

/* ---------------------------------------------------------------------------
 * COMUNIDADE — recorte do Discord com o grupo do WhatsApp por baixo.
 * ------------------------------------------------------------------------- */

type Message = { author: string; tone: string; body: string };

type Channel = {
  name: string;
  unread: number;
  typing?: string;
  messages: Message[];
};

const AVATAR = {
  mentor: "bg-yellow text-green-dark",
  bia: "bg-emerald-deep text-surface-raised",
  superteam: "bg-surface text-green-dark",
  caio: "bg-green text-surface-raised",
  duda: "bg-yellow-strong text-green-dark",
} as const;

const CHANNELS: Channel[] = [
  {
    name: "colosseum-2026",
    unread: 0,
    typing: "Bia",
    messages: [
      {
        author: "Superteam",
        tone: AVATAR.superteam,
        body: "Workshop de submissão hoje, link fixado no topo.",
      },
      {
        author: "Mentor",
        tone: AVATAR.mentor,
        body: "Subi o passo a passo do deploy na devnet.",
      },
      {
        author: "Caio",
        tone: AVATAR.caio,
        body: "Alguém já enviou? Quero conferir o formato do vídeo.",
      },
    ],
  },
  {
    name: "procura-time",
    unread: 3,
    typing: "Duda",
    messages: [
      {
        author: "Bia",
        tone: AVATAR.bia,
        body: "Procuro alguém de front pro time, alguém topa?",
      },
      {
        author: "Caio",
        tone: AVATAR.caio,
        body: "Sou dev Rust e ainda estou sem time. Chama aqui.",
      },
      {
        author: "Duda",
        tone: AVATAR.duda,
        body: "Design aqui. Já fechei com dois devs, falta um back.",
      },
    ],
  },
  {
    name: "duvidas-tecnicas",
    unread: 7,
    messages: [
      {
        author: "Caio",
        tone: AVATAR.caio,
        body: "Anchor build quebrando no CI. Alguém passou por isso?",
      },
      {
        author: "Mentor",
        tone: AVATAR.mentor,
        body: "Trava a versão da CLI no toolchain. Resolve quase sempre.",
      },
      {
        author: "Caio",
        tone: AVATAR.caio,
        body: "Consegui, era só ajustar o Anchor.toml. Valeu!",
      },
    ],
  },
  {
    name: "workshops",
    unread: 1,
    messages: [
      {
        author: "Superteam",
        tone: AVATAR.superteam,
        body: "Workshop de pitch hoje às 19h, no palco do servidor.",
      },
      {
        author: "Duda",
        tone: AVATAR.duda,
        body: "Fica gravado? Nesse horário eu ainda estou no trabalho.",
      },
      {
        author: "Superteam",
        tone: AVATAR.superteam,
        body: "Fica. Sobe no YouTube no dia seguinte.",
      },
    ],
  },
];

/** Recorte da comunidade: servidor no Discord com o grupo do WhatsApp por baixo. */
export function CommunityPreview() {
  const { ref, index, select, hold } = useAutoCycle(CHANNELS.length);
  /* Canal visitado perde o contador de não lidas. É o detalhe que separa um
     mock de uma interface: a ação da pessoa deixa marca no estado. */
  const [seen, setSeen] = useState<number[]>([0]);
  const { tabProps } = useRovingTabs(
    CHANNELS.length,
    index,
    (i) => {
      select(i);
      setSeen((s) => (s.includes(i) ? s : [...s, i]));
    },
    "vertical",
  );

  const channel = CHANNELS[index];

  return (
    <PreviewStage
      tone="bg-yellow"
      stageRef={ref}
      onPointerEnter={hold}
      onFocusCapture={hold}
    >
      <div className={`flex overflow-hidden bg-green-dark ${CARD}`}>
        <aside className="flex w-[6.75rem] shrink-0 flex-col border-r border-surface/10 py-4 sm:w-44">
          <p className="flex items-center gap-2 px-3.5 pb-3.5 font-heading text-[12px] font-bold text-surface-raised sm:px-4 sm:text-[13px]">
            <DiscordLogoIcon
              weight="fill"
              className="h-4 w-4 shrink-0 text-yellow"
            />
            Superteam BR
          </p>
          <div
            role="tablist"
            aria-label="Canais do servidor"
            aria-orientation="vertical"
            className="flex flex-col"
          >
            {CHANNELS.map((c, i) => (
              <button
                key={c.name}
                {...tabProps(i, "discord")}
                className={`flex cursor-pointer items-center gap-1.5 px-3.5 py-2 text-left text-[11px] transition-colors duration-(--dur-instant) ease-entrada sm:px-4 sm:text-[12px] ${FOCUS_RING} focus-visible:ring-inset focus-visible:ring-offset-0 ${
                  i === index
                    ? "bg-surface/12 font-semibold text-surface-raised shadow-[inset_2px_0_0_var(--color-yellow)]"
                    : "text-surface/70 hover:bg-surface/6 hover:text-surface"
                }`}
              >
                <HashIcon weight="bold" className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{c.name}</span>
                {c.unread > 0 && !seen.includes(i) && (
                  <span className="ml-auto hidden h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-yellow px-1 font-mono text-[9px] font-bold text-green-dark tabular-nums sm:flex">
                    {c.unread}
                    <span className="sr-only"> mensagens não lidas</span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>

        <div
          id="discord-panel"
          role="tabpanel"
          aria-labelledby={`discord-tab-${index}`}
          className="flex min-w-0 flex-1 flex-col justify-center px-4 py-4 sm:px-5"
        >
          <ul key={channel.name} className="flex flex-col gap-3.5">
            {channel.messages.map((m, i) => (
              <li
                key={m.body}
                className="bento-row flex gap-2.5"
                style={rowStyle(i)}
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

          {/* Reserva a linha mesmo sem ninguém digitando: senão a altura do
              painel muda a cada troca de canal e o card inteiro respira. */}
          <p className="mt-3.5 flex h-4 items-center gap-1.5 text-[11px] text-surface/50">
            {channel.typing && (
              <>
                <span aria-hidden className="bento-typing flex gap-0.5">
                  <span className="h-1 w-1 rounded-full bg-surface/60" />
                  <span className="h-1 w-1 rounded-full bg-surface/60" />
                  <span className="h-1 w-1 rounded-full bg-surface/60" />
                </span>
                {channel.typing} está digitando
              </>
            )}
          </p>
        </div>
      </div>

      <div
        className={`relative -mt-3 ml-auto w-[90%] bg-surface-raised px-5 py-4 ${CARD_OVER}`}
      >
        <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-green-dark/80">
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
