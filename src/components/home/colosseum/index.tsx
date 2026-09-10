"use client";

import dynamic from "next/dynamic";
import { ColosseumBackdrop } from "@/components/home/colosseum-backdrop";
import { useSceneEligible } from "@/hooks/use-scene-eligible";

const ColosseumCanvas = dynamic(
  () => import("@/components/home/colosseum/scene"),
  { ssr: false },
);

export function ColosseumScene() {
  const showScene = useSceneEligible();

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
