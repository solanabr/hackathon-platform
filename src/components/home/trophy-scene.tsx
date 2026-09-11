"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { Trophy } from "@/components/home/trophy";
import { useSceneEligible } from "@/hooks/use-scene-eligible";

const GlyphScene = dynamic(() => import("@/components/home/glyph-scene"), {
  ssr: false,
});

/* The mesh comes from Tripo with the base at y=0 and the cup's mouth at y≈0.97:
   the target is half that height and the radius is what fits the handles in
   the frame's width in the portrait format the piece is framed in. */
const TARGET: [number, number, number] = [0, 0.45, 0];
const RADIUS = 2.32;
const ELEVATION = 0.15;
const FOV_RADIANS = 0.46;
const AZIMUTH = 0;
const AZIMUTH_SWING = Math.PI * 0.05;
/* Sway, not a full turn: in profile the cup loses its handles and becomes a
   vase — this is the arc where it stays a trophy the whole time. */
const SWAY_RADIANS = 0.3;
const SWAY_SECONDS = 16;

/* A cup has no gap: volume comes from light and ornament from paint, not
   from recess — the inverse of the Colosseum. */
const TONE_FLOOR = 0.3;
const RECESS_GAIN = 0.12;
const FORM_GAIN = 0.82;
const ALBEDO_MIX = 0.85;

/* The drawing stays in place until the scene has painted a real frame, and
   comes back if the context is lost. Swapping on mount opened a window of
   empty frame, and a failure after it had nowhere to degrade to.

   A lost context unmounts the canvas instead of just revealing the drawing: a
   canvas without a context keeps occupying the frame and the browser paints
   it as a broken image — opaque, and on top of what should replace it. */
export function TrophyScene({ className = "" }: { className?: string }) {
  const showScene = useSceneEligible();
  const [painted, setPainted] = useState(false);
  const [lost, setLost] = useState(false);
  const onReady = useCallback(() => setPainted(true), []);
  const onLost = useCallback(() => {
    setPainted(false);
    setLost(true);
  }, []);

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative flex h-full w-full items-center justify-center">
        {showScene && painted ? null : (
          <Trophy className="h-full w-auto drop-shadow-[8px_10px_0_rgb(27_35_29/0.16)]" />
        )}
        {showScene && !lost ? (
          <GlyphScene
            onReady={onReady}
            onLost={onLost}
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
            className="absolute inset-0 h-full w-full text-surface"
          />
        ) : null}
      </div>
    </div>
  );
}
