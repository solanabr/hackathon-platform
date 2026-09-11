/* Halftone generated from the drawing: each grid cell stores the art's density
   in base36, and the stroke grows with it. Storing the map instead of the path
   keeps pitch, gain and cutoff adjustable without redrawing everything. */
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
    /* How far each dash strays from the cell centre. The default is the least
       offset that breaks the grid's ruler without loosening the drawing; a
       background texture needs far more, or the blot reads as screen, not ink. */
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
