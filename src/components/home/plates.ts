import { halftoneMarks } from "./halftone";
import {
  PLATE_ROUTE,
  plateFilename,
  plateKeyFromFilename,
  plateSvg,
} from "@/lib/halftone-plate";

/* As chapas grandes da LP, geradas uma vez no servidor e servidas como
   arquivo por `app/halftone/[plate]/route.ts`. Este módulo é só servidor:
   quem precisa da chapa no cliente recebe a URL, nunca o desenho. */

/* --- O COLISEU DE FUNDO -------------------------------------------------
 * O anfiteatro subindo da base do hero — a peça 2D que fica atrás da cena
 * 3D e é a peça inteira onde a cena não roda. */
function colosseum() {
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

  // Faixas de cada pavimento como fração da altura do próprio vão, para que
  // os andares encurtem junto com a curva em vez de cisalhar. Os intervalos
  // entre elas são as cornijas: sem essa amarração horizontal a fachada vira
  // cerca.
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

  const edges = [bays[0]!.x - (bays[1]!.x - bays[0]!.x) / 2];
  for (let i = 1; i < BAYS; i += 1) edges.push((bays[i - 1]!.x + bays[i]!.x) / 2);
  edges.push(bays[BAYS - 1]!.x + (bays[BAYS - 1]!.x - bays[BAYS - 2]!.x) / 2);

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
    if (px < edges[0]! || px >= edges[edges.length - 1]!) return 0;
    let lo = 0;
    let hi = BAYS - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (px < edges[mid + 1]!) hi = mid;
      else lo = mid + 1;
    }
    const bay = bays[lo]!;
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

  /* O mapa de tons não vem de foto: a fachada é desenhada e só depois passa
     pelo meio-tom. Rastrear fotografia neste tamanho vira ruído — sem figura
     contra o vazio o traço não tem o que descrever. O topo já sai esmaecido
     aqui, então a dissolução acontece no comprimento do risco, não numa
     máscara por cima. */
  const FADE_START = 238;
  const FADE_END = 430;
  const tones = Array.from({ length: COLS * ROWS }, (_, i) => {
    const px = ((i % COLS) + 0.5) * CELL;
    const py = (Math.floor(i / COLS) + 0.5) * CELL;
    const tone = toneAt(px, py);
    if (tone === 0) return "0";
    const ramp = Math.max(0, Math.min(1, (py - FADE_START) / (FADE_END - FADE_START)));
    return Math.round(tone * (0.5 + 0.5 * Math.pow(ramp, 1.2)) * 35).toString(36);
  }).join("");

  const { light, dark } = halftoneMarks(tones, { cols: COLS, cellW: CELL, cellH: CELL });
  return plateSvg({
    viewBox: `0 0 ${COLS * CELL} ${ROWS * CELL}`,
    light,
    dark,
    lightWidth: 1.6,
    darkWidth: 3,
  });
}

/* --- O FECHAMENTO --------------------------------------------------------
 * Textura de meio-tom no mesmo traço das ilustrações, para os painéis
 * escuros: o calendário e a última chamada. */
function fechamento() {
  const COLS = 96;
  const ROWS = 56;
  const CELL = 12.5;

  /* Campo contínuo em vez de mapa desenhado: a textura do fechamento não é um
     objeto, é fundo. Somando senoides em frequências diferentes as manchas
     saem orgânicas e sempre iguais entre servidor e cliente. */
  function field(x: number, y: number) {
    return (
      0.36 * Math.sin(x * 9.3 + y * 4.1) +
      0.3 * Math.sin(x * 15.7 - y * 11.3 + 1.7) +
      0.24 * Math.sin(x * 6.7 + y * 19.4 + 4.2) +
      0.2 * Math.sin(x * 23.1 + y * 8.9 + 2.4) +
      0.16 * Math.sin(x * 31.7 - y * 21.3 + 0.9)
    );
  }

  /* O traço fica preso na faixa curta: com o tom cheio os riscos de células
     vizinhas se encostam e a textura vira listra. Só os picos ganham peso. */
  const tones = Array.from({ length: COLS * ROWS }, (_, i) => {
    const x = (i % COLS) / COLS;
    const y = Math.floor(i / COLS) / ROWS;
    const n = (field(x, y) + 1.26) / 2.52;
    const raw = Math.min(1, Math.max(0, (n - 0.5) / 0.42));
    const tone = raw < 0.14 ? 0 : raw > 0.9 ? 0.78 : 0.2 + raw * 0.45;
    return Math.round(tone * 35).toString(36);
  }).join("");

  const { light, dark } = halftoneMarks(tones, { cols: COLS, cellW: CELL, cellH: CELL });
  return plateSvg({
    viewBox: `0 0 ${COLS * CELL} ${ROWS * CELL}`,
    light,
    dark,
    lightWidth: 2,
    darkWidth: 3.6,
  });
}

/* --- A REDE --------------------------------------------------------------
 * Esfera de Fibonacci projetada no plano: uniforme na superfície é denso na
 * borda e ralo no meio, que é o que faz ler como esfera e não como disco. A
 * profundidade governa o raio e a opacidade de cada ponto. */
function rede() {
  const POINTS = 720;
  const RADIUS = 250;
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));

  const dots = Array.from({ length: POINTS }, (_, i) => {
    const y = 1 - (i / (POINTS - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = GOLDEN * i;
    const depth = (Math.sin(theta) * ring + 1) / 2;
    const cx = (RADIUS + Math.cos(theta) * ring * RADIUS).toFixed(1);
    const cy = (RADIUS + y * RADIUS).toFixed(1);
    const r = (0.7 + depth * 1.6).toFixed(2);
    const o = (0.1 + depth * 0.42).toFixed(2);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill-opacity="${o}"/>`;
  }).join("");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${RADIUS * 2} ${RADIUS * 2}" fill="#000">` +
    dots +
    `</svg>`
  );
}

const SVG = {
  colosseum: colosseum(),
  fechamento: fechamento(),
  rede: rede(),
} as const;

export type PlateKey = keyof typeof SVG;

const FILES: Record<PlateKey, string> = {
  colosseum: plateFilename("colosseum", SVG.colosseum),
  fechamento: plateFilename("fechamento", SVG.fechamento),
  rede: plateFilename("rede", SVG.rede),
};

/** A URL de cada chapa, com o hash do conteúdo no nome. */
export const PLATE_SRC: Record<PlateKey, string> = {
  colosseum: `${PLATE_ROUTE}/${FILES.colosseum}`,
  fechamento: `${PLATE_ROUTE}/${FILES.fechamento}`,
  rede: `${PLATE_ROUTE}/${FILES.rede}`,
};

export const PLATE_FILES: string[] = Object.values(FILES);

/** O SVG de um arquivo pedido, ou null se o nome não é de nenhuma chapa. */
export function plateByFilename(filename: string): string | null {
  const key = plateKeyFromFilename(filename);
  if (!key || !(key in FILES)) return null;
  const plate = key as PlateKey;
  return FILES[plate] === filename ? SVG[plate] : null;
}
