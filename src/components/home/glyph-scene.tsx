"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { readMotionSeconds } from "@/lib/motion";
import {
  CELL_REDUCE_FRAG,
  FULLSCREEN_VERT,
  HALFTONE_FRAG,
  MIN_BLUR_FRAG,
} from "@/components/home/glyph-halftone";

const SHADE_VERT = /* glsl */ `
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SHADE_FRAG = /* glsl */ `
precision highp float;
varying vec3 vNormal;
uniform vec3 uLight;
void main() {
  float lambert = max(dot(normalize(vNormal), uLight), 0.0);
  gl_FragColor = vec4(vec3(lambert), 1.0);
}
`;

function readRgb(value: string, fallback: [number, number, number]) {
  const parts = value.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return fallback;
  return [Number(parts[0]) / 255, Number(parts[1]) / 255, Number(parts[2]) / 255] as [
    number,
    number,
    number,
  ];
}

export type GlyphSceneProps = {
  modelUrl: string;
  /** Ponto que a câmera olha, em unidades do modelo. */
  target: [number, number, number];
  /** Distância da câmera ao alvo. */
  radius: number;
  /** Altura da órbita, em radianos. */
  elevation: number;
  fovRadians: number;
  azimuth: number;
  /** Quanto o azimute anda com o ponteiro, em radianos. */
  azimuthSwing?: number;
  /** Giro contínuo, em radianos por segundo. Zero deixa a peça parada. */
  spin?: number;
  /** Lado da célula do meio-tom, em px de CSS. */
  cell?: number;
  light?: [number, number, number];
  /** Piso de tinta, ganho do recesso e ganho da luz — a assinatura da peça. */
  toneFloor?: number;
  recessGain?: number;
  formGain?: number;
  recessDeadZone?: number;
  recessDepth?: number;
  minRadiusCells?: number;
  /** Dissolve medido do topo do quadro: 0..1 do começo ao fim da rampa. */
  fadeStart?: number;
  fadeEnd?: number;
  className?: string;
};

/* Um só pipeline de meio-tom para qualquer peça 3D da LP: render de luz em
   alvo próprio, redução por célula, mínimo separável da vizinhança e o traço
   final na mesma grade do halftone 2D. O que muda de uma peça para outra é
   enquadramento e os três ganhos de tom — não o caminho de render. */
export default function GlyphScene({
  modelUrl,
  target,
  radius,
  elevation,
  fovRadians,
  azimuthSwing = 0,
  azimuth,
  spin = 0,
  cell = 8,
  light = [-0.55, 0.52, 0.65],
  toneFloor = 0.26,
  recessGain = 0.69,
  formGain = 0.08,
  recessDeadZone = 0.004,
  recessDepth = 0.09,
  minRadiusCells = 2,
  fadeStart = 0,
  fadeEnd = 0.5,
  className = "h-full w-full bg-surface text-ink",
}: GlyphSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const canvas = document.createElement("canvas");
    canvas.className = "block h-full w-full";
    host.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
    // Linear, não sRGB: o shader já quantiza a luminância, e qualquer gama
    // aplicada antes dele torce a rampa de tom contra o meio-tom 2D.
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;

    const focus = new THREE.Vector3(...target);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      THREE.MathUtils.radToDeg(fovRadians),
      1,
      0.05,
      12,
    );

    const shadeMaterial = new THREE.ShaderMaterial({
      vertexShader: SHADE_VERT,
      fragmentShader: SHADE_FRAG,
      uniforms: { uLight: { value: new THREE.Vector3(...light).normalize() } },
    });
    scene.overrideMaterial = shadeMaterial;

    const style = getComputedStyle(host);
    const ink = readRgb(style.color, [0.106, 0.137, 0.114]);
    const surface = readRgb(style.backgroundColor, [0.961, 0.945, 0.91]);

    const sceneTarget = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      colorSpace: THREE.NoColorSpace,
      depthBuffer: true,
      stencilBuffer: false,
    });
    sceneTarget.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);

    const cellOptions = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      colorSpace: THREE.NoColorSpace,
      depthBuffer: false,
      stencilBuffer: false,
    } as const;
    const cellTarget = new THREE.WebGLRenderTarget(1, 1, cellOptions);
    const minXTarget = new THREE.WebGLRenderTarget(1, 1, cellOptions);
    const minTarget = new THREE.WebGLRenderTarget(1, 1, cellOptions);

    const reduceMaterial = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: CELL_REDUCE_FRAG,
      uniforms: {
        tDepth: { value: sceneTarget.depthTexture },
        tScene: { value: sceneTarget.texture },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uCell: { value: cell },
        uNear: { value: camera.near },
        uFar: { value: camera.far },
      },
    });

    const minMaterial = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: MIN_BLUR_FRAG,
      uniforms: {
        tCell: { value: null },
        uCellResolution: { value: new THREE.Vector2(1, 1) },
        uDirection: { value: new THREE.Vector2(1, 0) },
        uRadius: { value: minRadiusCells },
      },
    });

    const glyphMaterial = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: HALFTONE_FRAG,
      uniforms: {
        tCell: { value: cellTarget.texture },
        tMin: { value: minTarget.texture },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uCellResolution: { value: new THREE.Vector2(1, 1) },
        uCell: { value: cell },
        uInk: { value: new THREE.Vector3(...ink) },
        uSurface: { value: new THREE.Vector3(...surface) },
        uFadeStart: { value: fadeStart },
        uFadeEnd: { value: fadeEnd },
        uRecessDeadZone: { value: recessDeadZone },
        uRecessDepth: { value: recessDepth },
        uToneFloor: { value: toneFloor },
        uRecessGain: { value: recessGain },
        uFormGain: { value: formGain },
      },
    });

    const quad = new FullScreenQuad(reduceMaterial);

    let disposed = false;
    let raf = 0;
    let model: THREE.Group | null = null;

    const pointer = { target: 0, current: 0 };
    const smoothing = 1 - Math.exp(-1 / (readMotionSeconds("--dur-toque", 0.62) * 60));

    const onPointerMove = (event: PointerEvent) => {
      pointer.target = (event.clientX / window.innerWidth) * 2 - 1;
    };
    if (azimuthSwing) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    let width = 0;
    let height = 0;
    let cellWidth = 0;
    let cellHeight = 0;
    let cellPx = cell;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = host!.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.round(rect.width * dpr));
      const nextHeight = Math.max(1, Math.round(rect.height * dpr));
      if (nextWidth === width && nextHeight === height) return;

      width = nextWidth;
      height = nextHeight;
      cellPx = cell * dpr;
      cellWidth = Math.max(1, Math.ceil(width / cellPx));
      cellHeight = Math.max(1, Math.ceil(height / cellPx));

      renderer.setPixelRatio(1);
      renderer.setSize(width, height, false);
      sceneTarget.setSize(width, height);
      cellTarget.setSize(cellWidth, cellHeight);
      minXTarget.setSize(cellWidth, cellHeight);
      minTarget.setSize(cellWidth, cellHeight);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      reduceMaterial.uniforms.uResolution!.value.set(width, height);
      reduceMaterial.uniforms.uCell!.value = cellPx;
      minMaterial.uniforms.uCellResolution!.value.set(cellWidth, cellHeight);
      glyphMaterial.uniforms.uResolution!.value.set(width, height);
      glyphMaterial.uniforms.uCellResolution!.value.set(cellWidth, cellHeight);
      glyphMaterial.uniforms.uCell!.value = cellPx;
    }

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let spun = 0;
    let last = 0;

    function frame(now: number) {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      if (!model) return;

      // Segundos reais, não um passo por quadro: num monitor de 120Hz a peça
      // giraria no dobro da velocidade.
      const delta = last ? Math.min((now - last) / 1000, 1 / 15) : 0;
      last = now;
      spun += spin * delta;

      pointer.current += (pointer.target - pointer.current) * smoothing;
      const heading = azimuth + spun + pointer.current * azimuthSwing;
      camera.position.set(
        focus.x + radius * Math.cos(elevation) * Math.sin(heading),
        focus.y + radius * Math.sin(elevation),
        focus.z + radius * Math.cos(elevation) * Math.cos(heading),
      );
      camera.lookAt(focus);

      renderer.setRenderTarget(sceneTarget);
      renderer.setClearColor(0x000000, 1);
      renderer.clear();
      renderer.render(scene, camera);

      quad.material = reduceMaterial;
      renderer.setRenderTarget(cellTarget);
      quad.render(renderer);

      quad.material = minMaterial;
      minMaterial.uniforms.tCell!.value = cellTarget.texture;
      minMaterial.uniforms.uDirection!.value.set(1, 0);
      renderer.setRenderTarget(minXTarget);
      quad.render(renderer);

      minMaterial.uniforms.tCell!.value = minXTarget.texture;
      minMaterial.uniforms.uDirection!.value.set(0, 1);
      renderer.setRenderTarget(minTarget);
      quad.render(renderer);

      quad.material = glyphMaterial;
      renderer.setRenderTarget(null);
      quad.render(renderer);
    }

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader
      .loadAsync(modelUrl)
      .then((gltf) => {
        if (disposed) return;
        model = gltf.scene;
        scene.add(model);
        raf = requestAnimationFrame(frame);
      })
      .catch(() => {
        /* O desenho 2D continua atrás: falha de carga degrada para ele. */
      });

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      quad.dispose();
      shadeMaterial.dispose();
      reduceMaterial.dispose();
      minMaterial.dispose();
      glyphMaterial.dispose();
      sceneTarget.depthTexture?.dispose();
      sceneTarget.dispose();
      cellTarget.dispose();
      minXTarget.dispose();
      minTarget.dispose();
      model?.traverse((node) => {
        if (node instanceof THREE.Mesh) node.geometry.dispose();
      });
      dracoLoader.dispose();
      renderer.dispose();
      canvas.remove();
    };
    // Arrays entram por valor: um literal novo a cada render do pai não pode
    // derrubar e reconstruir a cena inteira.
  }, [
    modelUrl,
    target[0],
    target[1],
    target[2],
    radius,
    elevation,
    fovRadians,
    azimuth,
    azimuthSwing,
    spin,
    cell,
    light[0],
    light[1],
    light[2],
    toneFloor,
    recessGain,
    formGain,
    recessDeadZone,
    recessDepth,
    minRadiusCells,
    fadeStart,
    fadeEnd,
  ]);

  return <div ref={hostRef} className={className} />;
}
