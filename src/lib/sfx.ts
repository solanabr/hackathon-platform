/**
 * A camada sonora da LP — papel, carimbo e picote.
 *
 * Os sons são SINTETIZADOS, não arquivos. Três razões, nessa ordem: (1) o que
 * a marca faz é percussão de papel, e percussão de papel é transiente de
 * ruído com envelope curto — exatamente o que o Web Audio faz bem e o que
 * amostra de banco faz soar genérico; (2) custo de rede zero, e a LP já é
 * julgada por performance; (3) o timbre fica amarrado aos mesmos tokens de
 * tempo do resto, então som e movimento envelhecem juntos.
 *
 * O contexto só nasce num gesto do usuário — o toggle. Nada aqui toca sem
 * alguém ter ligado antes, nesta sessão, com a mão.
 */

type Voice = "carimbo" | "papel" | "picote";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;

/** Um segundo de ruído branco, reusado por todas as vozes. */
function noiseBuffer(ac: AudioContext) {
  if (noise) return noise;
  const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
  noise = buf;
  return buf;
}

/**
 * Cria (ou retoma) o contexto. Só deve ser chamado de dentro de um handler de
 * gesto, senão o navegador nasce suspenso e o primeiro som sai mudo.
 */
export function armAudio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    // Baixo de propósito: som de interface que compete com a trilha mental de
    // quem está lendo vira irritação, não acabamento.
    master.gain.value = 0.22;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function releaseAudio() {
  if (ctx && ctx.state === "running") void ctx.suspend();
}

function burst(
  ac: AudioContext,
  out: GainNode,
  {
    type,
    freq,
    q = 1,
    peak,
    attack,
    decay,
    sweepTo,
  }: {
    type: BiquadFilterType;
    freq: number;
    q?: number;
    peak: number;
    attack: number;
    decay: number;
    sweepTo?: number;
  },
) {
  const t = ac.currentTime;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  src.loop = true;

  const filter = ac.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(freq, t);
  filter.Q.value = q;
  if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, t + decay);

  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(peak, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);

  src.connect(filter).connect(env).connect(out);
  src.start(t);
  src.stop(t + attack + decay + 0.02);
}

/**
 * O carimbo. Duas camadas, como o gesto real: o estalo do borracha no papel
 * (ruído grave e curto) e o baque da mão na mesa embaixo (seno caindo de 92
 * para 54 Hz). Uma camada só soa a clique de mouse.
 */
function carimbo(ac: AudioContext, out: GainNode) {
  burst(ac, out, { type: "lowpass", freq: 1400, peak: 0.5, attack: 0.002, decay: 0.055 });

  const t = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(92, t);
  osc.frequency.exponentialRampToValueAtTime(54, t + 0.09);
  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(0.6, t + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(t + 0.14);
}

/**
 * O rasgo. Um rasgo não é um chiado contínuo: é uma sequência rápida de
 * micro-estalos enquanto a fibra cede. Por isso o envelope é serrilhado à mão
 * em vez de ser uma queda lisa — a queda lisa soa a sopro.
 */
function papel(ac: AudioContext, out: GainNode) {
  const t = ac.currentTime;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  src.loop = true;

  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 0.8;
  filter.frequency.setValueAtTime(2600, t);
  filter.frequency.exponentialRampToValueAtTime(900, t + 0.22);

  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t);
  const steps = 11;
  for (let i = 0; i < steps; i += 1) {
    const at = t + 0.004 + (i / steps) * 0.2;
    const decayed = 0.5 * (1 - i / steps);
    env.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, decayed * (0.45 + Math.random() * 0.55)),
      at,
    );
  }
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.235);

  src.connect(filter).connect(env).connect(out);
  src.start(t);
  src.stop(t + 0.26);
}

/** O picote. Um furo só: agudo, seco, 30ms. */
function picote(ac: AudioContext, out: GainNode) {
  burst(ac, out, { type: "highpass", freq: 2800, peak: 0.34, attack: 0.001, decay: 0.03 });
}

const VOICES: Record<Voice, (ac: AudioContext, out: GainNode) => void> = {
  carimbo,
  papel,
  picote,
};

/**
 * Toca uma voz. Silencioso e barato quando o áudio nunca foi armado — é essa
 * checagem que garante que nenhum beat da página consegue emitir som sem a
 * pessoa ter ligado o toggle.
 */
export function play(voice: Voice) {
  if (!ctx || !master || ctx.state !== "running") return;
  VOICES[voice](ctx, master);
}
