"use client";

import dynamic from "next/dynamic";
import { useSceneEligible } from "@/hooks/use-scene-eligible";

const LegionaryCanvas = dynamic(
  () => import("@/components/home/legionary/scene"),
  { ssr: false },
);

/* Sem poster 2D: no laboratório a pergunta é como a peça 3D lê ao lado do
   Coliseu. Se ela for para a LP, o desenho de espera entra aqui. */
export function LegionaryScene() {
  const showScene = useSceneEligible();

  return (
    <div className="relative h-full w-full">
      {showScene ? <LegionaryCanvas /> : null}
    </div>
  );
}
