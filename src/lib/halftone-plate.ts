/* A halftone plate served as a file, not as markup.
 *
 * The LP's large halftones are thousands of dashes. Inline, each of them went
 * to the browser twice — in the HTML and again in the hydration payload — and
 * the document passed a megabyte before any image. As a file, the drawing
 * goes once, stays in cache and leaves the tree React has to walk. Colour
 * still belongs to the caller: the plate is a MASK, and what paints is the
 * `currentColor` of the box using it. */

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

/* 32-bit FNV-1a. The filename carries the content: changing a single dash
   changes the URL, which is what lets us tell the browser the plate never
   changes — `immutable` with no risk of serving the old version. */
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

/** Reads the key back from a filename: `colosseum-1a2b3c4d.svg` → `colosseum`. */
export function plateKeyFromFilename(filename: string): string | null {
  const match = /^([a-z][a-z0-9-]*)-[0-9a-f]{8}\.svg$/.exec(filename);
  return match ? match[1]! : null;
}
