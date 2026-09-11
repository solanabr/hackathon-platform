/**
 * The LP's sound layer — paper, stamp and perforation.
 *
 * The sounds are SYNTHESIZED, not files. Three reasons, in this order: (1)
 * what the brand does is paper percussion, and paper percussion is a noise
 * transient with a short envelope — exactly what Web Audio does well and what
 * a stock sample makes sound generic; (2) zero network cost, and the LP is
 * already judged on performance; (3) the timbre stays tied to the same timing
 * tokens as everything else, so sound and motion age together.
 *
 * The context is only born on a user gesture — the toggle. Nothing here plays
 * unless someone turned it on first, in this session, by hand.
 */

type Voice = "carimbo" | "papel" | "picote";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;

/** One second of white noise, reused by every voice. */
function noiseBuffer(ac: AudioContext) {
  if (noise) return noise;
  const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
  noise = buf;
  return buf;
}

/**
 * Creates (or resumes) the context. Must only be called from inside a gesture
 * handler, or the browser creates it suspended and the first sound is silent.
 */
export function armAudio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    // Deliberately low: interface sound that competes with the reader's inner
    // soundtrack becomes irritation, not finish.
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
 * The stamp. Two layers, like the real gesture: the snap of rubber on paper
 * (low, short noise) and the thud of the hand on the desk beneath (a sine
 * falling from 92 to 54 Hz). A single layer sounds like a mouse click.
 */
function stamp(ac: AudioContext, out: GainNode) {
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
 * The tear. A tear is not a continuous hiss: it is a rapid sequence of
 * micro-snaps as the fiber gives way. That is why the envelope is jagged by
 * hand instead of a smooth decay — a smooth decay sounds like a breath.
 */
function tear(ac: AudioContext, out: GainNode) {
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

/** The perforation. A single hole: high, dry, 30ms. */
function perforation(ac: AudioContext, out: GainNode) {
  burst(ac, out, { type: "highpass", freq: 2800, peak: 0.34, attack: 0.001, decay: 0.03 });
}

const VOICES: Record<Voice, (ac: AudioContext, out: GainNode) => void> = {
  carimbo: stamp,
  papel: tear,
  picote: perforation,
};

/**
 * Plays a voice. Silent and cheap when audio was never armed — this check is
 * what guarantees no beat on the page can make a sound without the person
 * having turned the toggle on.
 */
export function play(voice: Voice) {
  if (!ctx || !master || ctx.state !== "running") return;
  VOICES[voice](ctx, master);
}
