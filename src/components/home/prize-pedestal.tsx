import { Reveal } from "@/components/ui/reveal";
import { TrophyScene } from "@/components/home/trophy-scene";

/* Larguras e alturas dos degraus vieram de medir a referência em pixel e
   normalizar pelo degrau mais externo — é a proporção, e não a cor, que faz o
   desenho ler como poço. */
const LEVELS = [0.78, 0.608, 0.438, 0.264, 0.086];
const JUNCTIONS = [0, 0.219, 0.44, 0.659, 0.844];

/* A junção AFUNDA no centro, não sobe: é o que a câmera da referência devolve
   ao olhar para dentro do poço, e a barriga some conforme os degraus recuam. */
/* Proporção do quadro: a malha da referência mede 2,33 de largura por 1 de
   altura, e o degrau mais externo ocupa 78% do quadro. */
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

/* O wireframe da referência: as linhas seguem as mesmas curvas e as duas de
   cima atravessam o quadro inteiro, continuando no creme — é isso que amarra a
   peça ao fundo. Escuras, nunca creme: linha clara em cima da junção lê como
   fresta entre placas soltas, não como vinco. */
const GRID_ROWS = LEVELS.map(
  (_, index) =>
    `M ${sample(index, -0.06, 1.06, 28)
      .map(([x, y]) => `${(x * 100).toFixed(2)} ${(y * 100).toFixed(2)}`)
      .join(" L ")}`,
);
const GRID_COLUMNS = Array.from({ length: 13 }, (_, i) => (i * 100) / 12);

/* O viewBox é esticado sem manter proporção, então um traço de 1 unidade sai
   três vezes mais grosso na horizontal que na vertical: cada eixo pede a sua
   própria espessura para as duas famílias saírem com o mesmo peso na tela. */
const ROW_STROKE = 0.28;
const COLUMN_STROKE = ROW_STROKE / FRAME_RATIO;

/* Cada degrau é uma faixa curva com sombra própria na quina: é o que a malha
   3D da referência devolve de graça e o gradiente global sozinho não dá — sem
   isso os degraus escorrem uns nos outros. */
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

/* Claro em cima, saturado embaixo — e nunca preto: a referência satura sem
   perder luz, que é o que mantém a peça legível contra o fundo. */
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

/* O centro do poço recebe mais luz que as paredes: é o que separa a peça do
   fundo sem contorno e o que a referência faz com o blur do topo. */
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
