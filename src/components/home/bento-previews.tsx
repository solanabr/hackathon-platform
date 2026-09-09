import Image from "next/image";
import type { ReactNode } from "react";
import {
  CheckCircleIcon,
  DiscordLogoIcon,
  HashIcon,
  WhatsappLogoIcon,
  YoutubeLogoIcon,
} from "@phosphor-icons/react/dist/ssr";

/* Palco dos previews: fundo pontilhado com as marcas de canto do papel, e o
   mockup flutuando dentro sem caber inteiro — a UI parece recortada de dentro
   da plataforma, não desenhada para o card. */
function PreviewStage({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-[300px] overflow-hidden border-b-2 border-green-dark bg-surface-deep sm:h-[360px]">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle,rgb(27_35_29/0.22)_1px,transparent_1px)] [background-size:9px_9px]"
      />
      {[
        "left-2.5 top-2.5",
        "right-2.5 top-2.5",
        "bottom-2.5 left-2.5",
        "bottom-2.5 right-2.5",
      ].map((pos) => (
        <span
          key={pos}
          aria-hidden
          className={`absolute h-2 w-2 bg-green-dark/25 ${pos}`}
        />
      ))}
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}

const EARN_LISTINGS = [
  {
    title: "Trilha Brasil · Colosseum 2026",
    meta: "Superteam Brasil",
    tag: "Bounty",
    due: "Fecha em 12 out",
    prize: "USDC",
    featured: true,
  },
  {
    title: "Landing page para protocolo de staking",
    meta: "Superteam Brasil",
    tag: "Project",
    due: "Fecha em 22 set",
    prize: "USDC",
  },
  {
    title: "Thread técnica sobre token extensions",
    meta: "Superteam Brasil",
    tag: "Bounty",
    due: "Fecha em 30 set",
    prize: "USDC",
  },
];

/** Recorte do feed do Superteam Earn com a Trilha Brasil no topo. */
export function EarnPreview() {
  return (
    <PreviewStage>
      <div className="absolute inset-x-4 top-5 rounded-2xl border-2 border-green-dark bg-surface-raised shadow-sticker sm:inset-x-7 sm:top-7">
        <header className="flex items-center gap-2.5 border-b-2 border-green-dark/12 px-4 py-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-dark">
            <Image
              src="/brand/stbr/logo/symbol-fwhite.png"
              alt=""
              width={18}
              height={17}
              className="h-3.5 w-auto"
            />
          </span>
          <p className="font-heading text-sm font-bold text-ink">
            Superteam Earn
          </p>
          <span className="ml-auto rounded-full bg-emerald/10 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-emerald">
            Abertos
          </span>
        </header>

        <ul className="divide-y-2 divide-green-dark/10">
          {EARN_LISTINGS.map((l) => (
            <li
              key={l.title}
              className={`flex items-center gap-3 px-4 py-3 ${l.featured ? "bg-yellow/25" : ""}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-green-dark/15 bg-surface">
                <Image
                  src="/brand/stbr/logo/SYMBOL-EMERALD-GREEN.svg"
                  alt=""
                  width={18}
                  height={17}
                  className="h-4 w-auto"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold leading-tight text-ink">
                  {l.title}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                  <span className="truncate">{l.meta}</span>
                  <CheckCircleIcon
                    weight="fill"
                    className="h-3 w-3 shrink-0 text-emerald"
                  />
                  <span aria-hidden>·</span>
                  <span className="shrink-0 rounded border border-green-dark/15 px-1 py-px font-mono text-[9px] font-bold uppercase tracking-wider text-green-dark/70">
                    {l.tag}
                  </span>
                  <span aria-hidden className="hidden sm:inline">
                    ·
                  </span>
                  <span className="hidden shrink-0 sm:inline">{l.due}</span>
                </p>
              </div>
              <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-widest text-green-dark/60">
                {l.prize}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="absolute bottom-5 left-4 right-10 rounded-xl border-2 border-green-dark bg-green px-4 py-3 shadow-sticker sm:bottom-6 sm:left-10 sm:right-16">
        <p className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-widest text-yellow">
          <span className="rounded bg-yellow px-1.5 py-px text-green-dark">
            BR
          </span>
          Prêmio extra
        </p>
        <p className="mt-1.5 text-pretty text-[13px] font-medium leading-snug text-surface">
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

/** Recorte da comunidade: servidor no Discord com o grupo do WhatsApp por cima. */
export function CommunityPreview() {
  return (
    <PreviewStage>
      <div className="absolute bottom-8 left-4 top-5 flex w-[106%] overflow-hidden rounded-2xl border-2 border-green-dark bg-green-dark shadow-sticker sm:bottom-10 sm:left-7 sm:top-7 sm:w-[103%]">
        <aside className="w-32 shrink-0 border-r border-surface/10 py-3 sm:w-40">
          <p className="flex items-center gap-1.5 px-3 pb-2.5 font-heading text-[12px] font-bold text-surface-raised">
            <DiscordLogoIcon weight="fill" className="h-4 w-4 text-yellow" />
            Superteam BR
          </p>
          <ul className="space-y-px">
            {CHANNELS.map((c, i) => (
              <li
                key={c}
                className={`flex items-center gap-1 px-3 py-1.5 text-[11px] ${
                  i === 0
                    ? "bg-surface/12 font-bold text-surface-raised"
                    : "text-surface/55"
                }`}
              >
                <HashIcon weight="bold" className="h-3 w-3 shrink-0" />
                <span className="truncate">{c}</span>
              </li>
            ))}
          </ul>
        </aside>

        <ul className="min-w-0 flex-1 space-y-3 p-3.5">
          {MESSAGES.map((m) => (
            <li key={m.author} className="flex gap-2">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-heading text-[10px] font-black ${m.tone}`}
              >
                {m.author[0]}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-surface-raised">
                  {m.author}
                </p>
                <p className="text-pretty text-[11.5px] leading-snug text-surface/70">
                  {m.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="absolute bottom-5 left-4 right-10 rounded-xl border-2 border-green-dark bg-surface-raised px-4 py-3 shadow-sticker sm:bottom-6 sm:left-10 sm:right-16">
        <p className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-widest text-green-dark/60">
          <WhatsappLogoIcon weight="fill" className="h-4 w-4 text-emerald" />
          Grupo do WhatsApp
          <YoutubeLogoIcon
            weight="fill"
            className="ml-auto h-4 w-4 text-green-dark/40"
          />
        </p>
        <p className="mt-1.5 text-pretty text-[13px] font-medium leading-snug text-ink">
          Avisos, aulas gravadas e ajuda rápida — sem sair do seu celular.
        </p>
      </div>
    </PreviewStage>
  );
}
