/* Meio-tom gerado a partir do desenho: cada célula da grade guarda a densidade
   da arte em base36, e o traço cresce com ela. Guardar o mapa em vez do path
   deixa passo, ganho e corte ajustáveis sem redesenhar tudo. */
export function halftoneMarks(
  tones: string,
  {
    cols,
    cellW,
    cellH,
    jitterX = 0.8,
    jitterY = 0.5,
  }: {
    cols: number;
    cellW: number;
    cellH: number;
    /* Quanto cada risco sai do centro da célula. O padrão é o desvio mínimo
       que tira a régua da grade sem soltar o desenho; textura de fundo pede
       muito mais, senão a mancha lê como tela de impressão em vez de tinta. */
    jitterX?: number;
    jitterY?: number;
  },
) {
  let seed = 0x9e3779b9;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const round = (v: number) => Math.round(v * 10) / 10;
  const light: string[] = [];
  const dark: string[] = [];

  for (let i = 0; i < tones.length; i++) {
    const tone = parseInt(tones[i], 36) / 35;
    if (tone < 0.05 + rnd() * 0.11) continue;
    const len = 0.4 + Math.pow(tone, 1.2) * (cellW - 0.5);
    const cx = (i % cols) * cellW + cellW / 2 + (rnd() - 0.5) * jitterX;
    const cy = Math.floor(i / cols) * cellH + cellH / 2 + (rnd() - 0.5) * jitterY;
    (tone > 0.7 ? dark : light).push(`M${round(cx - len / 2)} ${round(cy)}h${round(len)}`);
  }

  return { light: light.join(""), dark: dark.join("") };
}
