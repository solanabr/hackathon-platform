"use client";

import { useEffect, useRef } from "react";

/**
 * A photo run through the same press as the 3D pieces.
 *
 * The Colosseum and the trophy reach the halftone by different paths — one
 * through the gap, the other through light — but both end in the SAME stroke:
 * horizontal dash on the cell grid, length growing with tone, two weights, the
 * same noise floor that eats the light cells. This is the third entrance to
 * the same place: instead of render depth, tone comes from the luminance of a
 * grey + alpha plate.
 *
 * So the source is NOT the colour photo: it is a PNG/WebP already cut out and
 * already reduced to grey. No colour from the reference crosses into the page —
 * what comes in is ink density, the only thing this identity knows how to
 * print.
 *
 * The stroke constants are those of `halftoneMarks()` and HALFTONE_FRAG,
 * copied on purpose instead of imported: there they live in GLSL, here in 2D
 * canvas. If one changes, all three change together.
 */

const UNIT = 8;

/* The same hash as the shader, so the printed piece does not carry a
   different grain from the rest of the sheet. */
function hash(x: number, y: number, salt: number) {
  const value = Math.sin((x + salt) * 127.1 + (y + salt) * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

export type HalftoneImageProps = {
  /** Grey + alpha plate. Alpha is the cutout; grey is the tone. */
  src: string;
  /** Below this width the plate is not even downloaded. A background piece
   * does not spend mobile bandwidth only to be hidden by CSS. */
  minWidth?: number;
  /** Cell side, in CSS px. 1.5 is the grid of the hero's 3D pieces. */
  cell?: number;
  /** Ink floor and gain — the same pair as the 3D scenes. */
  toneFloor?: number;
  toneGain?: number;
  /** Gamma applied to luminance before tone: above 1 opens the shadows. */
  gamma?: number;
  /** Below this the pixel is background and prints nothing. */
  alphaCut?: number;
  /** `contain` stands the piece on the box's bottom edge — the framing of a
   * cut-out object. `cover` fills the whole box and crops the rest: the
   * framing of a SCENE, which has no foot or edge, it just continues past the
   * frame. */
  fit?: "contain" | "cover";
  /** Ceiling on the canvas's physical pixels. A scene plate bleeds 28% past
   * the viewport and at 2x DPR went over eight million pixels — thirty-odd
   * megabytes of texture for a background at 40% ink. Above the ceiling DPR
   * drops until it fits; the cell stays in CSS px, so the grid is the same. */
  maxPixels?: number;
  className?: string;
};

/* How many cells each paint slice processes before yielding the thread. A
   scene plate has close to a million; stroking it in one go was a task of
   several hundred milliseconds right in the middle of scrolling. */
const CELLS_PER_SLICE = 90_000;

export function HalftoneImage({
  src,
  cell = 1.5,
  toneFloor = 0.22,
  toneGain = 0.8,
  gamma = 1,
  alphaCut = 0.45,
  fit = "contain",
  minWidth = 0,
  maxPixels = 4_500_000,
  className = "h-full w-full text-ink",
}: HalftoneImageProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const canvas = document.createElement("canvas");
    canvas.className = "block h-full w-full";
    host.appendChild(canvas);
    const context = canvas.getContext("2d");
    if (!context) return;

    /* Helper canvas the size of the GRID, not the screen: shrinking the photo
       to one cell per pixel is the same step the shader does on the GPU, and
       leaves the cell average to the browser's downscale. */
    const sampler = document.createElement("canvas");
    const samplerContext = sampler.getContext("2d", { willReadFrequently: true });
    if (!samplerContext) return;

    let disposed = false;
    let image: HTMLImageElement | null = null;
    /* Each paint has a number; a slice that wakes up and sees another number
       knows a newer paint already cleared the canvas and gives up. */
    let generation = 0;
    let pending = 0;

    function paint() {
      if (disposed || !image || !context || !samplerContext) return;
      const rect = host!.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;

      let dpr = Math.min(window.devicePixelRatio || 1, 2);
      const area = rect.width * rect.height;
      if (area * dpr * dpr > maxPixels) dpr = Math.max(1, Math.sqrt(maxPixels / area));
      const width = Math.round(rect.width * dpr);
      const height = Math.round(rect.height * dpr);
      const cellPx = cell * dpr;
      const cols = Math.max(1, Math.ceil(width / cellPx));
      const rows = Math.max(1, Math.ceil(height / cellPx));

      canvas.width = width;
      canvas.height = height;
      sampler.width = cols;
      sampler.height = rows;

      // `contain`, bottom-aligned: the piece stands on the box's bottom edge,
      // the same way the monument rests on the hero's lower margin. In `cover`
      // there is no foot: the scene overflows the frame on all four sides and
      // the crop is what proves it continues beyond it.
      const covers = fit === "cover";
      const scale = covers
        ? Math.max(cols / image.width, rows / image.height)
        : Math.min(cols / image.width, rows / image.height);
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      const drawX = (cols - drawWidth) / 2;
      const drawY = covers ? (rows - drawHeight) / 2 : rows - drawHeight;

      samplerContext.clearRect(0, 0, cols, rows);
      samplerContext.imageSmoothingEnabled = true;
      samplerContext.imageSmoothingQuality = "high";
      samplerContext.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      const pixels = samplerContext.getImageData(0, 0, cols, rows).data;

      const ink = getComputedStyle(host!).color;
      context.clearRect(0, 0, width, height);
      context.lineCap = "round";
      context.strokeStyle = ink;

      const mine = ++generation;
      if (pending) clearTimeout(pending);
      pending = 0;
      const rowsPerSlice = Math.max(1, Math.floor(CELLS_PER_SLICE / cols));
      let row = 0;

      /* The plate is stroked in slices, top to bottom — the same sweep as the
         sheet leaving the press — and each slice yields the thread before the
         next. Two paths per slice, one per weight: stroking mark by mark
         would cost one call per cell. */
      const slice = () => {
        pending = 0;
        if (disposed || mine !== generation || !context) return;
        const light = new Path2D();
        const dark = new Path2D();
        const end = Math.min(rows, row + rowsPerSlice);

        for (; row < end; row++) {
          for (let col = 0; col < cols; col++) {
            const index = (row * cols + col) * 4;
            const alpha = pixels[index + 3]! / 255;
            if (alpha < alphaCut) continue;

            const luminance = pixels[index]! / 255;
            const tone = Math.min(
              1,
              Math.max(0, toneFloor + toneGain * (1 - Math.pow(luminance, gamma))),
            );
            if (tone < 0.05 + hash(col, row, 0) * 0.11) continue;

            const length = ((0.4 + Math.pow(tone, 1.2) * (UNIT - 0.5)) / UNIT) * cellPx;
            const x =
              col * cellPx + cellPx / 2 + (hash(col, row, 1) - 0.5) * 0.8 * (cellPx / UNIT);
            const y =
              row * cellPx + cellPx / 2 + (hash(col, row, 2) - 0.5) * 0.5 * (cellPx / UNIT);

            const path = tone > 0.7 ? dark : light;
            path.moveTo(x - length / 2, y);
            path.lineTo(x + length / 2, y);
          }
        }

        context.lineWidth = (1.6 / UNIT) * cellPx;
        context.stroke(light);
        context.lineWidth = (3 / UNIT) * cellPx;
        context.stroke(dark);

        if (row < rows) pending = window.setTimeout(slice, 0);
      };
      slice();
    }

    /* Same rule as the 3D pieces: no background competes for LCP. The plate is
       only requested after first paint, and only at the width it shows at. */
    const wide = minWidth ? window.matchMedia(`(min-width: ${minWidth}px)`) : null;
    const loaded = new Image();
    let started = false;

    function begin() {
      if (started || disposed || (wide && !wide.matches)) return;
      started = true;
      loaded.decoding = "async";
      loaded.src = src;
      loaded
        .decode()
        .then(() => {
          if (disposed) return;
          image = loaded;
          paint();
        })
        .catch(() => {
          /* No plate, no piece: the box stays empty instead of printing noise. */
        });
    }

    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(begin, { timeout: 2000 });
    } else {
      setTimeout(begin, 1200);
    }
    wide?.addEventListener("change", begin);

    const observer = new ResizeObserver(paint);
    observer.observe(host);

    /* Dragging the window from a Retina monitor to a 1x does not change the
       CSS rect — only the devicePixelRatio. Without this the stroke aliases
       until the next resize. */
    let dprQuery: MediaQueryList | null = null;
    const onDpr = () => {
      paint();
      watchDpr();
    };
    function watchDpr() {
      dprQuery?.removeEventListener("change", onDpr);
      dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      dprQuery.addEventListener("change", onDpr);
    }
    watchDpr();

    return () => {
      disposed = true;
      if (pending) clearTimeout(pending);
      observer.disconnect();
      wide?.removeEventListener("change", begin);
      dprQuery?.removeEventListener("change", onDpr);
      canvas.remove();
    };
  }, [src, cell, toneFloor, toneGain, gamma, alphaCut, fit, minWidth, maxPixels]);

  return <div ref={hostRef} aria-hidden className={className} />;
}
