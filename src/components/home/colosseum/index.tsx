"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ColosseumBackdrop } from "@/components/home/colosseum-backdrop";

const ColosseumCanvas = dynamic(
  () => import("@/components/home/colosseum/scene"),
  { ssr: false },
);

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

export function ColosseumScene() {
  const [showScene, setShowScene] = useState(false);

  useEffect(() => {
    const widthMq = window.matchMedia("(min-width: 1024px)");
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lcpReady = false;

    const eligible = () =>
      widthMq.matches && !motionMq.matches && webgl2Available();

    const sync = () => {
      setShowScene(lcpReady && eligible());
    };

    afterLcp(() => {
      lcpReady = true;
      sync();
    });

    const onChange = () => sync();
    widthMq.addEventListener("change", onChange);
    motionMq.addEventListener("change", onChange);

    return () => {
      widthMq.removeEventListener("change", onChange);
      motionMq.removeEventListener("change", onChange);
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <ColosseumBackdrop className="h-full w-full" />
      {showScene ? (
        <div className="absolute inset-0">
          <ColosseumCanvas />
        </div>
      ) : null}
    </div>
  );
}
