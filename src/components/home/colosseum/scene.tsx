"use client";

import GlyphScene from "@/components/home/glyph-scene";
import { buildColosseum } from "@/components/home/colosseum/geometry";

/* Framing chosen by eye, not derived: the lens is short and comes close —
   28.6° at distance 1.7 — so the intact facade enters in strong perspective,
   bleeds off the left margin and the ring runs diagonally until it dies at
   the step of the fallen wall, on the right. It is the difference between
   a photo of the monument and an architect's elevation: from afar with a
   telephoto the arcades all come out the same size and the piece flattens.

   The camera sits low on purpose, almost at the height of the second arcade.
   Going up opens the cavea, sends the back rim over the front wall and the
   monument reads as a bowl seen from above.

   Model measurements, not eye: the piece is generated in geometry.ts with the
   major axis at 1.88 and the top at 0.485. With the camera this close, the
   target stops being fine margin correction and becomes part of the framing:
   it aims at the stretch of arcade that fills the frame, and that is what
   pushes the rest of the ellipse out of it. */
const TARGET: [number, number, number] = [0.43, 0.275, 0.155];
const RADIUS = 1.7;
const ELEVATION = 0.285;
const FOV_RADIANS = 0.5;
const AZIMUTH = Math.PI * 0.535;
const AZIMUTH_SWING = Math.PI * 0.006;
/* Very short sway. The lens here is short (28.6° FOV) but also close: at
   distance 1.7 one degree of orbit moves farther across the piece than it did
   at 3.5. 1.4° makes the arcade breathe as volume without becoming a tracking shot. */
const SWAY_RADIANS = 0.025;
const SWAY_SECONDS = 26;

/* THE CAMERA CROSSING THE FRAME. The sway above is the clock; this is the
   scroll. Amplitude pinned to the ceiling of the pointer's swing — 1.08° to
   each side — because at this distance anything larger becomes a tracking
   shot and steals the reading of the text sitting on top.

   VARIANT A ("azimuth"): the camera walks around the ring. The facade's
   arcades open and close as the fold comes out.
   VARIANT B ("elevation"): the horizon line climbs the facade. You start
   looking at the lower wall and end up seeing the cavea open.

   Switching between them is switching SCROLL_AXIS. */
const SCROLL_SWING = AZIMUTH_SWING;
const SCROLL_AXIS = "azimuth" as const;

/* Calibrated against the render at this scale: below 0.006 the ring's own
   curvature enters as recess and the field saturates; above 0.08 the bay
   loses its edge and the arch becomes a rectangle. */
const RECESS_DEAD_ZONE = 0.006;
const RECESS_DEPTH = 0.075;

/* Fine grid with a short minimum radius: at 5 cells the filter crossed the
   pier and ate the arch voussoir. At a 2px cell the upper storeys — which the
   low lens shows foreshortened — become a smudge; 1.5 is what returns the
   voussoir on all four. */
const CELL = 1.5;
const MIN_RADIUS_CELLS = 3;

/* Here the relief is geometry, not paint: the piece has no albedo. Tone comes
   from the gap (recess), with light only modelling the stone that is left. */
const TONE_FLOOR = 0.27;
const RECESS_GAIN = 0.8;
const FORM_GAIN = 0.32;

export default function ColosseumCanvas() {
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
    />
  );
}
