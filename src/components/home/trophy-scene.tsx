"use client";

import dynamic from "next/dynamic";
import { Trophy } from "@/components/home/trophy";
import { useSceneEligible } from "@/hooks/use-scene-eligible";

const GlyphScene = dynamic(() => import("@/components/home/glyph-scene"), {
  ssr: false,
});

/* A malha vem do Tripo com a base em y=0 e a boca da taça em y≈0.97: o alvo é
   a metade dessa altura e o raio é o que faz as alças caberem na largura do
   quadro no formato retrato em que a peça é enquadrada. */
const TARGET: [number, number, number] = [0, 0.45, 0];
const RADIUS = 2.32;
const ELEVATION = 0.15;
const FOV_RADIANS = 0.46;
const AZIMUTH = 0;
const AZIMUTH_SWING = Math.PI * 0.05;
/* Vaivém, não volta completa: de perfil a taça perde as alças e vira vaso —
   este é o arco em que ela continua sendo uma taça o tempo todo. */
const SWAY_RADIANS = 0.3;
const SWAY_SECONDS = 16;

/* Numa taça não existe vão: o volume vem da luz e o ornamento vem da pintura,
   não do recesso — invertido em relação ao Colosseum. */
const TONE_FLOOR = 0.2;
const RECESS_GAIN = 0.12;
const FORM_GAIN = 0.82;
const ALBEDO_MIX = 0.85;

export function TrophyScene({ className = "" }: { className?: string }) {
  const showScene = useSceneEligible();

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {showScene ? null : (
        <Trophy className="h-full w-auto drop-shadow-[8px_10px_0_rgb(27_35_29/0.16)]" />
      )}
      {showScene ? (
        <GlyphScene
          modelUrl="/models/trophy.glb"
          target={TARGET}
          radius={RADIUS}
          elevation={ELEVATION}
          fovRadians={FOV_RADIANS}
          azimuth={AZIMUTH}
          azimuthSwing={AZIMUTH_SWING}
          swayRadians={SWAY_RADIANS}
          swaySeconds={SWAY_SECONDS}
          lightTracksCamera
          toneFloor={TONE_FLOOR}
          recessGain={RECESS_GAIN}
          formGain={FORM_GAIN}
          cell={3}
          albedoMix={ALBEDO_MIX}
          fadeStart={-1}
          fadeEnd={0}
          paper={false}
          className="h-full w-full text-ink"
        />
      ) : null}
    </div>
  );
}
