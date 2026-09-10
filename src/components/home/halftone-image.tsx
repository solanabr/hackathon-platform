"use client";

import { useEffect, useRef } from "react";

/**
 * Uma foto passada pela mesma prensa das peças 3D.
 *
 * O Coliseu e a taça chegam ao meio-tom por caminhos diferentes — um pelo vão,
 * outra pela luz — mas os dois desembocam no MESMO traço: risco horizontal na
 * grade da célula, comprimento crescendo com o tom, dois pesos, o mesmo piso de
 * ruído que come as células claras. Isto aqui é a terceira entrada para o mesmo
 * lugar: em vez de profundidade de render, o tom vem da luminância de uma chapa
 * em cinza + alfa.
 *
 * Por isso a fonte NÃO é a foto colorida: é um PNG/WebP já recortado e já
 * reduzido a cinza. Nenhuma cor da referência atravessa para a página — o que
 * entra é densidade de tinta, que é a única coisa que esta identidade sabe
 * imprimir.
 *
 * As constantes de traço são as de `halftoneMarks()` e as de HALFTONE_FRAG,
 * copiadas de propósito em vez de importadas: lá elas vivem em GLSL e aqui em
 * canvas 2D. Se uma mudar, as três mudam juntas.
 */

const UNIT = 8;

/* O mesmo hash do shader, para a peça impressa não ter um granulado diferente
   do resto da folha. */
function hash(x: number, y: number, salt: number) {
  const value = Math.sin((x + salt) * 127.1 + (y + salt) * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

export type HalftoneImageProps = {
  /** Chapa em cinza + alfa. O alfa é o recorte; o cinza é o tom. */
  src: string;
  /** Abaixo desta largura a chapa nem é baixada. Uma peça de fundo não gasta
   * banda de celular para depois ser escondida por CSS. */
  minWidth?: number;
  /** Lado da célula, em px de CSS. 1.5 é a grade das peças 3D do hero. */
  cell?: number;
  /** Piso de tinta e ganho — a mesma dupla das cenas 3D. */
  toneFloor?: number;
  toneGain?: number;
  /** Gama aplicada à luminância antes do tom: acima de 1 abre as sombras. */
  gamma?: number;
  /** Abaixo disto o pixel é fundo e não imprime nada. */
  alphaCut?: number;
  /** `contain` deixa a peça de pé no rodapé da caixa — é o enquadramento de um
   * objeto recortado. `cover` preenche a caixa inteira e corta o que sobra: é o
   * enquadramento de uma CENA, que não tem pé nem borda, só continua fora do
   * quadro. */
  fit?: "contain" | "cover";
  className?: string;
};

export function HalftoneImage({
  src,
  cell = 1.5,
  toneFloor = 0.22,
  toneGain = 0.8,
  gamma = 1,
  alphaCut = 0.45,
  fit = "contain",
  minWidth = 0,
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

    /* Grade auxiliar do tamanho da GRADE, não da tela: reduzir a foto para uma
       célula por pixel é o mesmo passo que o shader faz em GPU, e deixa a média
       da célula por conta do downscale do navegador. */
    const sampler = document.createElement("canvas");
    const samplerContext = sampler.getContext("2d", { willReadFrequently: true });
    if (!samplerContext) return;

    let disposed = false;
    let image: HTMLImageElement | null = null;

    function paint() {
      if (disposed || !image || !context || !samplerContext) return;
      const rect = host!.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(rect.width * dpr);
      const height = Math.round(rect.height * dpr);
      const cellPx = cell * dpr;
      const cols = Math.max(1, Math.ceil(width / cellPx));
      const rows = Math.max(1, Math.ceil(height / cellPx));

      canvas.width = width;
      canvas.height = height;
      sampler.width = cols;
      sampler.height = rows;

      // `contain`, e alinhado embaixo: a peça fica de pé no rodapé da caixa, do
      // mesmo jeito que o monumento se apoia na margem inferior do hero. Em
      // `cover` não há pé: a cena transborda o quadro pelos quatro lados e o
      // corte é o que prova que ela continua fora dele.
      const cobre = fit === "cover";
      const scale = cobre
        ? Math.max(cols / image.width, rows / image.height)
        : Math.min(cols / image.width, rows / image.height);
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      const drawX = (cols - drawWidth) / 2;
      const drawY = cobre ? (rows - drawHeight) / 2 : rows - drawHeight;

      samplerContext.clearRect(0, 0, cols, rows);
      samplerContext.imageSmoothingEnabled = true;
      samplerContext.imageSmoothingQuality = "high";
      samplerContext.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      const pixels = samplerContext.getImageData(0, 0, cols, rows).data;

      const ink = getComputedStyle(host!).color;
      context.clearRect(0, 0, width, height);
      context.lineCap = "round";
      context.strokeStyle = ink;

      // Dois caminhos, um por peso — os mesmos dois <path> do meio-tom em SVG.
      // Traçar mark a mark custaria uma chamada por célula, e são dezenas de
      // milhares delas numa caixa de hero.
      const light = new Path2D();
      const dark = new Path2D();

      for (let row = 0; row < rows; row++) {
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
    }

    /* Mesma regra das peças 3D: nada de fundo disputa o LCP. A chapa só é
       pedida depois da primeira pintura, e só na largura em que ela aparece. */
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
          /* Sem chapa não há peça: a caixa fica vazia em vez de imprimir ruído. */
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

    /* Arrastar a janela de um monitor Retina para um 1x não muda o retângulo em
       CSS — só o devicePixelRatio. Sem isto o traço serrilha até o próximo
       resize. */
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
      observer.disconnect();
      wide?.removeEventListener("change", begin);
      dprQuery?.removeEventListener("change", onDpr);
      canvas.remove();
    };
  }, [src, cell, toneFloor, toneGain, gamma, alphaCut, fit, minWidth]);

  return <div ref={hostRef} aria-hidden className={className} />;
}
