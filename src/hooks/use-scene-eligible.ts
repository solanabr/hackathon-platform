"use client";

import { useEffect, useState } from "react";

function webgl2Available() {
  try {
    const canvas = document.createElement("canvas");
    return canvas.getContext("webgl2") !== null;
  } catch {
    return false;
  }
}

function afterLcp(callback: () => void) {
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(callback, { timeout: 2000 });
    return;
  }
  setTimeout(callback, 1200);
}

/* Uma peça 3D nunca disputa com o LCP nem entra onde não cabe: só depois da
   primeira pintura, só no tamanho em que foi enquadrada, só com WebGL2 e
   nunca em movimento reduzido — nesse caso o desenho 2D atrás dela é a peça. */
export function useSceneEligible(minWidth = 1024) {
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    const widthMq = window.matchMedia(`(min-width: ${minWidth}px)`);
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lcpReady = false;

    const sync = () => {
      setEligible(
        lcpReady && widthMq.matches && !motionMq.matches && webgl2Available(),
      );
    };

    afterLcp(() => {
      lcpReady = true;
      sync();
    });

    widthMq.addEventListener("change", sync);
    motionMq.addEventListener("change", sync);

    return () => {
      widthMq.removeEventListener("change", sync);
      motionMq.removeEventListener("change", sync);
    };
  }, [minWidth]);

  return eligible;
}
