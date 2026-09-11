/* ---------------------------------------------------------------------------
 * ENGRAVING — the ticket's security printing
 *
 * Guilloche, wave and seal. The three pieces that make a scrap of paper read
 * as a DOCUMENT before anyone can say why — and all three are the same
 * technique as this house's etching: continuous fine line, no halftone, the
 * dark born from crossings rather than from stroke weight.
 *
 * The geometry is computed here, in TypeScript, and ships in the HTML as a
 * plain `path`: the same decision as `etching.tsx`. Zero SVG filters, zero
 * client JS, the same shape on the server and in the browser.
 *
 * The trick that keeps the HTML small: a rosette r = R + A·cos(k·t) rotated by
 * 2π/k is a phase-shifted rosette. So the whole guilloche fabric — which looks
 * like half a dozen braided curves — is ONE path in `defs` and five rotated
 * `use`s. ~1 KB instead of ~20 KB.
 * ------------------------------------------------------------------------- */

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * One turn of a rosette: r = radius + amplitude·cos(petals · t).
 *
 * `points` is resolution, not style. Below ~160 the curve shows its straight
 * segments at the petal vertices — and a faceted vertex in a guilloche is
 * exactly what gives away generated artwork.
 */
function rosette(radius: number, amplitude: number, petals: number, points = 200) {
  const d: string[] = [];
  for (let i = 0; i <= points; i += 1) {
    const t = (i / points) * Math.PI * 2;
    const r = radius + amplitude * Math.cos(petals * t);
    d.push(
      `${i === 0 ? "M" : "L"}${round2(r * Math.cos(t))} ${round2(r * Math.sin(t))}`,
    );
  }
  return `${d.join("")}Z`;
}

/** A vertical sine wave — the banded guilloche line, for the stub. */
function wave(height: number, amplitude: number, cycles: number, points = 120) {
  const d: string[] = [];
  for (let i = 0; i <= points; i += 1) {
    const y = (i / points) * height;
    const x = amplitude * Math.sin((i / points) * Math.PI * 2 * cycles);
    d.push(`${i === 0 ? "M" : "L"}${round2(x)} ${round2(y)}`);
  }
  return d.join("");
}

const ROSETTE_WIDE = rosette(52, 15, 9);
const ROSETTE_FINE = rosette(33, 8, 14, 240);

/**
 * THE MEDALLION. The banknote rosette, in two braided families: nine wide
 * petals outside, fourteen fine ones inside. It sits behind the date block and
 * is cut by the perforation line — as on a banknote, where the guilloche never
 * respects the text frame.
 */
export function Medallion({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="-70 -70 140 140"
      className={`pointer-events-none absolute ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="0.34"
    >
      <defs>
        <path id="bilhete-ros-larga" d={ROSETTE_WIDE} />
        <path id="bilhete-ros-fina" d={ROSETTE_FINE} />
      </defs>
      {/* Three turns and two, not five and three. Guilloche is WEAVE: past
          this density the curves stop crossing and start adding up, and the
          medallion becomes a smudge behind the text — the opposite of what
          security printing does on a banknote. */}
      {[0, 13, 26].map((turn) => (
        <use
          key={`wide-${turn}`}
          href="#bilhete-ros-larga"
          transform={`rotate(${turn})`}
        />
      ))}
      {[0, 9].map((turn) => (
        <use
          key={`fine-${turn}`}
          href="#bilhete-ros-fina"
          transform={`rotate(${turn})`}
        />
      ))}
      <circle r="22" strokeWidth="0.28" />
      <circle r="19.5" strokeWidth="0.28" />
    </svg>
  );
}

/**
 * THE STUB BAND. Four phase-shifted sine waves running along the stub's axis,
 * which is vertical. It sits over the foil, in `multiply`: the engraved line
 * interrupts the sheen instead of receiving it.
 */
export function GuillocheBand({ className = "" }: { className?: string }) {
  const WAVE = wave(240, 7, 9);
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 240"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="0.5"
    >
      <defs>
        <path id="bilhete-wave" d={WAVE} />
      </defs>
      {[7, 17].map((x, i) => (
        <use
          key={x}
          href="#bilhete-wave"
          transform={`translate(${x} 0) scale(${i % 2 ? -1 : 1} 1)`}
        />
      ))}
    </svg>
  );
}

/**
 * THE MEANDER — the Greek key. The only element here that is Roman by
 * quotation rather than by technique, which makes it the easiest to get
 * wrong: drawn thick it becomes Doric-column clip art. It comes in as a
 * FILLET, at the weight of an etched line, where a rule already separated the
 * header from the body — same height, and what changes is the rule now has a
 * drawing.
 *
 * The key hangs off a continuous rail: a meander is ONE line that bends, and
 * drawing it spiral by loose spiral is what makes the band lose its rhythm at
 * the joins.
 */
export function Meander({ className = "" }: { className?: string }) {
  const CELULA = 14;
  const REPS = 44;
  const chaves = Array.from(
    { length: REPS },
    (_, i) => {
      const x = i * CELULA;
      return `M${x + 1.5} 8V1.5H${x + 11.5}V6H${x + 5}V3.5H${x + 8.5}`;
    },
  ).join("");

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${CELULA * REPS} 10`}
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <path d={`M0 8.6H${CELULA * REPS}`} strokeWidth="0.9" />
      <path d={chaves} />
    </svg>
  );
}

/**
 * THE SEAL. A blind-embossed stamp: two rings, a crown of serifs — the laurel
 * reduced to what is left of it on a 4 mm stamp — and the year in Roman
 * numerals at the center. Rotated a few degrees at the call site, because a
 * stamp is struck by hand.
 *
 * The circular text is a `textPath` on its own circle, not letters placed one
 * by one: that way it follows the radius at any size, including when the
 * piece grows threefold coming out of the fold.
 */
export function RomanSeal({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="-50 -50 100 100"
      className={`pointer-events-none ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
    >
      <defs>
        <path
          id="bilhete-selo-volta"
          d="M0-36A36 36 0 1 1 0 36A36 36 0 1 1 0-36"
        />
      </defs>
      <circle r="46" strokeWidth="2.2" />
      <circle r="41" strokeWidth="0.8" />
      <circle r="30" strokeWidth="0.8" />

      {/* The crown. Twenty-four radial strokes between the two rings: the
          laurel exists here as RHYTHM, which is all that survives of a crown
          printed at this diameter. Drawing it leaf by leaf would be a blur. */}
      {Array.from({ length: 24 }, (_, i) => (
        <line
          key={i}
          x1="0"
          y1="-33.5"
          x2="0"
          y2="-38.5"
          strokeWidth="1.4"
          transform={`rotate(${i * 15})`}
        />
      ))}

      <text
        fill="currentColor"
        stroke="none"
        fontSize="8.4"
        fontWeight="700"
        letterSpacing="2.4"
      >
        <textPath href="#bilhete-selo-volta" startOffset="25%" textAnchor="middle">
          SUPERTEAM BRASIL
        </textPath>
      </text>
      <text
        fill="currentColor"
        stroke="none"
        fontSize="6.6"
        fontWeight="700"
        letterSpacing="2"
      >
        <textPath href="#bilhete-selo-volta" startOffset="75%" textAnchor="middle">
          COLOSSEUM
        </textPath>
      </text>

      <text
        y="6.5"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
        fontSize="17"
        fontWeight="900"
        letterSpacing="0.5"
      >
        MMXXVI
      </text>
    </svg>
  );
}

/**
 * MICROTEXT. The 4 px line on the ticket's edge that, at rest, is just a grey
 * texture — and becomes legible words when the piece grows coming out of the
 * fold. It is the zoom's reward: the print holds up to a close look.
 */
export function Microtext({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 600 10"
      preserveAspectRatio="xMinYMid slice"
      className={`pointer-events-none ${className}`}
    >
      <text
        x="0"
        y="7.6"
        fill="currentColor"
        fontSize="7"
        fontWeight="700"
        letterSpacing="1.1"
      >
        {text.repeat(6)}
      </text>
    </svg>
  );
}
