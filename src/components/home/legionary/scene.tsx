"use client";

import GlyphScene from "@/components/home/glyph-scene";
import { buildLegionary } from "@/components/home/legionary/geometry";

/* Same short lens as the Colosseum, for the same reason: from afar with a
   telephoto the figure flattens and the lorica bands all come out the same
   size. At distance 2.0 with 29.8° the chest comes forward of the hip and
   the shield recedes — that is what gives the piece volume without shadow.

   The target aims at the chest, not the body's centre: that is where the
   drawing is (bands, shoulder guards, rosette) and the part that sits above
   the ticket in the hero. */
const TARGET: [number, number, number] = [0.01, 0.6, 0];
const RADIUS = 2.0;
const ELEVATION = 0.055;
const FOV_RADIANS = 0.52;
/* Three-quarter open toward the sword side: head-on the shield becomes a flat
   rectangle and eats half the silhouette; in profile the lorica disappears. */
const AZIMUTH = -0.2;
const AZIMUTH_SWING = Math.PI * 0.006;
const SWAY_RADIANS = 0.02;
const SWAY_SECONDS = 26;

const SCROLL_SWING = AZIMUTH_SWING;
const SCROLL_AXIS = "azimuth" as const;

/* Calibrated at this scale: the slit between lorica bands is 5 thousandths and
   the cingulum strap stands out 14 — the ramp must start below the first and
   saturate above the second, or the torso turns grey field or black blind. */
const RECESS_DEAD_ZONE = 0.004;
const RECESS_DEPTH = 0.055;

const CELL = 1.5;
const MIN_RADIUS_CELLS = 3;

/* Here the Colosseum and the trophy meet: half the tone comes from the gap
   (lorica, shoulder guard, cingulum) and half from light, because arm, leg
   and shield are smooth mass with no slit to measure. */
const TONE_FLOOR = 0.27;
const RECESS_GAIN = 0.6;
const FORM_GAIN = 0.56;

/* No paper: the piece is stroke only, with alpha. In the hero it shares the
   frame with the Colosseum, and two opaque cream canvases would cut each
   other out. */

export default function LegionaryCanvas() {
  return (
    <GlyphScene
      build={buildLegionary}
      target={TARGET}
      radius={RADIUS}
      elevation={ELEVATION}
      fovRadians={FOV_RADIANS}
      azimuth={AZIMUTH}
      azimuthSwing={AZIMUTH_SWING}
      swayRadians={SWAY_RADIANS}
      swaySeconds={SWAY_SECONDS}
      scrollSwing={SCROLL_SWING}
      scrollAxis={SCROLL_AXIS}
      lightTracksCamera
      cell={CELL}
      minRadiusCells={MIN_RADIUS_CELLS}
      toneFloor={TONE_FLOOR}
      recessGain={RECESS_GAIN}
      formGain={FORM_GAIN}
      recessDeadZone={RECESS_DEAD_ZONE}
      recessDepth={RECESS_DEPTH}
      fadeStart={-1}
      fadeEnd={0}
      paper={false}
      className="h-full w-full text-ink"
    />
  );
}
