"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { useSceneEligible } from "@/hooks/use-scene-eligible";

const ColosseumCanvas = dynamic(
  () => import("@/components/home/colosseum/scene"),
  { ssr: false },
);

/* The 2D drawing comes from outside: it is generated on the server and served
   as a file, and this component is a client one — importing it here would drag
   the plate generator into the browser bundle. */
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
