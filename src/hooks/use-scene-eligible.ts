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

/* A 3D piece never competes with the LCP nor enters where it does not fit:
   only after first paint, only at the size it was framed for, only with WebGL2
   and never under reduced motion — there the 2D drawing behind it is the piece. */
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
