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
varying vec2 vUv;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vUv = uv;
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

/* Where the ornament is painted rather than carved — filigree, fluting,
   volutes — light alone returns a flat piece. The albedo comes in as ink:
   where the paint darkens, the halftone thickens the stroke. */
const PAINTED_FRAG = /* glsl */ `
precision highp float;
varying vec3 vNormal;
varying vec2 vUv;
uniform vec3 uLight;
uniform sampler2D tAlbedo;
uniform float uAlbedoMix;
void main() {
  float lambert = max(dot(normalize(vNormal), uLight), 0.0);
  float albedo = dot(texture2D(tAlbedo, vUv).rgb, vec3(0.299, 0.587, 0.114));
  // Normalised at mid grey: the texture enters as a deviation around 1.0,
  // otherwise it only darkens the whole piece instead of drawing on it.
  float paint = mix(1.0, albedo / 0.5, uAlbedoMix);
  gl_FragColor = vec4(vec3(clamp(lambert * paint, 0.0, 1.0)), 1.0);
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
  /** Downloaded piece. Mutually exclusive with `build`. */
  modelUrl?: string;
  /** Piece built in code — the Colosseum arcade is generated, not downloaded.
   * Must be a stable reference: a fresh literal remounts the scene. */
  build?: () => THREE.BufferGeometry;
  /** Point the camera looks at, in model units. */
  target: [number, number, number];
  /** Camera distance to the target. */
  radius: number;
  /** Orbit height, in radians. */
  elevation: number;
  fovRadians: number;
  azimuth: number;
  /** How far the azimuth follows the pointer, in radians. */
  azimuthSwing?: number;
  /** Continuous spin, in radians per second. Zero keeps the piece still. */
  spin?: number;
  /** Sway around the azimuth: amplitude in radians and period in seconds.
   * Shows the piece is a volume without ever taking it to an angle where it
   * stops being recognisable — which a full turn does. */
  swayRadians?: number;
  swaySeconds?: number;
  /** Camera bound to the piece's progress through the viewport: amplitude in
   * radians to each side of rest, and the axis it moves on. The clock here
   * is scroll, not time — page still, camera still. */
  scrollSwing?: number;
  /** `azimuth` orbits around the piece; `elevation` raises the horizon line. */
  scrollAxis?: "azimuth" | "elevation";
  /** Halftone cell side, in CSS px. */
  cell?: number;
  light?: [number, number, number];
  /** Light bound to the camera, not the world: on a spinning piece, world-fixed
   * light crosses the frontal angle and flattens the volume for a few seconds. */
  lightTracksCamera?: boolean;
  /** Ink floor, recess gain and light gain — the piece's signature. */
  /** How much of the model's albedo becomes ink, 0 to 1. Zero keeps the piece
   * lit only — what the Colosseum uses, where the relief is geometry. */
  albedoMix?: number;
  toneFloor?: number;
  recessGain?: number;
  formGain?: number;
  recessDeadZone?: number;
  recessDepth?: number;
  minRadiusCells?: number;
  /** Whether the pass paints its own paper. False leaves the canvas transparent
   * and only the stroke comes out — what allows a drawing behind the piece. */
  paper?: boolean;
  /** Dissolve measured from the top of the frame: 0..1 from ramp start to end. */
  fadeStart?: number;
  fadeEnd?: number;
  /* Cues for the caller to swap the 2D drawing for the scene: `onReady` on the
     first frame actually painted, `onLost` when the context drops. Without them
     the poster would have to vanish on mount, before its replacement exists. */
  onReady?: () => void;
  onLost?: () => void;
  className?: string;
};

/* One halftone pipeline for every 3D piece on the LP: light render into its
   own target, per-cell reduction, separable neighbourhood minimum and the
   final stroke on the same grid as the 2D halftone. What changes from piece
   to piece is framing and the three tone gains — not the render path. */
export default function GlyphScene({
  modelUrl,
  build,
  target,
  radius,
  elevation,
  fovRadians,
  azimuthSwing = 0,
  azimuth,
  spin = 0,
  swayRadians = 0,
  swaySeconds = 14,
  scrollSwing = 0,
  scrollAxis = "azimuth",
  cell = 8,
  light = [-0.55, 0.52, 0.65],
  lightTracksCamera = false,
  albedoMix = 0,
  toneFloor = 0.26,
  recessGain = 0.69,
  formGain = 0.08,
  recessDeadZone = 0.004,
  recessDepth = 0.09,
  minRadiusCells = 2,
  paper = true,
  fadeStart = 0,
  fadeEnd = 0.5,
  onReady,
  onLost,
  className = "h-full w-full bg-surface text-ink",
}: GlyphSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  /* By ref, not by dependency: a new callback on every parent render would
     tear down and rebuild the whole scene. */
  const onReadyRef = useRef(onReady);
  const onLostRef = useRef(onLost);

  /* The lens also comes in by ref. Changing framing means moving the camera,
     not rebuilding the piece: with these five in the deps, one degree of
     rotation tore down the scene, regenerated the 80 bays and reallocated the
     render targets. The loop reads from here each frame; values stay out of deps. */
  const lensRef = useRef({ target, radius, elevation, fovRadians, azimuth });

  useEffect(() => {
    onReadyRef.current = onReady;
    onLostRef.current = onLost;
    lensRef.current = { target, radius, elevation, fovRadians, azimuth };
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const canvas = document.createElement("canvas");
    canvas.className = "block h-full w-full";
    host.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: !paper });
    // Linear, not sRGB: the shader already quantises luminance, and any gamma
    // applied before it skews the tone ramp against the 2D halftone.
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

    const lightUniform = { value: new THREE.Vector3(...light).normalize() };
    const shadeMaterial = new THREE.ShaderMaterial({
      vertexShader: SHADE_VERT,
      fragmentShader: SHADE_FRAG,
      uniforms: { uLight: lightUniform },
    });
    // With albedo each mesh needs its own map, so the material leaves the
    // override and is swapped mesh by mesh — sharing the same light uniform
    // object, which changes every frame.
    const paintedMaterials: THREE.ShaderMaterial[] = [];
    if (!albedoMix) scene.overrideMaterial = shadeMaterial;

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
        uPaper: { value: paper ? 1 : 0 },
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
    let running = false;
    let onScreen = false;
    let painted = false;
    let model: THREE.Group | null = null;

    const pointer = { target: 0, current: 0 };
    const smoothing = 1 - Math.exp(-1 / (readMotionSeconds("--dur-toque", 0.62) * 60));

    /* Scroll-bound motion is displacement by definition: without the vector
       nothing of it remains. The eligibility gate already blocks 3D under
       reduced motion; this is belt on top of braces. */
    const scrollBound = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : scrollSwing;

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

    /* Where the host sits on the page, measured when layout changes — not
       every frame. A `getBoundingClientRect` inside the loop, after another
       component wrote style in the same frame, forces synchronous layout
       every time; `scrollY` is free. The parent layer's scroll drift shifts
       the host about 3% off what this says, and the number feeds a 1°
       rotation — invisible. */
    let hostTop = 0;
    let hostHeight = 0;
    function measureHost(rect: DOMRect) {
      hostTop = rect.top + window.scrollY;
      hostHeight = rect.height;
    }

    /* The last painted pose. The scene only repaints once the camera has
       moved at least a fraction of a cell: the ambient sway moves half a
       pixel every ten frames, and repainting five GPU passes for a frame
       identical to the last was most of the fold's cost at rest. */
    let dirty = true;
    let lastHeading = 0;
    let lastRise = 0;
    let lastFov = 0;
    let lastRadius = 0;
    const lastFocus = new THREE.Vector3(NaN, NaN, NaN);
    const POSE_EPSILON = 0.00025;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = host!.getBoundingClientRect();
      measureHost(rect);
      const nextWidth = Math.max(1, Math.round(rect.width * dpr));
      const nextHeight = Math.max(1, Math.round(rect.height * dpr));
      if (nextWidth === width && nextHeight === height) return;

      dirty = true;
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
    const toCamera = new THREE.Vector3();
    const sideways = new THREE.Vector3();
    const WORLD_UP = new THREE.Vector3(0, 1, 0);

    function frame(now: number) {
      if (disposed || !running) return;
      raf = requestAnimationFrame(frame);
      if (!model) return;

      // Real seconds, not one step per frame: on a 120Hz monitor the piece
      // would spin twice as fast.
      const delta = last ? Math.min((now - last) / 1000, 1 / 15) : 0;
      last = now;
      spun += spin * delta;
      const sway = swayRadians
        ? Math.sin((now / 1000) * ((Math.PI * 2) / swaySeconds)) * swayRadians
        : 0;

      pointer.current += (pointer.target - pointer.current) * smoothing;

      /* The piece's progress through the viewport, read from the host itself:
         -1 when the top edge enters at the bottom, +1 when the bottom edge
         leaves at the top. One rect per frame, inside the loop that already
         exists — no second loop, no scroll listener. Position, not
         accumulation: the scene can stop and resume without jumping. */
      let travel = 0;
      if (scrollBound) {
        const top = hostTop - window.scrollY;
        const span = window.innerHeight + hostHeight;
        const through = span > 0 ? (window.innerHeight - top) / span : 0.5;
        travel = THREE.MathUtils.clamp(through, 0, 1) * 2 - 1;
      }

      const lens = lensRef.current;
      focus.set(lens.target[0], lens.target[1], lens.target[2]);

      const fovDegrees = THREE.MathUtils.radToDeg(lens.fovRadians);
      if (camera.fov !== fovDegrees) {
        camera.fov = fovDegrees;
        camera.updateProjectionMatrix();
      }

      const heading =
        lens.azimuth +
        spun +
        sway +
        pointer.current * azimuthSwing +
        (scrollAxis === "azimuth" ? travel * scrollBound : 0);
      const rise =
        lens.elevation + (scrollAxis === "elevation" ? travel * scrollBound : 0);

      const moved =
        dirty ||
        Math.abs(heading - lastHeading) > POSE_EPSILON ||
        Math.abs(rise - lastRise) > POSE_EPSILON ||
        fovDegrees !== lastFov ||
        lens.radius !== lastRadius ||
        !focus.equals(lastFocus);
      if (!moved) return;
      dirty = false;
      lastHeading = heading;
      lastRise = rise;
      lastFov = fovDegrees;
      lastRadius = lens.radius;
      lastFocus.copy(focus);

      camera.position.set(
        focus.x + lens.radius * Math.cos(rise) * Math.sin(heading),
        focus.y + lens.radius * Math.sin(rise),
        focus.z + lens.radius * Math.cos(rise) * Math.cos(heading),
      );
      camera.lookAt(focus);

      if (lightTracksCamera) {
        // High key to the viewer's left: the same light position as a product
        // studio, held while the piece turns.
        toCamera.subVectors(camera.position, focus).normalize();
        sideways.crossVectors(WORLD_UP, toCamera).normalize();
        lightUniform.value
          .copy(toCamera)
          .multiplyScalar(0.3)
          .addScaledVector(sideways, 0.8)
          .addScaledVector(WORLD_UP, 0.5)
          .normalize();
      }

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
      // Without paper the frame comes out in alpha: the clear has to go to
      // zero, or the scene target's black comes back as the canvas ground.
      renderer.setClearColor(0x000000, paper ? 1 : 0);
      quad.render(renderer);

      if (!painted) {
        painted = true;
        onReadyRef.current?.();
      }
    }

    /* The scene only burns GPU while in view and the tab is in front. Stopping
       just suspends the loop: nothing here touches the disposes, which stay
       exclusive to the cleanup. */
    function start() {
      if (running || disposed || !model || !onScreen || document.hidden) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = Boolean(entry?.isIntersecting);
        if (entry) measureHost(entry.boundingClientRect);
        if (onScreen) {
          loadModel();
          start();
        } else stop();
      },
      { rootMargin: "20%" },
    );
    io.observe(host);

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    /* The ResizeObserver does not see a monitor switch: dragging the window
       from a Retina to a 1x display keeps the CSS rect the same and only the
       devicePixelRatio changes — the stroke would alias until the next resize. */
    let dprQuery: MediaQueryList | null = null;
    const onDpr = () => {
      resize();
      watchDpr();
    };
    function watchDpr() {
      dprQuery?.removeEventListener("change", onDpr);
      dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      dprQuery.addEventListener("change", onDpr);
    }
    watchDpr();

    /* A lost context brings back the 2D drawing instead of leaving a hole. No
       restore attempt: every target, material and shader would have to be
       rebuilt, and the poster already is the piece under reduced motion. */
    const onContextLost = (event: Event) => {
      if (disposed) return;
      event.preventDefault();
      stop();
      onLostRef.current?.();
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    const dracoLoader = new DRACOLoader();

    function mount(loaded: THREE.Group) {
      model = loaded;
      scene.add(model);
      start();
    }

    if (build) {
      const group = new THREE.Group();
      group.add(new THREE.Mesh(build(), shadeMaterial));
      mount(group);
    }

    // A GLB plus the Draco decoder is well over a megabyte; the prize stage
    // sits far below the fold, so the download waits for the section to come
    // within the observer's margin instead of firing on mount.
    let loadStarted = false;
    function loadModel() {
      if (build || loadStarted || disposed) return;
      loadStarted = true;
      dracoLoader.setDecoderPath("/draco/");
      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);

      loader
      .loadAsync(modelUrl!)
      .then((gltf) => {
        if (disposed) return;
        const loaded = gltf.scene;
        if (albedoMix) {
          loaded.traverse((node) => {
            if (!(node instanceof THREE.Mesh)) return;
            const map = (node.material as THREE.MeshStandardMaterial).map ?? null;
            // No colour space conversion: the shader wants the value as
            // painted, and the halftone decides what counts as dark.
            if (map) map.colorSpace = THREE.NoColorSpace;
            const painted = new THREE.ShaderMaterial({
              vertexShader: SHADE_VERT,
              fragmentShader: map ? PAINTED_FRAG : SHADE_FRAG,
              uniforms: {
                uLight: lightUniform,
                tAlbedo: { value: map },
                uAlbedoMix: { value: albedoMix },
              },
            });
            paintedMaterials.push(painted);
            node.material = painted;
          });
        }
        mount(loaded);
      })
      .catch(() => {
        /* The 2D drawing stays behind: a load failure degrades to it. */
      });
    }

    return () => {
      disposed = true;
      stop();
      io.disconnect();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      dprQuery?.removeEventListener("change", onDpr);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      window.removeEventListener("pointermove", onPointerMove);
      quad.dispose();
      shadeMaterial.dispose();
      paintedMaterials.forEach((material) => material.dispose());
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
      renderer.forceContextLoss();
      renderer.dispose();
      canvas.remove();
    };
    // Arrays enter by value: a fresh literal on every parent render must not
    // tear down and rebuild the whole scene.
    // `target`, `radius`, `elevation`, `fovRadians` and `azimuth` are left out
    // on purpose: they live in lensRef and are read per frame.
  }, [
    modelUrl,
    build,
    azimuthSwing,
    spin,
    swayRadians,
    swaySeconds,
    scrollSwing,
    scrollAxis,
    cell,
    albedoMix,
    lightTracksCamera,
    light[0],
    light[1],
    light[2],
    toneFloor,
    recessGain,
    formGain,
    recessDeadZone,
    recessDepth,
    minRadiusCells,
    paper,
    fadeStart,
    fadeEnd,
  ]);

  return <div ref={hostRef} className={className} />;
}
