import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * The Colosseum, built rather than downloaded.
 *
 * The previous GLB was an AI guess: up close it became a smooth wall, from
 * afar a smudge. This LP's halftone draws RECESS — it needs a real gap behind
 * the stone to have something to describe, and no shader gain invents
 * geometry that is not in the mesh. So the arcade is generated: each bay is a
 * real hole in an extruded plate, each pier has its half-column, and behind
 * the bays sit the gallery, the stepped cavea and the hypogeum — depth the
 * minimum filter converts into ink.
 *
 * Units: 1 = 100 m, base at y = 0 and centre at the origin. The measurements
 * are the monument's (188 × 156 × 48 m, 80 bays, four storeys).
 */

const BAYS = 80;
/** Semi-axes of the outer facade. */
const A = 0.94;
const B = 0.78;
/** Radial thickness of the facade plate. */
const WALL = 0.032;

/** Top of each storey. The attic is a blind wall with square windows. */
const LEVEL_TOPS = [0.105, 0.212, 0.319, 0.485] as const;
const CORNICE = 0.011;
/** Fraction of the cell the opening takes; the rest is pier. */
const OPENING_SHARE = 0.6;
/** Springing of the arch, as a fraction of the storey's clear height. */
const SPRING_SHARE = 0.52;

const ARENA_A = 0.4;
const ARENA_B = 0.24;
const ARENA_Y = 0.035;
/** Top of the cavea: where the seating meets the highest gallery. */
const CAVEA_TOP = 0.3;
const CAVEA_STEPS = 26;

/* Where the outer wall fell. The intact stretch on the north side is what
   separates the Colosseum from any old arcade: four storeys on one side, the
   two-storey inner ring on the other, with the step between them midway.

   The window is positioned against the azimuth in scene.tsx: the break falls
   inside the arc the camera sees, not on the silhouette, or the collapse
   happens out of frame. It is through this gap that the back ring and the
   cavea show. */
const INTACT_FROM = 77;
/** How many bays the intact facade covers starting at INTACT_FROM. The window
    wraps around the ring, so rotating the piece means moving only INTACT_FROM. */
const INTACT_BAYS = 36;

function surviving(bay: number): number {
  const rel = (((bay - INTACT_FROM) % BAYS) + BAYS) % BAYS;
  if (rel < INTACT_BAYS) return 4;
  const afterEnd = rel - INTACT_BAYS + 1;
  const beforeStart = BAYS - rel;
  const before = beforeStart <= afterEnd;
  const past = before ? beforeStart : afterEnd;
  // Steps, not a ramp: the ruin collapses in whole stretches of arcade, and
  // the odd tooth keeps the two sides from falling as mirror images.
  if (past <= 2) return 3;
  if (past <= (before ? 6 : 9)) return 2;
  return 1;
}

/** Point on the ellipse and the local frame: x tangential, y up, z outward. */
function frameAt(t: number, a: number, b: number) {
  const position = new THREE.Vector3(a * Math.cos(t), 0, b * Math.sin(t));
  const outward = new THREE.Vector3(b * Math.cos(t), 0, a * Math.sin(t)).normalize();
  const along = new THREE.Vector3(outward.z, 0, -outward.x);
  const basis = new THREE.Matrix4().makeBasis(along, new THREE.Vector3(0, 1, 0), outward);
  return { position, outward, basis };
}

/** Tangential width of a cell — the ellipse moves faster at the ends. */
function cellWidth(t: number, a: number, b: number) {
  const speed = Math.hypot(a * Math.sin(t), b * Math.cos(t));
  return (speed * Math.PI * 2) / BAYS;
}

function place(
  geometry: THREE.BufferGeometry,
  t: number,
  y: number,
  radialOffset: number,
  a = A,
  b = B,
) {
  const { position, outward, basis } = frameAt(t, a, b);
  const matrix = basis.clone();
  matrix.setPosition(
    position.x + outward.x * radialOffset,
    y,
    position.z + outward.z * radialOffset,
  );
  geometry.applyMatrix4(matrix);
  return geometry;
}

/** Plate of one bay: a rectangle with the arch (or window) truly cut out. */
function bayPanel(width: number, height: number, opening: null | {
  width: number;
  sill: number;
  head: number;
  arched: boolean;
}) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, height);
  shape.lineTo(-width / 2, height);
  shape.closePath();

  if (opening) {
    const half = opening.width / 2;
    const hole = new THREE.Path();
    hole.moveTo(-half, opening.sill);
    hole.lineTo(half, opening.sill);
    if (opening.arched) {
      hole.lineTo(half, opening.head - half);
      hole.absarc(0, opening.head - half, half, 0, Math.PI, false);
    } else {
      hole.lineTo(half, opening.head);
      hole.lineTo(-half, opening.head);
    }
    hole.closePath();
    shape.holes.push(hole);
  }

  return new THREE.ExtrudeGeometry(shape, {
    depth: WALL,
    bevelEnabled: false,
    curveSegments: 14,
  }).translate(0, 0, -WALL);
}

/** Continuous elliptical ring — cornice, plinth, cavea step. */
function ring(a: number, b: number, y: number, height: number, segments = 160) {
  return new THREE.CylinderGeometry(1, 1, height, segments, 1, true)
    .scale(a, 1, b)
    .translate(0, y + height / 2, 0);
}

/** Horizontal elliptical disc, facing up. */
function disc(a: number, b: number, y: number, segments = 96) {
  return new THREE.CircleGeometry(1, segments)
    .rotateX(-Math.PI / 2)
    .scale(a, 1, b)
    .translate(0, y, 0);
}

export function buildColosseum(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const step = (Math.PI * 2) / BAYS;

  for (let i = 0; i < BAYS; i++) {
    const t = i * step;
    const levels = surviving(i);
    const width = cellWidth(t, A, B);
    const opening = width * OPENING_SHARE;

    for (let level = 0; level < levels; level++) {
      const floor = level === 0 ? 0 : LEVEL_TOPS[level - 1]!;
      const top = LEVEL_TOPS[level]!;
      const height = top - floor - CORNICE;
      const attic = level === 3;

      // The attic is a blind wall: a square window in every other bay.
      const hole = attic
        ? i % 2 === 0
          ? { width: opening * 0.42, sill: height * 0.3, head: height * 0.62, arched: false }
          : null
        : {
            width: opening,
            sill: 0,
            head: height * SPRING_SHARE + opening / 2,
            arched: true,
          };

      parts.push(place(bayPanel(width, height, hole), t, floor, 0));

      // Archivolt: the raised moulding following the arch. It gives the bay
      // its edge — without it the halftone returns a dark rectangle instead
      // of an arch, because the only transition is the recess one.
      if (hole?.arched) {
        const half = hole.width / 2;
        const spring = hole.head - half;
        const ARCH_STONES = 11;
        for (let s = 0; s < ARCH_STONES; s++) {
          const phi = (Math.PI * (s + 0.5)) / ARCH_STONES;
          const stone = new THREE.BoxGeometry(
            (Math.PI * half) / ARCH_STONES + 0.002,
            0.009,
            WALL * 0.34,
          );
          stone.rotateZ(phi - Math.PI / 2);
          stone.translate(
            Math.cos(phi) * (half + 0.0045),
            floor + spring + Math.sin(phi) * (half + 0.0045),
            WALL * 0.17,
          );
          parts.push(place(stone, t, 0, 0));
        }
        // Imposts: the ledge where the arch springs, on each side of the bay.
        for (const side of [-1, 1]) {
          parts.push(
            place(
              new THREE.BoxGeometry(width * 0.16, 0.007, WALL * 0.4).translate(
                side * (half + width * 0.07),
                floor + spring,
                WALL * 0.2,
              ),
              t,
              0,
              0,
            ),
          );
        }
      }

      // Engaged half-column on the pier — the relief that makes the facade
      // read as superimposed orders rather than a wall with holes.
      if (!attic) {
        const column = new THREE.CylinderGeometry(width * 0.075, width * 0.075, height, 10, 1, true)
          .translate(0, height / 2, 0);
        parts.push(place(column, t - step / 2, floor, width * 0.045));
      } else {
        const pilaster = new THREE.BoxGeometry(width * 0.14, height, WALL * 0.5).translate(
          0,
          height / 2,
          WALL * 0.25,
        );
        parts.push(place(pilaster, t - step / 2, floor, 0));
      }
    }

    // Attic corbels: the brackets that held the velarium masts. A row of small
    // teeth at the top — the last line the eye reads before the sky, and what
    // keeps the attic from becoming a flat strip.
    if (levels === 4) {
      const corbel = new THREE.BoxGeometry(width * 0.1, 0.008, WALL * 0.9);
      parts.push(place(corbel, t - step / 2, LEVEL_TOPS[3]! - 0.03, WALL * 0.3));
    }

    // The ruin's break: the top slab does not end straight, it crumbles.
    if (levels < 4) {
      const top = LEVEL_TOPS[levels - 1]!;
      const rubble = new THREE.BoxGeometry(width * 0.9, width * (0.25 + 0.35 * ((i * 7) % 5) / 5), WALL);
      parts.push(place(rubble, t, top, -WALL / 2));
    }
  }

  // Cornices: a continuous band closing each surviving storey. The ground
  // floor's goes all the way round, the upper ones only where the wall stands.
  for (let level = 0; level < 4; level++) {
    const y = LEVEL_TOPS[level]! - CORNICE;
    const out = 0.006 * (level + 1);
    const full = level === 0;
    if (full) {
      parts.push(ring(A + out, B + out, y, CORNICE));
      continue;
    }
    for (let i = 0; i < BAYS; i++) {
      if (surviving(i) <= level) continue;
      const t = i * step;
      const width = cellWidth(t, A, B) * 1.06;
      const band = new THREE.BoxGeometry(width, CORNICE, WALL + out * 2).translate(
        0,
        CORNICE / 2,
        (out * 2 - WALL) / 2,
      );
      parts.push(place(band, t, y, 0));
    }
  }

  // Plinth and entrance step.
  parts.push(ring(A + 0.014, B + 0.014, -0.012, 0.014));

  // Inner gallery: the wall closing the back of the bays. Without it the arch
  // leaks into the paper and the recess has nothing to measure against.
  parts.push(ring(A - 0.075, B - 0.075, 0, LEVEL_TOPS[2]!));
  for (let i = 0; i < BAYS; i++) {
    const t = i * step + step / 2;
    const width = cellWidth(t, A - 0.075, B - 0.075);
    const pier = new THREE.BoxGeometry(width * 0.3, LEVEL_TOPS[1]!, 0.05).translate(0, LEVEL_TOPS[1]! / 2, 0);
    parts.push(place(pier, t, 0, -0.025, A - 0.075, B - 0.075));
  }

  // Cavea: the stepped seating, descending from the gallery to the arena.
  for (let s = 0; s < CAVEA_STEPS; s++) {
    const k = s / (CAVEA_STEPS - 1);
    const a = THREE.MathUtils.lerp(A - 0.085, ARENA_A + 0.02, k);
    const b = THREE.MathUtils.lerp(B - 0.085, ARENA_B + 0.02, k);
    const y = THREE.MathUtils.lerp(CAVEA_TOP, ARENA_Y + 0.01, k);
    const rise = (CAVEA_TOP - ARENA_Y) / CAVEA_STEPS;
    parts.push(ring(a, b, y - rise, rise * 1.4, 120));
  }

  // Arena and hypogeum: the grid of basement walls, exposed since the floor
  // went. It is the detail that shows above the low arcade on the ruined side.
  parts.push(disc(ARENA_A, ARENA_B, ARENA_Y - 0.03));
  parts.push(ring(ARENA_A, ARENA_B, ARENA_Y - 0.03, 0.03, 96));
  const cells = 11;
  for (let r = 0; r <= cells; r++) {
    const x = THREE.MathUtils.lerp(-ARENA_A, ARENA_A, r / cells);
    const halfB = ARENA_B * Math.sqrt(Math.max(0, 1 - (x / ARENA_A) ** 2));
    if (halfB < 0.02) continue;
    parts.push(
      new THREE.BoxGeometry(0.006, 0.026, halfB * 2 * 0.92)
        .translate(x, ARENA_Y - 0.03 + 0.013, 0),
    );
  }
  for (let r = 1; r < 5; r++) {
    const z = THREE.MathUtils.lerp(-ARENA_B, ARENA_B, r / 5);
    const halfA = ARENA_A * Math.sqrt(Math.max(0, 1 - (z / ARENA_B) ** 2));
    parts.push(
      new THREE.BoxGeometry(halfA * 2 * 0.94, 0.02, 0.006)
        .translate(0, ARENA_Y - 0.03 + 0.01, z),
    );
  }

  const merged = mergeGeometries(
    parts.map((part) => {
      part.deleteAttribute("uv");
      return part.index ? part.toNonIndexed() : part;
    }),
  );
  if (!merged) throw new Error("colosseum: merge failed");
  merged.computeVertexNormals();
  merged.computeBoundingBox();
  return merged;
}
