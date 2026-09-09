import { halftoneMarks } from "./halftone";

const COLS = 96;
const ROWS = 56;
const CELL = 12.5;

/* Campo contínuo em vez de mapa desenhado: a textura do fechamento não é um
   objeto, é fundo. Somando senoides em frequências diferentes as manchas saem
   orgânicas e sempre iguais entre servidor e cliente. */
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
const TONES = Array.from({ length: COLS * ROWS }, (_, i) => {
  const x = (i % COLS) / COLS;
  const y = Math.floor(i / COLS) / ROWS;
  const n = (field(x, y) + 1.26) / 2.52;
  const raw = Math.min(1, Math.max(0, (n - 0.5) / 0.42));
  const tone = raw < 0.14 ? 0 : raw > 0.9 ? 0.78 : 0.2 + raw * 0.45;
  return Math.round(tone * 35).toString(36);
}).join("");

const { light, dark } = halftoneMarks(TONES, { cols: COLS, cellW: CELL, cellH: CELL });

/** Fechamento: textura de meio-tom no mesmo traço das ilustrações. */
export function CtaHalftone({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${COLS * CELL} ${ROWS * CELL}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      role="presentation"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      className={className}
    >
      <path d={light} strokeWidth="2" />
      <path d={dark} strokeWidth="3.6" />
    </svg>
  );
}
