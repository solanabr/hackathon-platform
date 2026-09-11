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
  /** Illustration card: only this glyph in the middle of the frame, not a
   * line of text. Reading is left to the screen reader, via the card label. */
  glyph?: string;
};

/* Card signature: badge, name and one line of context. Lives outside CaseTile
   because the illustration card closes the same way — only its middle
   changes. */
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

/* Illustration card: the halftone fills the whole frame in place of the number
   and the paragraph, and only the signature stays below. */
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

/* One band for the three cards, stepped: each drops one equal step from the
   previous and the end ones run past the rails, so the row fills the whole
   stage. The step is constant on purpose — what loosens the composition is
   the tilt and the bleed, not a random misalignment on each card. The black
   one closes the row narrowest: it is the only solid-fill one and would feel
   heavy at the same width as the other two. */
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
      {/* Headline and supporting text share the first row: the title takes the
          wide column and the paragraph closes on the right, dropped to the
          headline's second line — flush with its top the two blocks tie and
          neither leads. The card band inherits the whole stage below. */}
      <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-10">
        <div className="lg:col-span-8">{title}</div>
        <div className="mt-8 lg:col-span-4 lg:col-start-9 lg:mt-24">{intro}</div>
      </div>

      {/* The row climbs on the left side: the paragraph on the right sets the
          height of the top line, and without this pull the first card would
          hang far from the headline. The step between the three stays the same. */}
      <div className="relative mt-12 flex flex-col items-start sm:mt-14 lg:-mt-4 lg:grid lg:grid-cols-20 lg:items-start lg:gap-0">
        {cases.map((item, i) => (
          <Reveal
            key={item.name}
            index={i + 1}
            tone="papel"
            className={`relative w-full max-w-lg lg:w-auto ${SLOT[i] ?? ""}`}
          >
            {/* The staircase opens with scroll: each card travels one step more
                than the previous, so the gap between the three grows while the
                band crosses the screen and closes again on exit. The index is
                the only thing written here — the distance comes from the drift
                token, like every stagger on this base. */}
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
