"use client";

import GlyphScene from "@/components/home/glyph-scene";
import { buildLegionary } from "@/components/home/legionary/geometry";

/* Mesma lente curta do Coliseu, pelo mesmo motivo: de longe e com
   teleobjetiva a figura achata e as faixas da lorica saem todas do mesmo
   tamanho. A 2.0 de distância com 29,8° o peito chega na frente do quadril e
   o escudo recua — é o que faz a peça ter volume sem precisar de sombra.

   O alvo mira o peito, não o centro do corpo: é lá que está o desenho (faixas,
   ombreiras, roseta) e é a parte que fica acima do ticket no hero. */
const TARGET: [number, number, number] = [0.01, 0.6, 0];
const RADIUS = 2.0;
const ELEVATION = 0.055;
const FOV_RADIANS = 0.52;
/* Três-quartos aberto para o lado da espada: de frente o escudo vira um
   retângulo chapado e come metade da silhueta; de perfil some a lorica. */
const AZIMUTH = -0.2;
const AZIMUTH_SWING = Math.PI * 0.006;
const SWAY_RADIANS = 0.02;
const SWAY_SECONDS = 26;

const SCROLL_SWING = AZIMUTH_SWING;
const SCROLL_AXIS = "azimuth" as const;

/* Calibrados nesta escala: a fresta entre faixas da lorica tem 5 milésimos e a
   tira do cíngulo destaca 14 — a rampa precisa começar abaixo da primeira e
   saturar acima da segunda, senão o tronco vira campo cinza ou persiana preta. */
const RECESS_DEAD_ZONE = 0.004;
const RECESS_DEPTH = 0.055;

const CELL = 1.5;
const MIN_RADIUS_CELLS = 3;

/* Aqui o Coliseu e a taça se encontram: metade do tom vem do vão (lorica,
   ombreira, cíngulo) e metade vem da luz, porque braço, perna e escudo são
   massa lisa sem nenhuma fresta para medir. */
const TONE_FLOOR = 0.27;
const RECESS_GAIN = 0.6;
const FORM_GAIN = 0.56;

/* Sem papel: a peça sai só em traço, com alfa. No hero ela divide o quadro com
   o Coliseu, e duas telas opacas de creme se recortariam uma à outra. */

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
