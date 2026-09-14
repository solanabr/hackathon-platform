"use client";

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
import {
  DiscordLogoIcon,
  HashIcon,
  WhatsappLogoIcon,
  YoutubeLogoIcon,
} from "@phosphor-icons/react/dist/ssr";

/* The paper weave lives inside the stage, not on the whole card: the dots
   frame the piece at the edges and lighten in the middle, where it rests. */
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

/* Recessed stage with wide breathing room: the piece rests on it whole. The
   height is locked on desktop so the two bento cards frame alike — each
   card's slack ends up in the text block, not between the cutout and it. */
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

/* Inside the stage depth comes from shadow, not from the border: the hard
   line is reserved for the bento card, or the cutout reads as a sticker. */
const CARD =
  "rounded-2xl shadow-[0_1px_2px_rgb(27_35_29/0.1),0_14px_30px_-10px_rgb(27_35_29/0.3)]";
const CARD_OVER =
  "rounded-2xl shadow-[0_2px_5px_rgb(27_35_29/0.1),0_22px_45px_-12px_rgb(27_35_29/0.45)]";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2";

/* ---------------------------------------------------------------------------
 * Tab navigation with roving tabindex.
 *
 * The two cutouts are the same thing underneath — a list of options and a
 * panel that responds — and the difference is only the orientation. Without
 * this each mock would become a handful of loose <button>s: the screen reader
 * would not announce the relation, and the keyboard would spend one Tab per
 * channel instead of one arrow.
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

/* The mock only starts cycling once it enters the screen and stops for good
   on the first gesture: a carousel that keeps advancing under the cursor
   takes control away from whoever was reading. Reduced motion never starts. */
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
 * COMMUNITY — Discord cutout with the WhatsApp group underneath.
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

/** Community cutout: Discord server with the WhatsApp group underneath. */
export function CommunityPreview() {
  const { ref, index, select, hold } = useAutoCycle(CHANNELS.length);
  /* A visited channel loses its unread count. The detail that separates a
     mock from an interface: the person's action leaves a mark on the state. */
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

          {/* Reserves the line even with nobody typing: otherwise the panel
              height changes on every channel switch and the whole card breathes. */}
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
