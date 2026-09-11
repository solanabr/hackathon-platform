import { halftoneMarks } from "./halftone";

/* The same press as the other pieces: 44-column grid, one horizontal stroke
   per cell, two weights. What changes is the subject — instead of a drawing,
   the step number itself, big enough to be read from afar. */
const GRID = { cols: 44, cellW: 200 / 44, cellH: 5 };
const ROWS = 28;

/* The ink descends: open top, closed base, and a push to the right — the same
   light from above-left that models the Colosseum and the trophy. The noise
   breaks the ruler line in the band where the stroke changes weight. */
function inkField() {
  let tone = "";
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < GRID.cols; col++) {
      const v = row / (ROWS - 1);
      const u = col / (GRID.cols - 1);
      const grain = Math.sin(col * 12.9898 + row * 78.233) * 0.5;
      const value = Math.min(0.92, Math.max(0, 0.34 + 0.46 * v + 0.12 * u + grain * 0.09));
      tone += Math.round(value * 35).toString(36);
    }
  }
  return halftoneMarks(tone, GRID);
}

const FIELD = inkField();

/** The step number, cut out over the ink field — no asset and no digit SVG:
 * the shape comes from Archivo, the same face as the headings. */
export function StepNumeral({
  digit,
  className,
}: {
  digit: number;
  className?: string;
}) {
  const maskId = `step-numeral-${digit}`;
  return (
    <svg
      viewBox="0 0 200 140"
      aria-hidden
      role="presentation"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      className={["halftone-press", className].filter(Boolean).join(" ")}
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="140">
          <text
            x="100"
            y="132"
            textAnchor="middle"
            fontSize="176"
            fontWeight="900"
            fill="#fff"
            stroke="none"
            className="font-heading"
            style={{ fontStretch: "118%", letterSpacing: "-0.04em" }}
          >
            {digit}
          </text>
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        <path d={FIELD.light} strokeWidth="1.5" />
        <path d={FIELD.dark} strokeWidth="2.9" />
      </g>
    </svg>
  );
}
