import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * The legionary, built rather than downloaded — for the same reason as the
 * Colosseum.
 *
 * This LP's halftone draws RECESS: it needs a real gap behind the matter to
 * have something to describe. A photo of armour becomes a smudge; a generic
 * soldier GLB becomes a smooth doll. But the lorica segmentata is literally
 * an arcade worn as clothing — metal bands with a slit between them,
 * concentric shoulder guards, the apron of straps hanging from the belt. Each
 * of those slits is the same gap as the arch: the minimum filter turns it
 * into ink on its own.
 *
 * That is why the piece is generated band by band instead of sculpted: where
 * there is a slit, it is a slit, not painted shadow.
 *
 * Units: 1 = the man's height. Feet at y = 0, top of the crest at y ≈ 1.06.
 * He faces +Z; the sword hand is at -X (his right) and the shield at +X
 * (his left) — which is the viewer's right.
 */

const SEG = 14;

const SHOULDER_Y = 0.815;
const CHEST_TOP = 0.8;
const WAIST_Y = 0.615;
const HIP_Y = 0.5;
const KNEE_Y = 0.27;
const ANKLE_Y = 0.05;
const NECK_Y = 0.855;

/** Half-profile of the torso: wide chest on top, narrow waist below. */
function girth(y: number) {
  const k = THREE.MathUtils.clamp((y - WAIST_Y) / (CHEST_TOP - WAIST_Y), 0, 1);
  return {
    wide: THREE.MathUtils.lerp(0.108, 0.138, k),
    deep: THREE.MathUtils.lerp(0.076, 0.098, k),
  };
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Truncated cone between two points — limb, sword grip, pole. */
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

/** Elliptical ring on a vertical axis: a lorica band, the belt, the collar. */
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

/** Curved plate — the shield and the breastplate come from here. */
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

  /* ---- legs ------------------------------------------------------------ */
  // Short contrapposto: the sword leg planted, the shield leg half a step
  // forward. Without it the silhouette reads as a toy sentry, the two shins
  // parallel and merging into a single column in the halftone.
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
    // Caliga: thick sole and the crossed lacing, which reads as three slits.
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

  /* ---- tunic and apron ------------------------------------------------- */
  push(
    new THREE.CylinderGeometry(0.112, 0.142, 0.17, 40, 1, true).translate(
      0,
      0.525,
      0,
    ),
  );
  // Cingulum: the straps hanging from the belt. The cheapest detail to build
  // and the one that pays off most — five vertical slits right where the body
  // is pure mass, exactly where light alone would draw nothing.
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
  // Seven metal girdles, each mounted over the one below. The pitch is 0.026
  // with a 0.021 band: that leaves 5 thousandths of slit, inside the range the
  // recess dead zone sees at this camera distance.
  const BANDS = 7;
  for (let i = 0; i < BANDS; i++) {
    const y = WAIST_Y + i * 0.026;
    const { wide, deep } = girth(y);
    push(girdle(y, 0.021, wide, deep, 1.05));
  }
  // Belt, and the chest plate closing the lorica at the top.
  push(girdle(WAIST_Y - 0.028, 0.028, 0.114, 0.081, 1.0));
  const top = girth(CHEST_TOP);
  push(girdle(CHEST_TOP, 0.052, top.wide * 0.98, top.deep, 0.99));
  push(girdle(CHEST_TOP + 0.05, 0.02, top.wide * 0.86, top.deep * 0.9, 0.95));
  // Central rosette: the worked disc in the middle of the chest. One round
  // relief in a field of horizontal bands — it is what keeps the torso from
  // reading as a window blind.
  push(
    new THREE.CylinderGeometry(0.026, 0.03, 0.012, 20)
      .rotateX(Math.PI / 2)
      .translate(0, CHEST_TOP + 0.024, top.deep * 0.99),
  );
  // Balteus: the gladius strap crossing the chest diagonally.
  const baldric = box(0.028, 0.3, 0.012);
  baldric.rotateZ(0.42);
  baldric.translate(-0.012, CHEST_TOP - 0.06, top.deep * 0.96);
  push(baldric);

  /* ---- shoulder guards and arms ---------------------------------------- */
  const arms = [
    { side: -1, elbow: V(-0.163, 0.6, 0.026), wrist: V(-0.158, 0.44, 0.072) },
    { side: 1, elbow: V(0.172, 0.605, 0.01), wrist: V(0.205, 0.47, 0.055) },
  ];
  for (const arm of arms) {
    const shoulder = V(arm.side * 0.118, SHOULDER_Y - 0.01, 0);
    // Shoulder guard: four concentric rings descending from the neck to the
    // deltoid, each smaller than the last. The arcade again — only wrapped
    // around the shoulder instead of stretched along the facade.
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
  // Manica on the sword forearm: six more slits, narrow this time, so the arm
  // does not run down to the hand as a smooth tube.
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

  /* ---- head and galea --------------------------------------------------- */
  const head: THREE.BufferGeometry[] = [];
  head.push(limb(V(0, NECK_Y + 0.03, 0), V(0, NECK_Y - 0.02, 0), 0.034, 0.042));
  head.push(
    new THREE.SphereGeometry(0.056, 22, 18)
      .scale(0.86, 1, 0.95)
      .translate(0, 0.925, 0.004),
  );
  // Nose and brow: two minimal reliefs, but without them the profile inside
  // the helmet reads as an egg. Nobody will count the features; the eye only
  // needs to know there is a face turned aside.
  head.push(
    box(0.016, 0.03, 0.03)
      .rotateX(-0.25)
      .translate(0, 0.918, 0.056),
  );
  head.push(box(0.06, 0.012, 0.018).translate(0, 0.948, 0.05));
  // Skull cap, brim and neck guard.
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
  // Cheek pieces: the two hinged flaps, opened outward.
  for (const side of [-1, 1]) {
    const cheek = box(0.014, 0.072, 0.05);
    cheek.rotateZ(side * 0.16);
    cheek.rotateY(side * 0.2);
    cheek.translate(side * 0.055, 0.9, 0.014);
    head.push(cheek);
  }
  // Crest: a comb of thin blades, not a block. A block would return a flat
  // fin; blades with a slit between them are the only way the halftone can
  // write "mane" instead of "plate".
  const BLADES = 26;
  for (let i = 0; i < BLADES; i++) {
    const k = i / (BLADES - 1);
    const arc = Math.sin(Math.PI * Math.min(1, k * 1.12));
    const height = 0.055 + arc * 0.055;
    const z = 0.05 - k * 0.145;
    const blade = box(0.007, height, 0.011);
    head.push(blade.translate(0, 0.985 + height / 2 - 0.03 - k * 0.012, z));
  }

  // He looks to his right — the same three-quarter as the reference. The turn
  // happens at the neck, after the head is assembled.
  const turn = new THREE.Matrix4()
    .makeRotationY(-0.42)
    .premultiply(new THREE.Matrix4().makeTranslation(0, NECK_Y, 0));
  turn.multiply(new THREE.Matrix4().makeTranslation(0, -NECK_Y, 0));
  for (const piece of head) push(piece.applyMatrix4(turn));

  /* ---- scutum ----------------------------------------------------------- */
  // The shield is the composition's counterweight: one large smooth surface
  // against a body that is all ridges. Truly curved, because the halftone reads
  // the turn of the face through light — a flat rectangle would be cardboard.
  const shield: THREE.BufferGeometry[] = [];
  const SHIELD_R = 0.33;
  const SHIELD_ARC = 1.02;
  const SHIELD_H = 0.56;
  shield.push(...curvedPlate(SHIELD_R, SHIELD_H, 0, SHIELD_ARC, 0.014));
  // Edges: the bronze rim top and bottom, and the two ribs.
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

  // Seated: rotated so the face looks at the viewer, tilted back and resting
  // against his left shoulder.
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
