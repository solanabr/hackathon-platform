import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * O legionário, construído em vez de baixado — pelo mesmo motivo do Coliseu.
 *
 * O meio-tom desta LP desenha RECESSO: ele precisa de vão de verdade atrás da
 * matéria para ter o que descrever. Uma foto de armadura vira mancha; um GLB
 * genérico de soldado vira boneco liso. Mas a lorica segmentata é literalmente
 * uma arcada vestida — faixas de metal com fresta entre elas, ombreiras
 * concêntricas, o avental de tiras penduradas do cinturão. Cada fresta dessas
 * é o mesmo vão do arco: o filtro de mínimo a converte em tinta sozinho.
 *
 * Por isso a peça é gerada faixa a faixa em vez de esculpida: onde há fresta
 * ela é fresta, não sombra pintada.
 *
 * Unidades: 1 = a altura do homem. Pés em y = 0, topo da crista em y ≈ 1.06.
 * Ele encara +Z; a mão da espada está em -X (a direita dele) e o escudo em +X
 * (a esquerda dele) — que é o lado da direita de quem olha.
 */

const SEG = 14;

const SHOULDER_Y = 0.815;
const CHEST_TOP = 0.8;
const WAIST_Y = 0.615;
const HIP_Y = 0.5;
const KNEE_Y = 0.27;
const ANKLE_Y = 0.05;
const NECK_Y = 0.855;

/** Meio-perfil do tronco: peito largo em cima, cintura estreita embaixo. */
function girth(y: number) {
  const k = THREE.MathUtils.clamp((y - WAIST_Y) / (CHEST_TOP - WAIST_Y), 0, 1);
  return {
    wide: THREE.MathUtils.lerp(0.108, 0.138, k),
    deep: THREE.MathUtils.lerp(0.076, 0.098, k),
  };
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Tronco de cone entre dois pontos — membro, punho de espada, mastro. */
function limb(
  from: THREE.Vector3,
  to: THREE.Vector3,
  rFrom: number,
  rTo: number,
  { segments = SEG, open = false } = {},
) {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(
    rFrom,
    rTo,
    length,
    segments,
    1,
    open,
  ).translate(0, -length / 2, 0);
  geometry.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(
      V(0, -1, 0),
      direction.normalize(),
    ),
  );
  return geometry.translate(from.x, from.y, from.z);
}

/** Aro elíptico de eixo vertical: uma faixa da lorica, o cinturão, a gola. */
function girdle(
  y: number,
  height: number,
  wide: number,
  deep: number,
  flare = 1.03,
) {
  return new THREE.CylinderGeometry(1, flare, height, 44, 1, true)
    .scale(wide, 1, deep)
    .translate(0, y + height / 2, 0);
}

/** Placa curva — o escudo e o peitoral saem daqui. */
function curvedPlate(
  radius: number,
  height: number,
  thetaStart: number,
  thetaLength: number,
  thickness: number,
) {
  const outer = new THREE.CylinderGeometry(
    radius + thickness,
    radius + thickness,
    height,
    40,
    1,
    true,
    thetaStart,
    thetaLength,
  );
  const inner = new THREE.CylinderGeometry(
    radius,
    radius,
    height,
    40,
    1,
    true,
    thetaStart,
    thetaLength,
  );
  return [outer, inner];
}

function box(w: number, h: number, d: number) {
  return new THREE.BoxGeometry(w, h, d);
}

export function buildLegionary(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const push = (...geometries: THREE.BufferGeometry[]) => parts.push(...geometries);

  /* ---- pernas ---------------------------------------------------------- */
  // Contraposto curto: a perna da espada firme, a do escudo meio passo à
  // frente. Sem isso a silhueta fica de sentinela de brinquedo, com as duas
  // canelas paralelas virando uma coluna só no meio-tom.
  const stance = [
    { x: -0.062, z: -0.015 },
    { x: 0.07, z: 0.035 },
  ];
  for (const foot of stance) {
    const hip = V(foot.x * 0.75, HIP_Y, foot.z * 0.3);
    const knee = V(foot.x * 0.95, KNEE_Y, foot.z * 0.7);
    const ankle = V(foot.x, ANKLE_Y, foot.z);
    push(limb(hip, knee, 0.062, 0.047));
    push(limb(knee, ankle, 0.047, 0.036));
    // Cáliga: sola espessa e o cadarço cruzado, que entra como três frestas.
    push(box(0.072, 0.036, 0.15).translate(foot.x, 0.018, foot.z + 0.028));
    for (let i = 0; i < 3; i++) {
      push(
        limb(
          V(foot.x - 0.04, ANKLE_Y + 0.035 + i * 0.03, foot.z),
          V(foot.x + 0.04, ANKLE_Y + 0.03 + i * 0.03, foot.z),
          0.006,
          0.006,
          { segments: 6 },
        ).translate(0, 0, 0.004),
      );
    }
  }

  /* ---- túnica e avental ------------------------------------------------ */
  push(
    new THREE.CylinderGeometry(0.112, 0.142, 0.17, 40, 1, true).translate(
      0,
      0.525,
      0,
    ),
  );
  // Cíngulo: as tiras que caem do cinturão. É o detalhe mais barato de fazer e
  // o que mais rende — cinco frestas verticais no ponto em que o corpo é só
  // massa, exatamente onde a luz sozinha não desenharia nada.
  const STRAPS = 5;
  for (let i = 0; i < STRAPS; i++) {
    const spread = (i - (STRAPS - 1) / 2) / ((STRAPS - 1) / 2);
    const x = spread * 0.062;
    const length = 0.15 - Math.abs(spread) * 0.022;
    const z = 0.083 - Math.abs(spread) * 0.02;
    const strap = box(0.03, length, 0.014).translate(
      x,
      WAIST_Y - 0.012 - length / 2,
      z,
    );
    strap.rotateZ(-spread * 0.08);
    push(strap);
    for (let s = 0; s < 3; s++) {
      push(
        box(0.016, 0.016, 0.008).translate(
          x,
          WAIST_Y - 0.05 - s * 0.042,
          z + 0.009,
        ),
      );
    }
  }

  /* ---- lorica segmentata ----------------------------------------------- */
  // Sete cinturas de metal, cada uma montada por cima da de baixo. O passo é
  // 0.026 com 0.021 de faixa: sobram 5 milésimos de fresta, dentro da faixa
  // que a zona morta do recesso enxerga nesta distância de câmera.
  const BANDS = 7;
  for (let i = 0; i < BANDS; i++) {
    const y = WAIST_Y + i * 0.026;
    const { wide, deep } = girth(y);
    push(girdle(y, 0.021, wide, deep, 1.05));
  }
  // Cinturão, e a placa de peito que fecha a lorica em cima.
  push(girdle(WAIST_Y - 0.028, 0.028, 0.114, 0.081, 1.0));
  const top = girth(CHEST_TOP);
  push(girdle(CHEST_TOP, 0.052, top.wide * 0.98, top.deep, 0.99));
  push(girdle(CHEST_TOP + 0.05, 0.02, top.wide * 0.86, top.deep * 0.9, 0.95));
  // Roseta central: o disco lavrado no meio do peito. Um só relevo redondo
  // num campo de faixas horizontais — é o que impede o tronco de ler como
  // persiana.
  push(
    new THREE.CylinderGeometry(0.026, 0.03, 0.012, 20)
      .rotateX(Math.PI / 2)
      .translate(0, CHEST_TOP + 0.024, top.deep * 0.99),
  );
  // Balteus: a correia do gladius atravessando o peito na diagonal.
  const baldric = box(0.028, 0.3, 0.012);
  baldric.rotateZ(0.42);
  baldric.translate(-0.012, CHEST_TOP - 0.06, top.deep * 0.96);
  push(baldric);

  /* ---- ombreiras e braços ---------------------------------------------- */
  const arms = [
    { side: -1, elbow: V(-0.163, 0.6, 0.026), wrist: V(-0.158, 0.44, 0.072) },
    { side: 1, elbow: V(0.172, 0.605, 0.01), wrist: V(0.205, 0.47, 0.055) },
  ];
  for (const arm of arms) {
    const shoulder = V(arm.side * 0.118, SHOULDER_Y - 0.01, 0);
    // Ombreira: quatro aros concêntricos descendo do pescoço para o deltoide,
    // cada um menor que o anterior. É a arcada outra vez — só que enrolada no
    // ombro em vez de esticada na fachada.
    for (let i = 0; i < 4; i++) {
      const k = i / 3;
      const from = V(
        arm.side * (0.042 + k * 0.072),
        SHOULDER_Y + 0.048 - k * 0.052,
        0,
      );
      const to = V(
        arm.side * (0.062 + k * 0.075),
        SHOULDER_Y + 0.032 - k * 0.055,
        0,
      );
      push(
        limb(from, to, 0.082 - k * 0.028, 0.079 - k * 0.028, {
          segments: 26,
          open: true,
        }),
      );
    }
    push(limb(shoulder, arm.elbow, 0.05, 0.038));
    push(limb(arm.elbow, arm.wrist, 0.038, 0.03));
    push(
      new THREE.SphereGeometry(0.033, 16, 12).translate(
        arm.wrist.x,
        arm.wrist.y - 0.02,
        arm.wrist.z,
      ),
    );
  }
  // Manica no antebraço da espada: mais seis frestas, agora estreitas, para o
  // braço não descer como um tubo liso até a mão.
  for (let i = 0; i < 6; i++) {
    const k = i / 5;
    const from = new THREE.Vector3().lerpVectors(
      arms[0]!.elbow,
      arms[0]!.wrist,
      k * 0.82,
    );
    const to = new THREE.Vector3().lerpVectors(
      arms[0]!.elbow,
      arms[0]!.wrist,
      k * 0.82 + 0.09,
    );
    push(limb(from, to, 0.042 - k * 0.006, 0.041 - k * 0.006, { open: true }));
  }

  /* ---- cabeça e galea --------------------------------------------------- */
  const head: THREE.BufferGeometry[] = [];
  head.push(limb(V(0, NECK_Y + 0.03, 0), V(0, NECK_Y - 0.02, 0), 0.034, 0.042));
  head.push(
    new THREE.SphereGeometry(0.056, 22, 18)
      .scale(0.86, 1, 0.95)
      .translate(0, 0.925, 0.004),
  );
  // Nariz e sobrancelha: dois relevos mínimos, mas sem eles o perfil dentro do
  // capacete lê como ovo. Ninguém vai contar os traços; o olho só precisa saber
  // que há um rosto virado.
  head.push(
    box(0.016, 0.03, 0.03)
      .rotateX(-0.25)
      .translate(0, 0.918, 0.056),
  );
  head.push(box(0.06, 0.012, 0.018).translate(0, 0.948, 0.05));
  // Calota, aba e protetor de nuca.
  head.push(
    new THREE.SphereGeometry(0.066, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62)
      .scale(0.96, 1.02, 1.04)
      .translate(0, 0.938, 0),
  );
  head.push(
    new THREE.TorusGeometry(0.064, 0.008, 8, 30)
      .rotateX(Math.PI / 2)
      .scale(1, 1, 1.04)
      .translate(0, 0.945, 0),
  );
  const nape = box(0.11, 0.014, 0.07);
  nape.rotateX(-0.7);
  nape.translate(0, 0.915, -0.06);
  head.push(nape);
  // Bochechas: as duas abas articuladas, abertas para fora.
  for (const side of [-1, 1]) {
    const cheek = box(0.014, 0.072, 0.05);
    cheek.rotateZ(side * 0.16);
    cheek.rotateY(side * 0.2);
    cheek.translate(side * 0.055, 0.9, 0.014);
    head.push(cheek);
  }
  // Crista: um pente de lâminas finas, não um bloco. Um bloco devolveria uma
  // aleta chapada; as lâminas com fresta entre elas são o único jeito de o
  // meio-tom escrever "crina" em vez de "placa".
  const BLADES = 26;
  for (let i = 0; i < BLADES; i++) {
    const k = i / (BLADES - 1);
    const arc = Math.sin(Math.PI * Math.min(1, k * 1.12));
    const height = 0.055 + arc * 0.055;
    const z = 0.05 - k * 0.145;
    const blade = box(0.007, height, 0.011);
    head.push(blade.translate(0, 0.985 + height / 2 - 0.03 - k * 0.012, z));
  }

  // Ele olha para a direita dele — o mesmo três-quartos da referência. O giro
  // acontece no pescoço, depois de a cabeça estar montada.
  const turn = new THREE.Matrix4()
    .makeRotationY(-0.42)
    .premultiply(new THREE.Matrix4().makeTranslation(0, NECK_Y, 0));
  turn.multiply(new THREE.Matrix4().makeTranslation(0, -NECK_Y, 0));
  for (const piece of head) push(piece.applyMatrix4(turn));

  /* ---- scutum ----------------------------------------------------------- */
  // O escudo é o contrapeso da composição: uma superfície grande e lisa contra
  // o corpo todo frisado. Curvo de verdade, porque o meio-tom lê a virada da
  // face pela luz — um retângulo plano ficaria de papelão.
  const shield: THREE.BufferGeometry[] = [];
  const SHIELD_R = 0.33;
  const SHIELD_ARC = 1.02;
  const SHIELD_H = 0.56;
  shield.push(...curvedPlate(SHIELD_R, SHIELD_H, 0, SHIELD_ARC, 0.014));
  // Bordas: a moldura de bronze em cima e embaixo, e as duas costelas.
  for (const edge of [-1, 1]) {
    shield.push(
      ...curvedPlate(SHIELD_R + 0.002, 0.022, 0, SHIELD_ARC, 0.016).map((g) =>
        g.translate(0, (edge * (SHIELD_H - 0.022)) / 2, 0),
      ),
    );
  }
  const midAngle = SHIELD_ARC / 2;
  const outward = V(Math.sin(midAngle), 0, Math.cos(midAngle));
  const umboAt = outward.clone().multiplyScalar(SHIELD_R + 0.014);
  shield.push(
    new THREE.SphereGeometry(0.045, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55)
      .scale(1, 0.62, 1)
      .applyMatrix4(
        new THREE.Matrix4().makeBasis(
          V(0, 1, 0),
          outward,
          new THREE.Vector3().crossVectors(V(0, 1, 0), outward),
        ),
      )
      .translate(umboAt.x, 0, umboAt.z),
  );
  shield.push(
    limb(
      umboAt.clone(),
      umboAt.clone().addScaledVector(outward, -0.02),
      0.062,
      0.062,
      { segments: 24 },
    ),
  );
  const spine = box(0.024, SHIELD_H * 0.92, 0.012);
  shield.push(
    spine.applyMatrix4(
      new THREE.Matrix4()
        .makeRotationY(midAngle)
        .setPosition(umboAt.x * 0.99, 0, umboAt.z * 0.99),
    ),
  );

  // Assentado: girado para a face olhar quem vê, inclinado para trás e
  // encostado no ombro esquerdo dele.
  const shieldMatrix = new THREE.Matrix4()
    .makeTranslation(0.235, 0.47, 0.02)
    .multiply(new THREE.Matrix4().makeRotationZ(-0.13))
    .multiply(new THREE.Matrix4().makeRotationX(0.1))
    .multiply(new THREE.Matrix4().makeRotationY(-midAngle))
    .multiply(
      new THREE.Matrix4().makeTranslation(-umboAt.x * 0.55, 0, -umboAt.z * 0.55),
    );
  for (const piece of shield) push(piece.applyMatrix4(shieldMatrix));

  /* ---- gladius ---------------------------------------------------------- */
  const grip = arms[0]!.wrist.clone().add(V(0, -0.02, 0.01));
  push(limb(grip.clone().add(V(0, 0.05, 0)), grip.clone().add(V(0, -0.02, 0)), 0.016, 0.016, { segments: 10 }));
  push(new THREE.SphereGeometry(0.024, 14, 10).scale(1, 0.7, 1).translate(grip.x, grip.y + 0.062, grip.z));
  push(box(0.062, 0.014, 0.03).translate(grip.x, grip.y - 0.024, grip.z));
  const blade = box(0.03, 0.235, 0.011);
  blade.rotateX(-0.16);
  blade.translate(grip.x, grip.y - 0.145, grip.z + 0.024);
  push(blade);

  const merged = mergeGeometries(
    parts.map((part) => {
      part.deleteAttribute("uv");
      return part.index ? part.toNonIndexed() : part;
    }),
  );
  if (!merged) throw new Error("legionary: merge failed");
  merged.computeVertexNormals();
  merged.computeBoundingBox();
  return merged;
}
