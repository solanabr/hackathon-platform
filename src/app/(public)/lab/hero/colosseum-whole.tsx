"use client";

import dynamic from "next/dynamic";
import { useSceneEligible } from "@/hooks/use-scene-eligible";

const Canvas = dynamic(() => import("./colosseum-whole-canvas"), {
  ssr: false,
});

export function ColosseumWhole() {
  const showScene = useSceneEligible();

  return (
    <div className="relative h-full w-full">
      {showScene ? <Canvas /> : null}
    </div>
  );
}
