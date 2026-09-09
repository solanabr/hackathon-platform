import * as THREE from "three";

export const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export const ATLAS_COLS = 8;
export const ATLAS_CELL = 64;

/* O atlas guarda um campo de distância, não a cobertura chapada do caractere.
   Um bitmap não tem gradiente interno: o limiar só morde a borda antialiasada e
   o glifo sai sempre com a mesma espessura. Com distância, o limiar vira peso —
   é o que deixa o tom engordar e afinar o traço como uma fonte variável. */
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

  // Por célula, não pelo atlas inteiro: a distância não pode vazar de um
  // caractere para o vizinho.
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

/* A escolha do glifo vem da posição na sequência, nunca da densidade — é isso
   que impede o campo de virar sopa de caractere com a média certa de tinta. */
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

/* Passo 1 — reduz cena e profundidade para a grade de célula. Guarda a maior e
   a menor profundidade do bloco separadamente: reduzir só ao mínimo apagaria o
   vão dentro da célula, que é justamente o que precisa virar tinta. */
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
    // Sem geometria: profundidade máxima zera e a mínima vai ao infinito para
    // não contaminar o filtro de vizinhança.
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1e9);
    return;
  }
  // .r é a profundidade MÉDIA da célula, .a a da pedra mais à frente. A média,
  // e não o máximo: com o máximo qualquer célula que encoste na borda de um vão
  // salta para o fundo e o campo inteiro satura.
  gl_FragColor = vec4(total / hit, shade / hit, 1.0, nearest);
}
`;

/* Passos 2 e 3 — mínimo separável da profundidade da pedra na vizinhança. Rodam
   em resolução de célula, custam nada, e são o que transforma "está atrás do
   vizinho" em tinta. */
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

/* Passo final — o hash É o meio-tom. O tom define o peso do glifo, nunca qual
   glifo. Curva e piso de ruído são os mesmos de halftoneMarks(), para o campo
   de densidade bater com o resto da página. */
export const GLYPH_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tCell;
uniform sampler2D tMin;
uniform sampler2D tGlyphs;
uniform sampler2D tSignature;
uniform vec2 uResolution;
uniform vec2 uCellResolution;
uniform float uCell;
uniform float uSignatureLength;
uniform float uAtlasCols;
uniform float uAtlasRows;
uniform vec3 uInk;
uniform vec3 uSurface;
uniform float uFadeStart;
uniform float uFadeEnd;

uniform float uRecessDeadZone;
uniform float uRecessDepth;
uniform float uReverseStart;
uniform float uReverseEnd;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 fragPx = vUv * uResolution;
  vec2 cell = floor(fragPx / uCell);
  vec2 cellUv = (cell + 0.5) / uCellResolution;

  vec4 packed = texture2D(tCell, cellUv);
  if (packed.b < 0.5) {
    gl_FragColor = vec4(uSurface, 1.0);
    return;
  }

  float nearest = texture2D(tMin, cellUv).a;
  // Escala log, não linear: em perspectiva a diferença de profundidade é
  // multiplicativa, e entre a pedra e o vão ela varia por um fator de ~30. Uma
  // rampa linear ou achata a pedra ou satura o vão — nunca as duas coisas.
  float delta = max(packed.r - nearest, 1e-6);
  float recess = clamp(log(delta / uRecessDeadZone) / log(uRecessDepth / uRecessDeadZone), 0.0, 1.0);
  float form = 1.0 - packed.g;
  // Expoente acima de 1 empurra a pedra para baixo em vez de levantá-la: sem
  // isso o contraste pedra/vão fica menor que o da própria rampa vertical, e a
  // peça lê como gradiente antes de ler como prédio.
  float tone = clamp(0.02 + 0.94 * pow(recess, 1.3) + 0.10 * form * (1.0 - recess), 0.0, 1.0);

  // O topo dissolve no creme, como no backdrop 2D: sem isso a peça termina numa
  // silhueta dura em vez de virar página.
  // v cresce de baixo para cima: a distância a dissolver é medida do topo.
  float fromTop = 1.0 - fragPx.y / uResolution.y;
  float ramp = clamp((fromTop - uFadeStart) / (uFadeEnd - uFadeStart), 0.0, 1.0);
  tone *= 0.35 + 0.65 * pow(ramp, 1.2);

  if (tone < 0.05 + hash(cell) * 0.11) {
    gl_FragColor = vec4(uSurface, 1.0);
    return;
  }

  float linear = cell.y * uCellResolution.x + cell.x;
  float sigU = (mod(linear, uSignatureLength) + 0.5) / uSignatureLength;
  float glyph = floor(texture2D(tSignature, vec2(sigU, 0.5)).r * 255.0 + 0.5);

  vec2 atlasCell = vec2(mod(glyph, uAtlasCols), floor(glyph / uAtlasCols));
  vec2 inCell = (fragPx - cell * uCell) / uCell;

  // Tom leve encolhe o glifo dentro da célula; tom pesado enche. Mesma ideia do
  // comprimento do risco em halftoneMarks(), só que em duas dimensões.
  float scale = 0.46 + 0.54 * pow(tone, 0.85);
  vec2 local = (inCell - 0.5) / scale + 0.5;
  float coverage = 0.0;
  if (local.x >= 0.0 && local.x <= 1.0 && local.y >= 0.0 && local.y <= 1.0) {
    vec2 atlasUv = (atlasCell + local) / vec2(uAtlasCols, uAtlasRows);
    coverage = texture2D(tGlyphs, atlasUv).r;
  }

  // Limiar alto = só o miolo do caractere imprime (traço fino); limiar baixo =
  // glifo cheio. O tom move o limiar, e é assim que o peso passa a carregar tom.
  float threshold = mix(0.72, 0.46, pow(tone, 1.1));
  float glyphInk = smoothstep(threshold - 0.035, threshold + 0.035, coverage);

  // Um caractere cobre ~30% da célula: sozinho o meio-tom de hash nunca fecha o
  // vão do arco. Acima do cruzamento entra um bloco de ÁREA proporcional ao tom,
  // com a assinatura vazada dentro. É a área que modula — meio-tom de verdade,
  // não mosaico, exatamente como o comprimento do risco modula em halftoneMarks().
  float blockArea = smoothstep(uReverseStart, uReverseEnd, tone);
  vec2 fromCentre = abs(inCell - 0.5);
  float squircle = pow(pow(fromCentre.x, 4.0) + pow(fromCentre.y, 4.0), 0.25);
  // Com área exata sobra creme entre células vizinhas e uma sombra contínua lê
  // como xadrez. O ganho faz os blocos encostarem antes do tom cheio — é o que o
  // meio-tom de traço já faz quando o risco cobre a célula inteira e as linhas
  // se encontram.
  float blockHalf = min(0.5 * sqrt(blockArea) * 1.32, 0.72);
  float aa = 0.6 / uCell;
  float block = step(0.001, blockArea) *
    (1.0 - smoothstep(blockHalf - aa, blockHalf + aa, squircle));

  // Dentro do bloco a tinta é o negativo do glifo; fora, o próprio glifo.
  float ink = mix(glyphInk, 1.0 - glyphInk, block);

  gl_FragColor = vec4(mix(uSurface, uInk, ink), 1.0);
}
`;

export { FULLSCREEN_VERT };
