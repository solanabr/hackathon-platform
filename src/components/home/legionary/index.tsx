"use client";

import dynamic from "next/dynamic";
import { useSceneEligible } from "@/hooks/use-scene-eligible";

const LegionaryCanvas = dynamic(
  () => import("@/components/home/legionary/scene"),
  { ssr: false },
);

/* No 2D poster: in the lab the question is how the 3D piece reads next to
   the Colosseum. If it goes to the LP, the placeholder drawing goes here. */
export function LegionaryScene() {
  const showScene = useSceneEligible();

  return (
    <div className="relative h-full w-full">
      {showScene ? <LegionaryCanvas /> : null}
    </div>
  );
}
