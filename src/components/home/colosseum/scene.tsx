"use client";

import GlyphScene from "@/components/home/glyph-scene";
import { buildColosseum } from "@/components/home/colosseum/geometry";

/* Enquadramento de três quartos: a fachada íntegra ocupa a esquerda, o anel
   curva para dentro do quadro e sangra na direita, e o degrau da ruína cai
   junto com ele. É o único ângulo em que os três dados do monumento — arcada
   sobreposta, planta elíptica e parede caída — cabem na mesma leitura; de
   frente vira muro furado, de cima vira prato.

   A câmera sobe até onde o aro do fundo passa por cima da parede da frente:
   abaixo de 0.26 rad o anel oposto se esconde atrás dela e o monumento lê como
   muro; acima de 0.36 a cávea abre demais e vira prato. Nesta faixa a arcada
   de trás e o degrau interno entram no quadro sem que a fachada perca o arco.

   Medidas do modelo, não do olho: a peça é gerada em geometry.ts com o eixo
   maior em 1.88 e o topo em 0.485, e o alvo fica na altura da terceira arcada
   para a linha do horizonte cruzar a fachada, não o céu. O alvo também anda
   para a esquerda do eixo da câmera — é o que empurra a peça para fora da
   margem direita em vez de centralizá-la atrás do ticket. */
const TARGET: [number, number, number] = [-0.274, 0.06, -0.261];
const RADIUS = 3.5;
const ELEVATION = 0.3;
const FOV_RADIANS = 0.22;
const AZIMUTH = Math.PI * 1.78;
const AZIMUTH_SWING = Math.PI * 0.006;
/* Vaivém curtíssimo: a lente é longa (FOV de 12,6°), então 4° de giro seriam
   um terço do quadro. Aqui 1,4° já basta para a arcada respirar como volume. */
const SWAY_RADIANS = 0.025;
const SWAY_SECONDS = 26;

/* Calibrados contra o render nesta escala: abaixo de 0.006 a curvatura do
   próprio anel entra como recesso e o campo satura; acima de 0.08 o vão perde
   a borda e o arco vira retângulo. */
const RECESS_DEAD_ZONE = 0.006;
const RECESS_DEPTH = 0.075;

/* Grade fina com raio de mínimo curto: o vão tem ~28px de largura no quadro do
   hero, e a 5 células o filtro atravessava o pilar e comia a aduela do arco. */
const CELL = 2;
const MIN_RADIUS_CELLS = 3;

/* Aqui o relevo é geometria, não pintura: a peça não tem albedo. O tom vem do
   vão (recesso) com a luz apenas modelando a pedra que sobrou. */
const TONE_FLOOR = 0.24;
const RECESS_GAIN = 0.74;
const FORM_GAIN = 0.3;

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
