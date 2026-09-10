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

/* Onde o ornamento está pintado e não esculpido — filigrana, canelura, voluta —
   a luz sozinha devolve uma peça lisa. A albedo entra como tinta: onde a
   pintura escurece, o meio-tom engrossa o traço. */
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
  // Normalizado no cinza médio: a textura entra como desvio em torno de 1.0,
  // senão ela só rebaixa a peça inteira em vez de desenhar nela.
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
  /** Peça baixada. Exclusivo com `build`. */
  modelUrl?: string;
  /** Peça construída em código — a arcada do Colosseum é gerada, não baixada.
   * Tem que ser uma referência estável: um literal novo remonta a cena. */
  build?: () => THREE.BufferGeometry;
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
  /** Vaivém em torno do azimute: amplitude em radianos e período em segundos.
   * Mostra que a peça é volume sem nunca levá-la a um ângulo em que ela deixa
   * de se reconhecer — o que um giro completo faz. */
  swayRadians?: number;
  swaySeconds?: number;
  /** Câmera presa ao progresso da peça atravessando a janela: amplitude em
   * radianos para cada lado do repouso, e o eixo em que ela anda. O relógio
   * aqui é o scroll, não o tempo — parada a página, parada a câmera. */
  scrollSwing?: number;
  /** `azimuth` roda em volta da peça; `elevation` sobe a linha do horizonte. */
  scrollAxis?: "azimuth" | "elevation";
  /** Lado da célula do meio-tom, em px de CSS. */
  cell?: number;
  light?: [number, number, number];
  /** Luz presa à câmera, e não ao mundo: numa peça que gira, luz fixa no mundo
   * atravessa o ângulo frontal e chapa o volume por alguns segundos. */
  lightTracksCamera?: boolean;
  /** Piso de tinta, ganho do recesso e ganho da luz — a assinatura da peça. */
  /** Quanto da albedo do modelo vira tinta, de 0 a 1. Zero mantém a peça só
   * com a luz — é o que o Colosseum usa, onde o relevo é geometria. */
  albedoMix?: number;
  toneFloor?: number;
  recessGain?: number;
  formGain?: number;
  recessDeadZone?: number;
  recessDepth?: number;
  minRadiusCells?: number;
  /** Se a passada pinta o próprio papel. Falso deixa a tela transparente e só
   * o traço sai — é o que permite pôr desenho atrás da peça. */
  paper?: boolean;
  /** Dissolve medido do topo do quadro: 0..1 do começo ao fim da rampa. */
  fadeStart?: number;
  fadeEnd?: number;
  /* Deixas para quem chama trocar o desenho 2D pela cena: `onReady` no primeiro
     quadro efetivamente pintado, `onLost` quando o contexto cai. Sem elas o
     poster teria de sumir na montagem, antes de existir o que o substitui. */
  onReady?: () => void;
  onLost?: () => void;
  className?: string;
};

/* Um só pipeline de meio-tom para qualquer peça 3D da LP: render de luz em
   alvo próprio, redução por célula, mínimo separável da vizinhança e o traço
   final na mesma grade do halftone 2D. O que muda de uma peça para outra é
   enquadramento e os três ganhos de tom — não o caminho de render. */
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
  /* Por referência, não por dependência: um callback novo a cada render do pai
     derrubaria e reconstruiria a cena inteira. */
  const onReadyRef = useRef(onReady);
  const onLostRef = useRef(onLost);

  /* A lente também entra por referência. Mudar enquadramento é mover a câmera,
     não reconstruir a peça: com estes cinco na lista de dependências, um
     grau de giro derrubava a cena, regerava os 80 vãos e realocava os render
     targets. O laço lê daqui a cada quadro e os valores saem das deps. */
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

    const lightUniform = { value: new THREE.Vector3(...light).normalize() };
    const shadeMaterial = new THREE.ShaderMaterial({
      vertexShader: SHADE_VERT,
      fragmentShader: SHADE_FRAG,
      uniforms: { uLight: lightUniform },
    });
    // Com albedo cada malha precisa do seu próprio mapa, então o material sai
    // de override e passa a ser trocado peça a peça — dividindo o mesmo objeto
    // de uniform da luz, que muda a cada quadro.
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

    /* Movimento ligado ao scroll é deslocamento por definição: sem vetor não
       sobra nada dele. O gate de elegibilidade já barra 3D em movimento
       reduzido; isto é o cinto além do suspensório. */
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
    const toCamera = new THREE.Vector3();
    const sideways = new THREE.Vector3();
    const WORLD_UP = new THREE.Vector3(0, 1, 0);

    function frame(now: number) {
      if (disposed || !running) return;
      raf = requestAnimationFrame(frame);
      if (!model) return;

      // Segundos reais, não um passo por quadro: num monitor de 120Hz a peça
      // giraria no dobro da velocidade.
      const delta = last ? Math.min((now - last) / 1000, 1 / 15) : 0;
      last = now;
      spun += spin * delta;
      const sway = swayRadians
        ? Math.sin((now / 1000) * ((Math.PI * 2) / swaySeconds)) * swayRadians
        : 0;

      pointer.current += (pointer.target - pointer.current) * smoothing;

      /* Progresso da peça atravessando a janela, lido do próprio host: -1
         quando a borda de cima entra pelo rodapé, +1 quando a de baixo sai
         pelo topo. Um rect por quadro, dentro do laço que já existe — nada de
         um segundo laço nem de um ouvinte de scroll para isto. É posição, não
         acúmulo: a cena pode parar e voltar sem saltar. */
      let travel = 0;
      if (scrollBound) {
        const rect = host!.getBoundingClientRect();
        const span = window.innerHeight + rect.height;
        const through = span > 0 ? (window.innerHeight - rect.top) / span : 0.5;
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
      camera.position.set(
        focus.x + lens.radius * Math.cos(rise) * Math.sin(heading),
        focus.y + lens.radius * Math.sin(rise),
        focus.z + lens.radius * Math.cos(rise) * Math.cos(heading),
      );
      camera.lookAt(focus);

      if (lightTracksCamera) {
        // Chave alta à esquerda de quem olha: a mesma posição de luz de um
        // estúdio de produto, mantida enquanto a peça roda.
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
      // Sem papel, o quadro sai em alfa: o limpa tem que ir a zero, senão o
      // preto do alvo de cena volta como fundo da tela.
      renderer.setClearColor(0x000000, paper ? 1 : 0);
      quad.render(renderer);

      if (!painted) {
        painted = true;
        onReadyRef.current?.();
      }
    }

    /* A cena só queima GPU enquanto está no quadro e a aba está à frente. Parar
       é só suspender o laço: nada aqui encosta nos disposes, que continuam
       exclusivos do cleanup. */
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
        if (onScreen) start();
        else stop();
      },
      { rootMargin: "20%" },
    );
    io.observe(host);

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    /* O ResizeObserver não vê a troca de monitor: arrastando a janela de um
       Retina para um 1x o retângulo em CSS continua igual e só o
       devicePixelRatio muda — o traço serrilharia até o próximo resize. */
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

    /* Contexto perdido devolve o desenho 2D em vez de deixar buraco. Não há
       tentativa de restaurar: cada alvo, material e shader teria de ser
       reconstruído, e o poster já é a peça em movimento reduzido. */
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
    } else {
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
            // Sem conversão de espaço de cor: o shader quer o valor tal como
            // pintado, e é o meio-tom que decide o que é escuro.
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
        /* O desenho 2D continua atrás: falha de carga degrada para ele. */
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
    // Arrays entram por valor: um literal novo a cada render do pai não pode
    // derrubar e reconstruir a cena inteira.
    // `target`, `radius`, `elevation`, `fovRadians` e `azimuth` ficam de fora
    // de propósito: vivem em lensRef e são lidos por quadro.
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
