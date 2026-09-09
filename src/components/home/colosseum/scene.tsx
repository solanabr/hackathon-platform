"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { readMotionSeconds } from "@/lib/motion";
import {
  ATLAS_COLS,
  BASE58,
  CELL_REDUCE_FRAG,
  FULLSCREEN_VERT,
  GLYPH_FRAG,
  MIN_BLUR_FRAG,
  buildGlyphAtlas,
  buildSignatureTexture,
} from "./glyph-halftone";
import { SIGNATURE_BUFFER } from "./signatures.generated";

const CELL = 8;

/* Enquadramento medido, não olhado: é o único azimute em que a fachada íntegra
   atravessa o quadro inteiro — a ponta do arco sobrevivente não preenche. */
const TARGET = new THREE.Vector3(0, 0.138, 0);
const RADIUS = 1.12;
const ELEVATION = 0.045;
const FOV_RADIANS = 0.46;
const AZIMUTH = Math.PI * 1.8;
const AZIMUTH_SWING = Math.PI * 0.033;

/* Medidos no harness isolado (scratchpad), não estimados: delta entre pedra e
   vão varia por um fator de ~30, daí a normalização log entre estes dois. */
const RECESS_DEAD_ZONE = 0.004;
const RECESS_DEPTH = 0.09;
const MIN_RADIUS_CELLS = 2;
const REVERSE_START = 0.64;
const REVERSE_END = 1.0;

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

export default function ColosseumCanvas() {
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

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      THREE.MathUtils.radToDeg(FOV_RADIANS),
      1,
      0.05,
      12,
    );

    const shadeMaterial = new THREE.ShaderMaterial({
      vertexShader: SHADE_VERT,
      fragmentShader: SHADE_FRAG,
      uniforms: { uLight: { value: new THREE.Vector3(-0.55, 0.52, 0.65).normalize() } },
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

    const glyphAtlas = buildGlyphAtlas();
    const signatureTexture = buildSignatureTexture(SIGNATURE_BUFFER);

    const reduceMaterial = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: CELL_REDUCE_FRAG,
      uniforms: {
        tDepth: { value: sceneTarget.depthTexture },
        tScene: { value: sceneTarget.texture },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uCell: { value: CELL },
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
        uRadius: { value: MIN_RADIUS_CELLS },
      },
    });

    const glyphMaterial = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: GLYPH_FRAG,
      uniforms: {
        tCell: { value: cellTarget.texture },
        tMin: { value: minTarget.texture },
        tGlyphs: { value: glyphAtlas },
        tSignature: { value: signatureTexture },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uCellResolution: { value: new THREE.Vector2(1, 1) },
        uCell: { value: CELL },
        uSignatureLength: { value: signatureTexture.image.width },
        uAtlasCols: { value: ATLAS_COLS },
        uAtlasRows: { value: Math.ceil(BASE58.length / ATLAS_COLS) },
        uInk: { value: new THREE.Vector3(...ink) },
        uSurface: { value: new THREE.Vector3(...surface) },
        uFadeStart: { value: 0.0 },
        uFadeEnd: { value: 0.3 },
        uRecessDeadZone: { value: RECESS_DEAD_ZONE },
        uRecessDepth: { value: RECESS_DEPTH },
        uReverseStart: { value: REVERSE_START },
        uReverseEnd: { value: REVERSE_END },
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
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    let width = 0;
    let height = 0;
    let cellWidth = 0;
    let cellHeight = 0;
    let cellPx = CELL;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = host!.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.round(rect.width * dpr));
      const nextHeight = Math.max(1, Math.round(rect.height * dpr));
      if (nextWidth === width && nextHeight === height) return;

      width = nextWidth;
      height = nextHeight;
      cellPx = CELL * dpr;
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

    function frame() {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      if (!model) return;

      pointer.current += (pointer.target - pointer.current) * smoothing;
      const azimuth = AZIMUTH + pointer.current * AZIMUTH_SWING;
      camera.position.set(
        TARGET.x + RADIUS * Math.cos(ELEVATION) * Math.sin(azimuth),
        TARGET.y + RADIUS * Math.sin(ELEVATION),
        TARGET.z + RADIUS * Math.cos(ELEVATION) * Math.cos(azimuth),
      );
      camera.lookAt(TARGET);

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
      .loadAsync("/models/colosseum.glb")
      .then((gltf) => {
        if (disposed) return;
        model = gltf.scene;
        scene.add(model);
        frame();
      })
      .catch(() => {
        /* O backdrop SVG continua atrás: falha de carga degrada para ele. */
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
      glyphAtlas.dispose();
      signatureTexture.dispose();
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
  }, []);

  return <div ref={hostRef} className="h-full w-full bg-surface text-ink" />;
}
