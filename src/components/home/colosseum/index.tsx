"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { useSceneEligible } from "@/hooks/use-scene-eligible";

const ColosseumCanvas = dynamic(
  () => import("@/components/home/colosseum/scene"),
  { ssr: false },
);

/* O desenho 2D chega de fora: ele é gerado no servidor e servido como
   arquivo, e este componente é de cliente — importá-lo aqui arrastaria o
   gerador da chapa para o bundle do navegador. */
export function ColosseumScene({ backdrop }: { backdrop: ReactNode }) {
  const showScene = useSceneEligible();

  return (
    <div className="relative h-full w-full">
      {backdrop}
      {showScene ? (
        <div className="absolute inset-0">
          <ColosseumCanvas />
        </div>
      ) : null}
    </div>
  );
}
