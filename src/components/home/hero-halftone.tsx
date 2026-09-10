import { halftoneMarks } from "./halftone";

/* Grade curta de propósito. A chapa ocupa menos de um terço da largura da
   dobra, então o número de colunas é o que decide o tamanho FÍSICO da célula:
   com a contagem do fechamento o risco chegaria à tela com metade do corpo e
   a mancha leria como retícula de scanner em vez de tinta. */
const COLS = 34;
const ROWS = 46;
const CELL = 12.5;

/* Mesmo campo contínuo do fechamento, uma oitava abaixo: as manchas da dobra
   dividem o quadro com manchete e monumento, e textura miúda nessa escala lê
   como sujeira de tela em vez de tinta. */
function field(x: number, y: number) {
  return (
    0.38 * Math.sin(x * 5.1 + y * 3.3) +
    0.3 * Math.sin(x * 8.7 - y * 6.9 + 1.7) +
    0.22 * Math.sin(x * 4.3 + y * 12.1 + 4.2) +
    0.18 * Math.sin(x * 14.9 + y * 5.7 + 2.4) +
    0.12 * Math.sin(x * 19.3 - y * 13.1 + 0.9)
  );
}

/* A mancha é recortada no próprio campo, não por máscara radial no CSS: uma
   elipse deformada por senoides lentas tem borda de nuvem, e o traço já chega
   rareando nela. Gradiente daria a mesma queda de tinta com contorno de
   círculo — que é exatamente a forma que a dobra não pode ter. */
function presence(x: number, y: number, rx: number, ry: number) {
  const base = Math.hypot((x + 0.06) / rx, (y + 0.04) / ry);
  /* O deslocamento solta ilhas fora da elipse, que é metade da graça — mas
     sem um teto elas aparecem longe da mancha, no meio do papel limpo, e o
     que era respingo vira sujeira. Só sobrevive a ilha encostada na borda. */
  if (base > 1.18) return 0;
  const warp =
    0.15 * Math.sin(x * 5.2 + y * 7.4) +
    0.11 * Math.sin(x * 11.4 - y * 4.3 + 1.9) +
    0.07 * Math.sin(x * 3.1 + y * 13.7 + 3.4);
  const d = base + warp;
  return d >= 1 ? 0 : Math.pow(1 - d, 0.75);
}

/* Duas nuvens independentes em vez de um plano só. A chapa é sempre desenhada
   com a nuvem no canto superior esquerdo e presa ali pelo preserveAspectRatio;
   a do outro lado é a mesma chapa espelhada. Assim nenhuma largura de tela
   empurra a mancha para debaixo da manchete nem corta o topo dela. */
function plate(rx: number, ry: number) {
  const tones = Array.from({ length: COLS * ROWS }, (_, i) => {
    const x = (i % COLS) / COLS;
    const y = Math.floor(i / COLS) / ROWS;
    const m = presence(x, y, rx, ry);
    if (m <= 0) return "0";
    const n = (field(x, y) + 1.2) / 2.4;
    /* Faixa larga em vez da curta do fechamento: lá o traço cheio encosta na
       célula vizinha e a textura vira listra, aqui a mancha é rala e precisa
       do contraste interno para ter blocos claros e escuros em vez de um
       cinza chapado. */
    const raw = Math.min(1, Math.max(0, (n - 0.34) / 0.52)) * m;
    const tone = raw < 0.08 ? 0 : 0.22 + raw * 0.62;
    return Math.round(tone * 35).toString(36);
  }).join("");

  /* Desvio grande de propósito: com o traço curto da mancha fraca, a grade
     apertada da prensa aparece como fileira de pontos. Soltando a célula, a
     borda da nuvem vira granulado. */
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

/** Primeira dobra: a tinta que sobra nos cantos altos do quadro. */
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
