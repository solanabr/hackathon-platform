import { halftoneMarks } from "./halftone";

/* A mesma prensa das outras peças: grade de 44 colunas, risco horizontal por
   célula, dois pesos. O que muda é o assunto — em vez de um desenho, o próprio
   número do passo, grande o bastante para ser lido de longe. */
const GRID = { cols: 44, cellW: 200 / 44, cellH: 5 };
const ROWS = 28;

/* A tinta desce: topo aberto, base fechada, e um empurrão para a direita — a
   mesma luz de cima e à esquerda que modela o Coliseu e a taça. O ruído tira a
   régua da faixa onde o traço troca de peso. */
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

/** O número do passo, recortado sobre o campo de tinta — sem asset e sem SVG
 * de dígito: quem dá a forma é a Archivo, a mesma dos títulos. */
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
