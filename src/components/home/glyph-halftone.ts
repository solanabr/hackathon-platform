import * as THREE from "three";

export const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export const ATLAS_COLS = 8;
export const ATLAS_CELL = 64;

/* The atlas stores a distance field, not the character's flat coverage. A
   bitmap has no inner gradient: the threshold only bites the antialiased edge
   and the glyph always comes out the same thickness. With distance, threshold
   becomes weight — tone can fatten and thin the stroke like a variable font. */
const SDF_SPREAD = 4;

function chamferDistance(seed: Uint8Array, size: number) {
  const INF = 1e9;
  const d = new Float32Array(size * size);
  for (let i = 0; i < d.length; i++) d[i] = seed[i] ? 0 : INF;
  const diagonal = Math.SQRT2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      let v = d[i]!;
      if (y > 0) {
        v = Math.min(v, d[i - size]! + 1);
        if (x > 0) v = Math.min(v, d[i - size - 1]! + diagonal);
        if (x < size - 1) v = Math.min(v, d[i - size + 1]! + diagonal);
      }
      if (x > 0) v = Math.min(v, d[i - 1]! + 1);
      d[i] = v;
    }
  }
  for (let y = size - 1; y >= 0; y--) {
    for (let x = size - 1; x >= 0; x--) {
      const i = y * size + x;
      let v = d[i]!;
      if (y < size - 1) {
        v = Math.min(v, d[i + size]! + 1);
        if (x > 0) v = Math.min(v, d[i + size - 1]! + diagonal);
        if (x < size - 1) v = Math.min(v, d[i + size + 1]! + diagonal);
      }
      if (x < size - 1) v = Math.min(v, d[i + 1]! + 1);
      d[i] = v;
    }
  }
  return d;
}

export function buildGlyphAtlas(): THREE.CanvasTexture {
  const rows = Math.ceil(BASE58.length / ATLAS_COLS);
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_COLS * ATLAS_CELL;
  canvas.height = rows * ATLAS_CELL;

  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(ATLAS_CELL * 0.78)}px ui-monospace, SFMono-Regular, Menlo, monospace`;

  for (let i = 0; i < BASE58.length; i++) {
    const cx = (i % ATLAS_COLS) * ATLAS_CELL + ATLAS_CELL / 2;
    const cy = Math.floor(i / ATLAS_COLS) * ATLAS_CELL + ATLAS_CELL / 2;
    ctx.fillText(BASE58[i]!, cx, cy);
  }

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = image.data;
  const inside = new Uint8Array(ATLAS_CELL * ATLAS_CELL);
  const outside = new Uint8Array(ATLAS_CELL * ATLAS_CELL);

  // Per cell, not over the whole atlas: distance must not leak from one
  // character into its neighbour.
  for (let g = 0; g < BASE58.length; g++) {
    const ox = (g % ATLAS_COLS) * ATLAS_CELL;
    const oy = Math.floor(g / ATLAS_COLS) * ATLAS_CELL;
    for (let y = 0; y < ATLAS_CELL; y++) {
      for (let x = 0; x < ATLAS_CELL; x++) {
        const on = pixels[((oy + y) * canvas.width + ox + x) * 4 + 3]! > 127 ? 1 : 0;
        inside[y * ATLAS_CELL + x] = on;
        outside[y * ATLAS_CELL + x] = on ? 0 : 1;
      }
    }
    const toInk = chamferDistance(inside, ATLAS_CELL);
    const toVoid = chamferDistance(outside, ATLAS_CELL);
    for (let y = 0; y < ATLAS_CELL; y++) {
      for (let x = 0; x < ATLAS_CELL; x++) {
        const local = y * ATLAS_CELL + x;
        const signed = toVoid[local]! - toInk[local]!;
        const value = Math.max(0, Math.min(1, 0.5 + signed / (2 * SDF_SPREAD)));
        const at = ((oy + y) * canvas.width + ox + x) * 4;
        pixels[at] = Math.round(value * 255);
        pixels[at + 1] = 0;
        pixels[at + 2] = 0;
        pixels[at + 3] = 255;
      }
    }
  }
  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/* Glyph choice comes from position in the sequence, never from density — what
   keeps the field from becoming character soup with the right average ink. */
export function buildSignatureTexture(buffer: string): THREE.DataTexture {
  const width = Math.min(buffer.length, 4096);
  const data = new Uint8Array(width * 4);
  for (let i = 0; i < width; i++) {
    const index = BASE58.indexOf(buffer[i]!);
    data[i * 4] = index < 0 ? 0 : index;
    data[i * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, width, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

const FULLSCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/* Step 1 — reduce scene and depth to the cell grid. Keeps the block's largest
   and smallest depth separately: reducing to the minimum alone would erase the
   gap inside the cell, which is exactly what needs to become ink. */
export const CELL_REDUCE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tDepth;
uniform sampler2D tScene;
uniform vec2 uResolution;
uniform float uCell;
uniform float uNear;
uniform float uFar;

float viewZAt(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  if (d >= 1.0) return -1e9;
  return (2.0 * uNear * uFar) / (uFar + uNear - (d * 2.0 - 1.0) * (uFar - uNear));
}

void main() {
  vec2 cellOrigin = floor(vUv * uResolution / uCell) * uCell;
  float nearest = 1e9;
  float total = 0.0;
  float shade = 0.0;
  float hit = 0.0;
  for (int y = 0; y < 8; y++) {
    for (int x = 0; x < 8; x++) {
      vec2 px = cellOrigin + (vec2(float(x), float(y)) + 0.5) * (uCell / 8.0);
      vec2 uv = px / uResolution;
      float z = viewZAt(uv);
      if (z > 0.0) {
        nearest = min(nearest, z);
        total += z;
        shade += texture2D(tScene, uv).r;
        hit += 1.0;
      }
    }
  }
  if (hit < 0.5) {
    // No geometry: max depth goes to zero and min depth to infinity so it
    // does not contaminate the neighbourhood filter.
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1e9);
    return;
  }
  // .r is the cell's MEAN depth, .a the depth of the frontmost stone. Mean,
  // not max: with max, any cell touching the edge of a gap jumps to the back
  // and the whole field saturates.
  gl_FragColor = vec4(total / hit, shade / hit, 1.0, nearest);
}
`;

/* Steps 2 and 3 — separable minimum of stone depth over the neighbourhood. They
   run at cell resolution, cost nothing, and are what turns "sits behind its
   neighbour" into ink. */
export const MIN_BLUR_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tCell;
uniform vec2 uCellResolution;
uniform vec2 uDirection;
uniform float uRadius;

void main() {
  vec4 base = texture2D(tCell, vUv);
  float smallest = base.a;
  for (int i = 1; i <= 6; i++) {
    float o = float(i);
    if (o > uRadius) break;
    vec2 step = uDirection * o / uCellResolution;
    smallest = min(smallest, texture2D(tCell, vUv + step).a);
    smallest = min(smallest, texture2D(tCell, vUv - step).a);
  }
  gl_FragColor = vec4(base.r, base.g, base.b, smallest);
}
`;

/* Final step — the depth field comes out in the SAME stroke as halftoneMarks():
   horizontal dash on the grid, length modulated by tone, two weights, same
   noise floor. We tried emitting one base58 character per cell and got soup:
   58 different shapes at 8px are high-frequency noise that destroys the tone
   field instead of carrying it. The hash goes where it is read, not as texture. */
export const HALFTONE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tCell;
uniform sampler2D tMin;
uniform vec2 uResolution;
uniform vec2 uCellResolution;
uniform float uCell;
uniform vec3 uInk;
uniform vec3 uSurface;
/* 1 = the pass paints its own paper; 0 = only the stroke comes out, in
   premultiplied alpha, and whatever is behind the canvas shows through. */
uniform float uPaper;
uniform float uFadeStart;
uniform float uFadeEnd;
uniform float uRecessDeadZone;
uniform float uRecessDepth;
uniform float uToneFloor;
uniform float uRecessGain;
uniform float uFormGain;

float hash(vec2 p, float salt) {
  return fract(sin(dot(p + salt, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 fragPx = vUv * uResolution;
  vec2 cell = floor(fragPx / uCell);
  vec2 cellUv = (cell + 0.5) / uCellResolution;

  vec4 packed = texture2D(tCell, cellUv);
  if (packed.b < 0.5) {
    gl_FragColor = vec4(uSurface * uPaper, uPaper);
    return;
  }

  float nearest = texture2D(tMin, cellUv).a;
  // Log scale, not linear: in perspective the depth difference is
  // multiplicative, and between stone and gap it varies by a factor of ~30.
  float delta = max(packed.r - nearest, 1e-6);
  float recess = clamp(log(delta / uRecessDeadZone) / log(uRecessDepth / uRecessDeadZone), 0.0, 1.0);
  float form = 1.0 - packed.g;
  // The three gains are the only difference between an arcade piece and a
  // solid one: in the arcade tone comes from the gap (recess), a trophy has no
  // gap at all and light draws the volume (form). Anchored to the same two
  // values as the 2D component: stone at 0.26, gap at 0.95.
  float tone = clamp(uToneFloor + uRecessGain * pow(recess, 1.15) + uFormGain * form * (1.0 - recess), 0.0, 1.0);

  // v grows bottom to top: the dissolve distance is measured from the top.
  float fromTop = 1.0 - fragPx.y / uResolution.y;
  float ramp = clamp((fromTop - uFadeStart) / (uFadeEnd - uFadeStart), 0.0, 1.0);
  tone *= 0.5 + 0.5 * pow(ramp, 1.2);

  if (tone < 0.05 + hash(cell, 0.0) * 0.11) {
    gl_FragColor = vec4(uSurface * uPaper, uPaper);
    return;
  }

  // The reference grid is the one from halftoneMarks(): the dash grows from
  // 0.4 to 7.9 in an 8 cell, and the weight jumps from 1.6 to 3.0 at tone > 0.7.
  const float UNIT = 8.0;
  float length01 = (0.4 + pow(tone, 1.2) * (UNIT - 0.5)) / UNIT;
  float weight01 = (tone > 0.7 ? 3.0 : 1.6) / UNIT;

  vec2 jitter = vec2(hash(cell, 1.0) - 0.5, hash(cell, 2.0) - 0.5) * vec2(0.8, 0.5) / UNIT;
  vec2 inCell = (fragPx - cell * uCell) / uCell;
  vec2 p = inCell - (vec2(0.5) + jitter);

  // Capsule, not rectangle: the SVG stroke has round caps.
  float span = max(length01 * 0.5 - weight01 * 0.5, 0.0);
  p.x = max(abs(p.x) - span, 0.0);
  float dist = length(p);

  float aa = 0.5 / uCell;
  float ink = 1.0 - smoothstep(weight01 * 0.5 - aa, weight01 * 0.5 + aa, dist);

  gl_FragColor = mix(
    vec4(uInk * ink, ink),
    vec4(mix(uSurface, uInk, ink), 1.0),
    uPaper
  );
}
`;

export { FULLSCREEN_VERT };
