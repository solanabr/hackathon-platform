import { halftoneMarks } from "./halftone";

/* Short grid on purpose. The plate takes under a third of the fold's width,
   so the column count is what decides the PHYSICAL cell size: with the
   closing's count the dash would reach the screen at half its body and the
   blot would read as scanner screen instead of ink. */
const COLS = 34;
const ROWS = 46;
const CELL = 12.5;

/* The closing's continuous field, one octave down: the fold's blots share the
   frame with headline and monument, and fine texture at that scale reads as
   screen dirt instead of ink. */
function field(x: number, y: number) {
  return (
    0.38 * Math.sin(x * 5.1 + y * 3.3) +
    0.3 * Math.sin(x * 8.7 - y * 6.9 + 1.7) +
    0.22 * Math.sin(x * 4.3 + y * 12.1 + 4.2) +
    0.18 * Math.sin(x * 14.9 + y * 5.7 + 2.4) +
    0.12 * Math.sin(x * 19.3 - y * 13.1 + 0.9)
  );
}

/* The blot is cut in the field itself, not by a radial mask in CSS: an ellipse
   warped by slow sines has a cloud edge, and the stroke already thins into it.
   A gradient would give the same ink falloff with a circular outline — exactly
   the shape the fold cannot have. */
function presence(x: number, y: number, rx: number, ry: number) {
  const base = Math.hypot((x + 0.06) / rx, (y + 0.04) / ry);
  /* The warp lets islands loose outside the ellipse, which is half the charm —
     but without a ceiling they show up far from the blot, in clean paper, and
     what was splatter becomes dirt. Only the island touching the edge survives. */
  if (base > 1.18) return 0;
  const warp =
    0.15 * Math.sin(x * 5.2 + y * 7.4) +
    0.11 * Math.sin(x * 11.4 - y * 4.3 + 1.9) +
    0.07 * Math.sin(x * 3.1 + y * 13.7 + 3.4);
  const d = base + warp;
  return d >= 1 ? 0 : Math.pow(1 - d, 0.75);
}

/* Two independent clouds instead of a single plane. The plate is always drawn
   with the cloud in the top-left corner and pinned there by preserveAspectRatio;
   the other side is the same plate mirrored. So no screen width pushes the
   blot under the headline or crops its top. */
function plate(rx: number, ry: number) {
  const tones = Array.from({ length: COLS * ROWS }, (_, i) => {
    const x = (i % COLS) / COLS;
    const y = Math.floor(i / COLS) / ROWS;
    const m = presence(x, y, rx, ry);
    if (m <= 0) return "0";
    const n = (field(x, y) + 1.2) / 2.4;
    /* Wide band instead of the closing's short one: there the full stroke
       touches the neighbouring cell and the texture turns to stripes; here the
       blot is sparse and needs internal contrast to have light and dark blocks
       instead of flat grey. */
    const raw = Math.min(1, Math.max(0, (n - 0.34) / 0.52)) * m;
    const tone = raw < 0.08 ? 0 : 0.22 + raw * 0.62;
    return Math.round(tone * 35).toString(36);
  }).join("");

  /* Large offset on purpose: with the faint blot's short stroke, the press's
     tight grid shows as a row of dots. Loosening the cell turns the cloud's
     edge into grain. */
  return halftoneMarks(tones, {
    cols: COLS,
    cellW: CELL,
    cellH: CELL,
    jitterX: 4.5,
    jitterY: 5.5,
  });
}

const PLATES = {
  left: plate(0.94, 0.86),
  right: plate(0.9, 0.66),
};

/** First fold: the ink left over in the frame's upper corners. */
export function HeroHalftone({
  side,
  className,
}: {
  side: "left" | "right";
  className?: string;
}) {
  const { light, dark } = PLATES[side];

  return (
    <svg
      viewBox={`0 0 ${COLS * CELL} ${ROWS * CELL}`}
      preserveAspectRatio="xMinYMin slice"
      aria-hidden
      role="presentation"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      className={className}
      style={side === "right" ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d={light} strokeWidth="2" />
      <path d={dark} strokeWidth="3.4" />
    </svg>
  );
}
