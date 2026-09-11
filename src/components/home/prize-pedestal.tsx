import { Reveal } from "@/components/ui/reveal";
import { TrophyScene } from "@/components/home/trophy-scene";

/* Step widths and heights came from measuring the reference in pixels and
   normalising by the outermost step — it is the proportion, not the colour,
   that makes the drawing read as a well. */
const LEVELS = [0.78, 0.608, 0.438, 0.264, 0.086];
const JUNCTIONS = [0, 0.219, 0.44, 0.659, 0.844];

/* The junction SAGS at the centre, it does not rise: that is what the reference
   camera returns looking into the well, and the belly fades as steps recede. */
/* Frame proportion: the reference mesh measures 2.33 wide by 1 tall, and the
   outermost step takes up 78% of the frame. */
const FRAME_RATIO = 2.99;

const SAG = 0.055;
const SAG_DECAY = 0.19;

function junctionY(index: number, x: number) {
  const base = JUNCTIONS[index];
  const span = index === 0 ? 1.06 : LEVELS[index - 1];
  const t = Math.min(1, Math.abs(x - 0.5) / (span / 2));
  return base + SAG * (1 - index * SAG_DECAY) * (1 - t * t);
}

function sample(index: number, from: number, to: number, steps = 14) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const x = from + ((to - from) * i) / steps;
    return [x, junctionY(index, x)] as const;
  });
}

const OUTLINE = (() => {
  const points: (readonly [number, number])[] = [];
  LEVELS.forEach((width, index) => {
    const outer = index === 0 ? -0.06 : (1 - LEVELS[index - 1]) / 2;
    const inner = (1 - width) / 2;
    points.push(...sample(index, outer, inner));
  });
  points.push([(1 - LEVELS[LEVELS.length - 1]) / 2, 1]);
  points.push([1 - (1 - LEVELS[LEVELS.length - 1]) / 2, 1]);
  for (let index = LEVELS.length - 1; index >= 0; index -= 1) {
    const inner = 1 - (1 - LEVELS[index]) / 2;
    const outer = index === 0 ? 1.06 : 1 - (1 - LEVELS[index - 1]) / 2;
    points.push(...sample(index, inner, outer));
  }
  return points;
})();

const FUNNEL_CLIP = `polygon(${OUTLINE.map(
  ([x, y]) => `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`,
).join(",")})`;

const OUTLINE_PATH = `M ${OUTLINE.map(([x, y]) => `${(x * 100).toFixed(2)} ${(y * 100).toFixed(2)}`).join(" L ")} Z`;

/* The reference wireframe: the lines follow the same curves and the top two
   cross the whole frame, continuing into the cream — that is what ties the
   piece to the background. Dark, never cream: a light line over the junction
   reads as a gap between loose plates, not as a crease. */
const GRID_ROWS = LEVELS.map(
  (_, index) =>
    `M ${sample(index, -0.06, 1.06, 28)
      .map(([x, y]) => `${(x * 100).toFixed(2)} ${(y * 100).toFixed(2)}`)
      .join(" L ")}`,
);
const GRID_COLUMNS = Array.from({ length: 13 }, (_, i) => (i * 100) / 12);

/* The viewBox is stretched without keeping proportion, so a 1-unit stroke
   comes out three times thicker horizontally than vertically: each axis needs
   its own thickness for the two families to land with the same weight. */
const ROW_STROKE = 0.28;
const COLUMN_STROKE = ROW_STROKE / FRAME_RATIO;

/* Each step is a curved band with its own shadow at the corner: what the
   reference's 3D mesh gives for free and the global gradient alone does not —
   without it the steps bleed into one another. */
const STEP_BANDS = LEVELS.map((width, index) => {
  const left = (1 - width) / 2;
  const right = 1 - left;
  const top = sample(index, left, right, 24);
  const bottom =
    index + 1 < LEVELS.length
      ? sample(index + 1, left, right, 24).reverse()
      : [[right, 1] as const, [left, 1] as const];
  return `M ${[...top, ...bottom]
    .map(([x, y]) => `${(x * 100).toFixed(2)} ${(y * 100).toFixed(2)}`)
    .join(" L ")} Z`;
});

/* Light on top, saturated below — and never black: the reference saturates
   without losing light, which keeps the piece legible against the background. */
const FUNNEL = {
  clipPath: FUNNEL_CLIP,
  backgroundImage: `linear-gradient(to bottom,
    color-mix(in oklab, var(--color-emerald) 38%, var(--color-surface-raised)) 0%,
    color-mix(in oklab, var(--color-emerald) 68%, var(--color-surface-raised)) 12%,
    color-mix(in oklab, var(--color-emerald) 92%, var(--color-surface-raised)) 24%,
    var(--color-emerald) 35%,
    color-mix(in oklab, var(--color-emerald-deep) 24%, var(--color-emerald)) 46%,
    color-mix(in oklab, var(--color-emerald-deep) 50%, var(--color-emerald)) 58%,
    color-mix(in oklab, var(--color-emerald-deep) 74%, var(--color-emerald)) 72%,
    color-mix(in oklab, var(--color-emerald-deep) 94%, var(--color-emerald)) 88%,
    var(--color-emerald-deep) 100%)`,

  maskImage: `linear-gradient(to bottom, transparent 0%, black 9%),
    linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)`,
  maskComposite: "intersect",
  WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, black 9%),
    linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)`,
  WebkitMaskComposite: "source-in",
} as const;

const TROPHY_HALO = {
  clipPath: FUNNEL_CLIP,
  backgroundImage: `radial-gradient(72% 58% at 50% 68%, color-mix(in oklab, var(--color-green-dark) 38%, transparent) 0%, transparent 74%)`,
} as const;

const TOP_HALO = {
  backgroundImage: `radial-gradient(88% 62% at 50% -4%, color-mix(in oklab, var(--color-surface-raised) 28%, transparent) 0%, transparent 72%)`,
  maskImage: "linear-gradient(to bottom, black 0%, transparent 48%)",
  WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 48%)",
} as const;

/* The centre of the well gets more light than the walls: it is what separates
   the piece from the background without an outline, and what the reference
   does with the blur at the top. */
const SPOT = {
  clipPath: FUNNEL_CLIP,
  backgroundImage: `radial-gradient(30% 42% at 50% 30%, color-mix(in oklab, var(--color-surface-raised) 30%, transparent) 0%, transparent 78%),
    radial-gradient(66% 96% at 50% 100%, transparent 46%, color-mix(in oklab, var(--color-green-dark) 20%, transparent) 100%)`,
  maskImage: "linear-gradient(to bottom, transparent 2%, black 26%)",
};

export function PrizePedestal() {
  return (
    <Reveal
      tone="longe"
      className="relative h-[21rem] w-full sm:h-[26rem] lg:h-auto lg:min-h-0 lg:flex-1"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -top-6 h-[calc(100%+1.5rem)] w-[132vw] -translate-x-1/2 sm:w-[118vw] lg:top-0 lg:h-full lg:w-auto lg:max-w-[100vw] lg:aspect-[2.99/1]"
      >
        <div className="absolute inset-0" style={TOP_HALO} />
        <div className="absolute inset-0" style={FUNNEL} />
        <div className="absolute inset-0" style={TROPHY_HALO} />
        <div className="absolute inset-0 opacity-40 blur-[30px] [mask-image:linear-gradient(to_bottom,black_0%,transparent_34%)]" style={FUNNEL} />
        <div className="absolute inset-0" style={SPOT} />

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <defs>
            <clipPath id="pedestal-well" clipPathUnits="userSpaceOnUse">
              <path d={OUTLINE_PATH} />
            </clipPath>
            <linearGradient id="pedestal-fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="white" stopOpacity="0" />
              <stop offset="0.22" stopColor="white" stopOpacity="1" />
              <stop offset="1" stopColor="white" stopOpacity="1" />
            </linearGradient>
            {LEVELS.map((_, index) => (
              <linearGradient
                key={index}
                id={`pedestal-step-${index}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
                gradientUnits="objectBoundingBox"
              >
                <stop offset="0" stopColor="var(--color-green-dark)" stopOpacity="0.32" />
                <stop offset="0.1" stopColor="var(--color-green-dark)" stopOpacity="0.12" />
                <stop offset="0.18" stopColor="var(--color-green-dark)" stopOpacity="0" />
                <stop offset="1" stopColor="var(--color-green-dark)" stopOpacity="0" />
              </linearGradient>
            ))}
            <filter id="pedestal-step-blur" x="-1%" y="-1%" width="102%" height="102%">
              <feGaussianBlur stdDeviation="0.28" />
            </filter>
            <mask id="pedestal-mask">
              <rect x="0" y="0" width="100" height="100" fill="url(#pedestal-fade)" />
            </mask>
          </defs>

          <g clipPath="url(#pedestal-well)" mask="url(#pedestal-mask)">
            <g filter="url(#pedestal-step-blur)">
              {STEP_BANDS.map((d, index) => (
                <path key={d} d={d} fill={`url(#pedestal-step-${index})`} />
              ))}
            </g>
          </g>

          <g
            fill="none"
            stroke="var(--color-ink)"
            strokeOpacity="0.09"
            strokeWidth={ROW_STROKE}
          >
            {GRID_ROWS.slice(0, 2).map((d) => (
              <path key={d} d={d} />
            ))}
          </g>

          <g
            clipPath="url(#pedestal-well)"
            mask="url(#pedestal-mask)"
            fill="none"
            stroke="var(--color-green-dark)"
            strokeOpacity="0.13"
          >
            <g strokeWidth={ROW_STROKE}>
              {GRID_ROWS.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
            <g strokeWidth={COLUMN_STROKE}>
              {GRID_COLUMNS.map((x) => (
                <path key={x} d={`M ${x} 0 L ${x} 100`} />
              ))}
            </g>
          </g>
        </svg>

        <TrophyScene className="absolute inset-x-0 bottom-[21%] z-10 h-[44%] max-h-[9.5rem] sm:h-[48%] sm:max-h-[12rem] lg:bottom-[18%] lg:h-[59%] lg:max-h-none" />
      </div>
    </Reveal>
  );
}
