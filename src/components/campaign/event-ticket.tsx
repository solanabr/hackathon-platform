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
  GuillocheBand,
  Meander,
  Medallion,
  Microtext,
  RomanSeal,
} from "@/components/campaign/gravacao";

/* The stub that travels across the page carries this same number. As a literal
   in two places it would drift one day — and the matching number is exactly
   the proof that it is the same ticket, not two similar objects. */
export const TICKET_SERIAL = "001417";

/* The same number in the house numerals. Not decoration: it is the second
   register every real numbered piece carries, and it gives the ticket the
   seal's Roman date without writing "2026" twice. */
const TICKET_SERIAL_ROMAN = "MCDXVII";

const MICROTEXT =
  "SUPERTEAM BRASIL · HACKATHON COLOSSEUM · CRYPTO WORLD'S FAIR · MMXXVI · ";

/* Pose travel, in degrees. Seven is the ceiling that keeps the rectangle
   reading as a rectangle: past it the perspective visibly narrows one side
   and the ticket turns into a spinning shop sign. */
const POSE_MAX = 7;

/* ---------------------------------------------------------------------------
 * `--bu` — THE TICKET UNIT
 *
 * The ticket lives at two sizes: small in the hero corner and large, flipped,
 * parked in the next section. It is the SAME piece — so it cannot have two
 * drawings, and it cannot be a plain `scale` of the other either: scaling a
 * paper card scales the perforation, the punch hole and the type size along
 * with it, and what was print becomes an enlargement of print.
 *
 * So every internal measure is written as `calc(x * var(--bu))`. One unit
 * governs type size, breathing room, stub width, perforation pitch and seal
 * size. The instance writes `--bu`: 1 in the hero, and the ratio between the
 * two widths when parked — and that same ratio, inverted, is what the flight
 * uses as `scale`. The two ends close by construction.
 * ------------------------------------------------------------------------- */

/**
 * THE PAPER — the plate both faces share.
 *
 * Deckled cut, weave, laid lines, pulp stain and the light. Everything that is
 * substrate lives here; content comes in as `children`. Without this the two
 * faces would diverge at the first texture tweak — and a card whose front and
 * back are different papers stops being a card.
 */
function Paper({
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
      {/* The paper weave, the same as the page's. It lives at the bottom and
          the body becomes positioned, or the absolute layer covers the text. */}
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

      {/* THE LIGHT. Last layer, crossing paper and stub on the same axis:
          one source for the whole piece. */}
      <span
        aria-hidden
        className="bilhete-luz pointer-events-none absolute inset-0"
      />
    </div>
  );
}

/** The yellow stub with the hot stamp. Same on both faces: a ticket's stub
 *  is the same strip of foil seen from either side. */
function Stub() {
  return (
    <div className="bilhete-canhoto relative flex shrink-0 items-center bg-yellow gap-[calc(0.5rem*var(--bu))] px-[calc(0.5rem*var(--bu))] sm:gap-[calc(0.75rem*var(--bu))] sm:px-[calc(0.75rem*var(--bu))]">
      {/* THE HOT STAMP LAYERS, in physical order: pearl, iris, specular,
          ink. Swapping the order is what makes foil look like a colored sticker. */}
      <span aria-hidden className="foil-perola absolute inset-0" />
      <span aria-hidden className="foil-iris absolute inset-0" />
      <span aria-hidden className="foil-brilho absolute inset-0" />
      <GuillocheBand className="foil-linha inset-0 h-full w-full text-green-dark/20" />

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

/** The perforation line: holes punched through to the cream, with the burr
 *  the punch leaves in the paper. */
function Perforation() {
  return (
    <div
      aria-hidden
      className="ticket-holes relative w-[calc(1.15rem*var(--bu))] shrink-0 sm:w-[calc(1.4rem*var(--bu))]"
    />
  );
}

/* --- THE FRONT -----------------------------------------------------------
 * What has been printed on the ticket from the start: the edition, the number,
 * the period and the terms. It is the side people see above the fold.        */
export function TicketFront() {
  return (
    <Paper>
      <div className="relative min-w-0 flex-1 px-[calc(1rem*var(--bu))] py-[calc(1rem*var(--bu))] sm:px-[calc(1.75rem*var(--bu))] sm:py-[calc(1.5rem*var(--bu))] lg:pb-[calc(3.5rem*var(--bu))] lg:pt-[calc(1.75rem*var(--bu))]">
        {/* THE MEDALLION. Runs off the frame to the right and is cut by the
            perforation, as on a banknote — guilloche that respects the text
            frame reads as a page-background stamp, not security printing. */}
        <Medallion className="top-1/2 h-[calc(13rem*var(--bu))] w-[calc(13rem*var(--bu))] -translate-y-1/2 text-green-dark/[0.085] [right:calc(-6.5rem*var(--bu))] sm:h-[calc(15rem*var(--bu))] sm:w-[calc(15rem*var(--bu))] sm:[right:calc(-7.5rem*var(--bu))] lg:h-[calc(17rem*var(--bu))] lg:w-[calc(17rem*var(--bu))] lg:[right:calc(-8.5rem*var(--bu))]" />

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
              {TICKET_SERIAL_ROMAN}
            </p>
          </div>
        </div>

        {/* Where a rule once separated the header from the body, the meander
            now runs. Same height, same job — the rule just gained a drawing. */}
        <Meander className="relative my-[calc(0.75rem*var(--bu))] h-[calc(8px*var(--bu))] w-full text-green-dark/35 sm:my-[calc(1.25rem*var(--bu))] sm:h-[calc(11px*var(--bu))]" />

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

        {/* THE SEAL. Struck over the perforation and off-axis, because a
            stamp is a hand gesture. Only from `lg` up, and that is the framing
            deciding: below that point the ticket is wide and short, the footer
            line wraps onto two and the bottom-right corner — the only place a
            stamp sits well — is where it ends. */}
        <RomanSeal className="absolute bottom-[calc(0.75rem*var(--bu))] right-[calc(1.25rem*var(--bu))] hidden h-[calc(4.75rem*var(--bu))] w-[calc(4.75rem*var(--bu))] -rotate-[9deg] text-emerald-deep/25 lg:block" />

        {/* The microtext runs along the bottom edge of the body. At rest it is
            a texture; up close it becomes words. */}
        <Microtext
          text={MICROTEXT}
          className="bilhete-microtexto absolute inset-x-0 bottom-0 h-[calc(7px*var(--bu))] text-green-dark/45"
        />
      </div>

      <Perforation />
      <Stub />
    </Paper>
  );
}

export type TicketFact = {
  figure: string;
  title: string;
  body: string;
  accent?: boolean;
};

/* --- THE BACK ------------------------------------------------------------
 * What a real ticket has on the back: the terms, in the same ink and in small
 * type. That is why the section's content fits here without becoming something
 * else — the section IS this ticket's fine print. Its title stays out because
 * a title belongs to the PAGE, not the piece: the sheet announces the section.
 *
 * The stub switches sides, and that is no gratuitous detail: flip a ticket in
 * your hand and the stub shows up on the other side. Keeping it on the right
 * would give away the back as a second image, not the other side of one sheet. */
export function TicketBack({
  facts,
  note,
}: {
  facts: readonly TicketFact[];
  note?: string;
}) {
  return (
    <Paper espelhado>
      {/* The back is set at HALF the unit the front would use. Not an
          inconsistency: the front is only ever seen reduced by the flight
          (`--bu` up, `scale` down, one cancels the other), while the back is
          seen at the large size, unreduced. Setting both at the same scale
          would give the back poster-sized type. */}
      <div className="relative flex min-w-0 flex-1 flex-col px-[calc(1.25rem*var(--bu))] py-[calc(1rem*var(--bu))]">
        <Medallion className="top-1/2 h-[calc(9rem*var(--bu))] w-[calc(9rem*var(--bu))] -translate-y-1/2 text-green-dark/[0.07] [left:calc(-4.5rem*var(--bu))]" />

        <div className="relative flex items-baseline justify-between gap-[calc(0.75rem*var(--bu))]">
          <p className="bilhete-prensa font-mono text-[calc(5.5px*var(--bu))] font-bold uppercase tracking-[0.2em] text-green-dark/80">
            Verso · condições da edição
          </p>
          <p className="bilhete-prensa shrink-0 font-mono text-[calc(5.5px*var(--bu))] font-bold uppercase tracking-[0.2em] text-green-dark/80">
            Nº {TICKET_SERIAL}
          </p>
        </div>

        <Meander className="relative my-[calc(0.6rem*var(--bu))] h-[calc(6px*var(--bu))] w-full text-green-dark/35" />

        {/* The four clauses. No frame and no shadow: they are PRINTED on the
            paper, not stuck onto it — a sticker card on top of the ticket
            would turn the ticket into another object's background. What parts
            them is the rule, which is how a document separates clauses. */}
        <dl className="relative grid flex-1 content-start gap-x-[calc(1.75rem*var(--bu))] gap-y-[calc(0.8rem*var(--bu))] sm:grid-cols-2">
          {facts.map((fato) => (
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

        {note ? (
          <p className="bilhete-prensa relative mt-[calc(0.7rem*var(--bu))] border-t border-dotted border-green-dark/40 pt-[calc(0.5rem*var(--bu))] font-mono text-[calc(5.5px*var(--bu))] font-bold uppercase tracking-[0.2em] text-green-dark/80">
            {note}
          </p>
        ) : null}

        <RomanSeal className="absolute bottom-[calc(0.3rem*var(--bu))] left-[calc(1.25rem*var(--bu))] h-[calc(2.6rem*var(--bu))] w-[calc(2.6rem*var(--bu))] rotate-[7deg] text-emerald-deep/20" />

        <Microtext
          text={MICROTEXT}
          className="bilhete-microtexto absolute inset-x-0 bottom-0 h-[calc(4px*var(--bu))] text-green-dark/45"
        />
      </div>

      <Perforation />
      <Stub />
    </Paper>
  );
}

/* --- THE PIECE IN THE HERO -----------------------------------------------
 * One face only, with the pointer pose. It is the ticket in the corner of the
 * first fold and the resting state for whoever gets no flip — and, when the
 * flight is active, it is the ANCHOR: `visibility: hidden` yet still filling
 * its box, because that box is what tells the flight where the hero corner is. */
export function EventTicket() {
  const cena = useRef<HTMLDivElement>(null);
  const [pousado, setPousado] = useState(true);

  /* Light and pose come from the SAME point: a single light source at the
     pointer's position. Writing the two from two different handlers is how
     the sheen and the tilt end up disagreeing — and a foil that lights up on
     the wrong side of the tilt is worse than no foil at all. */
  const followPointer = useCallback((e: PointerEvent<HTMLDivElement>) => {
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
      /* Remove rather than zero: rest goes back to the `@property` initial
         value, which is the approved drawing — not a zero this function would
         have to keep in sync with the CSS forever. */
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
      onPointerMove={followPointer}
      onPointerLeave={pousar}
      className="bilhete-cena ticket-shadow mt-8 w-full max-w-sm text-left md:max-w-xl lg:mt-0 lg:max-w-none"
    >
      <div className="bilhete-pose relative">
        {/* THE CARD'S EDGE. Same cut, in ink, behind the piece — and it is the
            offset against the tilt that turns it into thickness instead of
            an outline. */}
        <div aria-hidden className="bilhete-espessura ticket-cut" />
        <TicketFront />
      </div>
    </div>
  );
}
