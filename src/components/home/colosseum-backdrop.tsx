import { halftoneMarks } from "./halftone";

const COLS = 200;
const ROWS = 78;
const CELL = 8;

const BAYS = 21;
const THETA_MAX = 1.16;
const CX = 800;
const RADIUS = 980;
const BASE = 650;
const BASE_RISE = 55;
const CORNICE = 238;
const EDGE_DROP = 165;

// Faixas de cada pavimento como fração da altura do próprio vão, para que os
// andares encurtem junto com a curva em vez de cisalhar. Os intervalos entre
// elas são as cornijas: sem essa amarração horizontal a fachada vira cerca.
const BANDS = {
  attic: [0, 0.155],
  tier3: [0.2, 0.415],
  tier2: [0.46, 0.675],
  tier1: [0.72, 1],
} as const;

// Onde a parede externa caiu: primeiro o ático, depois a terceira arcada. É
// esse degrau que separa o Coliseu de uma arcada qualquer.
const ATTIC_ENDS = 11;
const TIER3_ENDS = 15;

const STONE = 0.26;
const CORNICE_TONE = 0.62;
const VOID = 0.95;

type Band = { top: number; bottom: number };
type Bay = {
  x: number;
  w: number;
  level: number;
  base: number;
  top: number;
  attic: Band;
  tier3: Band;
  tier2: Band;
  tier1: Band;
};

const bays: Bay[] = Array.from({ length: BAYS }, (_, i) => {
  const theta = -THETA_MAX + (i * (2 * THETA_MAX)) / (BAYS - 1);
  const depth = Math.cos(theta);
  const cornice = CORNICE + EDGE_DROP * (1 - depth);
  const base = BASE - BASE_RISE * (1 - depth);
  const h = base - cornice;
  const band = ([a, b]: readonly [number, number]) => ({
    top: cornice + a * h,
    bottom: cornice + b * h,
  });
  const level = i <= ATTIC_ENDS ? 0 : i <= TIER3_ENDS ? 1 : 2;
  const attic = band(BANDS.attic);
  const tier3 = band(BANDS.tier3);
  const tier2 = band(BANDS.tier2);
  return {
    x: CX + RADIUS * Math.sin(theta),
    w: 33 * depth,
    level,
    base,
    top: level === 0 ? attic.top : level === 1 ? tier3.top : tier2.top,
    attic,
    tier3,
    tier2,
    tier1: band(BANDS.tier1),
  };
});

const edges = [bays[0].x - (bays[1].x - bays[0].x) / 2];
for (let i = 1; i < BAYS; i += 1) edges.push((bays[i - 1].x + bays[i].x) / 2);
edges.push(bays[BAYS - 1].x + (bays[BAYS - 1].x - bays[BAYS - 2].x) / 2);

type Opening = { w: number; top: number; bottom: number; square: boolean };

// Janelas do ático são quadradas; as arcadas são em arco. Guardar as duas no
// mesmo formato deixa o teste de dentro/fora com um caminho só.
function openingsOf(bay: Bay, index: number): Opening[] {
  const list: Opening[] = [];
  if (bay.level === 0 && index % 2 === 0) {
    const h = bay.attic.bottom - bay.attic.top;
    list.push({
      w: bay.w * 0.34,
      top: bay.attic.top + h * 0.28,
      bottom: bay.attic.bottom - h * 0.32,
      square: true,
    });
  }
  if (bay.level <= 1) list.push({ ...bay.tier3, w: bay.w, square: false });
  list.push({ ...bay.tier2, w: bay.w, square: false });
  list.push({ ...bay.tier1, w: bay.w, square: false });
  return list;
}

function toneAt(px: number, py: number) {
  if (px < edges[0] || px >= edges[edges.length - 1]) return 0;
  let lo = 0;
  let hi = BAYS - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (px < edges[mid + 1]) hi = mid;
    else lo = mid + 1;
  }
  const bay = bays[lo];
  if (py < bay.top || py > bay.base) return 0;

  const h = bay.base - bay.top;
  let tone = STONE;
  if (py <= bay.top + h * 0.03) tone = CORNICE_TONE;
  for (const band of [bay.attic, bay.tier3, bay.tier2]) {
    if (py > band.bottom && py <= band.bottom + h * 0.045) tone = CORNICE_TONE;
  }

  const dx = px - bay.x;
  for (const opening of openingsOf(bay, lo)) {
    if (Math.abs(dx) > opening.w || py < opening.top || py > opening.bottom) continue;
    if (opening.square) return VOID;
    const springing = Math.min(opening.top + opening.w, opening.bottom);
    if (py >= springing) return VOID;
    if (dx * dx + (py - springing) ** 2 <= opening.w * opening.w) return VOID;
  }
  return tone;
}

/* O mapa de tons não vem de foto: a fachada é desenhada e só depois passa pelo
   meio-tom. Rastrear fotografia neste tamanho vira ruído — sem figura contra o
   vazio o traço não tem o que descrever. O topo já sai esmaecido aqui, então a
   dissolução acontece no comprimento do risco, não numa máscara por cima. */
const FADE_START = 238;
const FADE_END = 430;
const TONES = Array.from({ length: COLS * ROWS }, (_, i) => {
  const px = ((i % COLS) + 0.5) * CELL;
  const py = (Math.floor(i / COLS) + 0.5) * CELL;
  const tone = toneAt(px, py);
  if (tone === 0) return "0";
  const ramp = Math.max(0, Math.min(1, (py - FADE_START) / (FADE_END - FADE_START)));
  return Math.round(tone * (0.5 + 0.5 * Math.pow(ramp, 1.2)) * 35).toString(36);
}).join("");

const { light, dark } = halftoneMarks(TONES, { cols: COLS, cellW: CELL, cellH: CELL });

/** O anfiteatro subindo da base do hero — a única imagem da dobra, no mesmo
 *  traço de meio-tom das ilustrações da jornada. */
export function ColosseumBackdrop({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${COLS * CELL} ${ROWS * CELL}`}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
      role="presentation"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      className={`pointer-events-none h-full w-full text-ink ${className}`}
    >
      <path d={light} strokeWidth="1.6" />
      <path d={dark} strokeWidth="3" />
    </svg>
  );
}
