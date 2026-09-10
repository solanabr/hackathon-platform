"use client";

import GlyphScene from "@/components/home/glyph-scene";

/* Enquadramento medido, não olhado: é o único azimute em que a fachada íntegra
   atravessa o quadro inteiro — a ponta do arco sobrevivente não preenche. O
   raio é o mais curto em que a arcada inteira ainda cabe na altura do bloco. */
const TARGET: [number, number, number] = [0, 0.138, 0];
const RADIUS = 0.98;
const ELEVATION = 0.045;
const FOV_RADIANS = 0.46;
const AZIMUTH = Math.PI * 1.8;
const AZIMUTH_SWING = Math.PI * 0.033;
/* Vaivém curto: o azimute acima é o único em que a fachada íntegra preenche o
   quadro, então o arco tem que caber dentro dele — 7°, não os 17° da taça. */
const SWAY_RADIANS = 0.12;
const SWAY_SECONDS = 22;

/* Medidos no harness isolado (scratchpad), não estimados: delta entre pedra e
   vão varia por um fator de ~30, daí a normalização log entre estes dois. */
const RECESS_DEAD_ZONE = 0.004;
const RECESS_DEPTH = 0.09;

/* Grade da taça, não a de 8: o traço fica fino o bastante para o arco ter borda
   em vez de virar bloco. O raio do mínimo sobe junto — ele é medido em células,
   e a 3px o raio 2 cobre 6px de vizinhança, longe demais do vão para achar a
   pedra da frente. 5 células devolvem os mesmos ~15px do enquadramento antigo. */
const CELL = 3;
const MIN_RADIUS_CELLS = 5;

/* A assinatura da taça — luz presa à câmera e a albedo entrando como tinta —
   com o recesso mantido alto: aqui o arco é vão de verdade, e zerá-lo como na
   taça devolve uma parede lisa com arco pintado. Medidos contra o render, não
   estimados: abaixo de 0.6 de recesso a arcada superior fecha. */
const TONE_FLOOR = 0.3;
const RECESS_GAIN = 0.62;
const FORM_GAIN = 0.38;
const ALBEDO_MIX = 0.62;

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
      swayRadians={SWAY_RADIANS}
      swaySeconds={SWAY_SECONDS}
      lightTracksCamera
      cell={CELL}
      minRadiusCells={MIN_RADIUS_CELLS}
      albedoMix={ALBEDO_MIX}
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
