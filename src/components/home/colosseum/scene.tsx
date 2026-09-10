"use client";

import GlyphScene from "@/components/home/glyph-scene";

/* Enquadramento medido, não olhado: é o único azimute em que a fachada íntegra
   atravessa o quadro inteiro — a ponta do arco sobrevivente não preenche. */
const TARGET: [number, number, number] = [0, 0.138, 0];
const RADIUS = 1.12;
const ELEVATION = 0.045;
const FOV_RADIANS = 0.46;
const AZIMUTH = Math.PI * 1.8;
const AZIMUTH_SWING = Math.PI * 0.033;

/* Medidos no harness isolado (scratchpad), não estimados: delta entre pedra e
   vão varia por um fator de ~30, daí a normalização log entre estes dois. */
const RECESS_DEAD_ZONE = 0.004;
const RECESS_DEPTH = 0.09;

export default function ColosseumCanvas() {
  return (
    <GlyphScene
      modelUrl="/models/colosseum.glb"
      target={TARGET}
      radius={RADIUS}
      elevation={ELEVATION}
      fovRadians={FOV_RADIANS}
      azimuth={AZIMUTH}
      azimuthSwing={AZIMUTH_SWING}
      recessDeadZone={RECESS_DEAD_ZONE}
      recessDepth={RECESS_DEPTH}
    />
  );
}
