"use client";

import GlyphScene from "@/components/home/glyph-scene";
import { buildColosseum } from "@/components/home/colosseum/geometry";

/* Lab lens: the live hero crops a bay and bleeds the rest. Here the whole
   ellipse has to sit inside the box, so the target returns to the axis and
   the camera steps back. Matching FOV keeps the front bays larger than the
   back ones — otherwise the piece flattens into an elevation. */
const TARGET: [number, number, number] = [0, 0.205, 0];
const RADIUS = 2.15;
const ELEVATION = 0.285;
const FOV_RADIANS = 0.7;
const AZIMUTH = Math.PI * 0.535;
const AZIMUTH_SWING = Math.PI * 0.006;
const SWAY_RADIANS = 0.025;
const SWAY_SECONDS = 26;

export default function ColosseumWholeCanvas() {
  return (
    <GlyphScene
      build={buildColosseum}
      target={TARGET}
      radius={RADIUS}
      elevation={ELEVATION}
      fovRadians={FOV_RADIANS}
      azimuth={AZIMUTH}
      azimuthSwing={AZIMUTH_SWING}
      swayRadians={SWAY_RADIANS}
      swaySeconds={SWAY_SECONDS}
      scrollSwing={AZIMUTH_SWING}
      scrollAxis="azimuth"
      lightTracksCamera
      cell={1.5}
      minRadiusCells={3}
      toneFloor={0.27}
      recessGain={0.8}
      formGain={0.32}
      recessDeadZone={0.006}
      recessDepth={0.075}
      fadeStart={-1}
      fadeEnd={0}
    />
  );
}
