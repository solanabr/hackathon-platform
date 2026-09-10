/* Uma chapa de meio-tom servida como arquivo, não como marcação.
 *
 * Os halftones grandes da LP são milhares de riscos. Inline, cada um deles ia
 * duas vezes ao navegador — no HTML e de novo no payload de hidratação — e o
 * documento passava de um megabyte antes de qualquer imagem. Como arquivo, o
 * desenho vai uma vez, fica no cache e sai da árvore que o React precisa
 * percorrer. A cor continua sendo do chamador: a chapa é uma MÁSCARA, e quem
 * pinta é o `currentColor` da caixa que a usa. */

export type PlateSpec = {
  viewBox: string;
  light: string;
  dark: string;
  lightWidth: number;
  darkWidth: number;
};

export function plateSvg({ viewBox, light, dark, lightWidth, darkWidth }: PlateSpec): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none" stroke="#000" stroke-linecap="round">` +
    `<path d="${light}" stroke-width="${lightWidth}"/>` +
    `<path d="${dark}" stroke-width="${darkWidth}"/>` +
    `</svg>`
  );
}

/* FNV-1a de 32 bits. O nome do arquivo carrega o conteúdo: mudar um único
   risco muda a URL, e é isso que permite dizer ao navegador que a chapa nunca
   muda — `immutable` sem risco de servir a versão velha. */
export function plateHash(svg: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < svg.length; i++) {
    hash ^= svg.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export const PLATE_ROUTE = "/halftone";

export function plateFilename(key: string, svg: string): string {
  return `${key}-${plateHash(svg)}.svg`;
}

/** Lê a chave de volta de um nome de arquivo: `colosseum-1a2b3c4d.svg` → `colosseum`. */
export function plateKeyFromFilename(filename: string): string | null {
  const match = /^([a-z][a-z0-9-]*)-[0-9a-f]{8}\.svg$/.exec(filename);
  return match ? match[1]! : null;
}
