"use client";

import GlyphScene from "@/components/home/glyph-scene";
import { buildColosseum } from "@/components/home/colosseum/geometry";

/* Enquadramento escolhido no olho, não deduzido: a lente é curta e chega
   perto — 28,6° a 1,7 de distância —, então a fachada íntegra entra em
   perspectiva forte, sangra pela margem esquerda e o anel corre em diagonal
   até morrer no degrau da parede caída, à direita. É a diferença
   entre uma foto do monumento e uma elevação de arquiteto: de longe e com
   teleobjetiva as arcadas saem todas do mesmo tamanho e a peça achata.

   A câmera fica baixa de propósito, quase na altura da segunda arcada. Subir
   abre a cávea, faz o aro do fundo passar por cima da parede da frente e o
   monumento lê como tigela vista de cima.

   Medidas do modelo, não do olho: a peça é gerada em geometry.ts com o eixo
   maior em 1.88 e o topo em 0.485. Com a câmera tão perto, o alvo deixa de ser
   correção fina de margem e vira parte do enquadramento: ele mira o trecho de
   arcada que ocupa o quadro, e é o que empurra o resto da elipse para fora
   dele. */
const TARGET: [number, number, number] = [0.43, 0.275, 0.155];
const RADIUS = 1.7;
const ELEVATION = 0.285;
const FOV_RADIANS = 0.5;
const AZIMUTH = Math.PI * 0.535;
const AZIMUTH_SWING = Math.PI * 0.006;
/* Vaivém curtíssimo. A lente aqui é curta (FOV de 28,6°), mas também está
   perto: a 1,7 de distância um grau de órbita anda mais na peça do que andava
   a 3,5. 1,4° é o que faz a arcada respirar como volume sem virar travelling. */
const SWAY_RADIANS = 0.025;
const SWAY_SECONDS = 26;

/* A CÂMERA ATRAVESSANDO O QUADRO. O vaivém acima é o relógio; isto é o
   scroll. Amplitude presa ao teto do swing do ponteiro — 1,08° para cada
   lado — porque a esta distância qualquer coisa maior vira travelling e rouba
   a leitura do texto que está por cima.

   VARIANTE A ("azimuth"): a câmera anda em volta do anel. As arcadas da
   fachada abrem e fecham conforme a dobra sai.
   VARIANTE B ("elevation"): a linha do horizonte sobe pela fachada. Você
   começa olhando o muro de baixo e termina vendo a cávea abrir.

   Trocar de uma para a outra é trocar SCROLL_AXIS. */
const SCROLL_SWING = AZIMUTH_SWING;
const SCROLL_AXIS = "azimuth" as const;

/* Calibrados contra o render nesta escala: abaixo de 0.006 a curvatura do
   próprio anel entra como recesso e o campo satura; acima de 0.08 o vão perde
   a borda e o arco vira retângulo. */
const RECESS_DEAD_ZONE = 0.006;
const RECESS_DEPTH = 0.075;

/* Grade fina com raio de mínimo curto: a 5 células o filtro atravessava o
   pilar e comia a aduela do arco. A 2px de célula os pavimentos de cima —
   que a lente baixa mostra em escorço — viram mancha; 1.5 é o que devolve a
   aduela em todos os quatro. */
const CELL = 1.5;
const MIN_RADIUS_CELLS = 3;

/* Aqui o relevo é geometria, não pintura: a peça não tem albedo. O tom vem do
   vão (recesso) com a luz apenas modelando a pedra que sobrou. */
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
