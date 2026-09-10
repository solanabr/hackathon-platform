"use client";

import { useEffect, useRef, type CSSProperties } from "react";

// The disc is geometry, not a drawing: a front face, a back face and 36 rim
// panels standing in `preserve-3d`. A gradient faking an edge is what made the
// old hub read as a lens grip — a real cylinder has an edge because it has one.
const SEGMENTS = 36;
const STEP = 360 / SEGMENTS;
const RAD = Math.PI / 180;

// The normal of each rim panel in the rim's own frame. The Lambert term is NOT
// baked here any more: the piece turns, and a shading baked at build time turns
// with it — which is a coin painted with its highlight, not a lit one. JS ships
// the pose (cos/sin of yaw and pitch) and CSS finishes the dot product per
// surface, so the light stays nailed to the room while the metal moves.
const RIM = Array.from({ length: SEGMENTS }, (_, i) => {
  const f = i * STEP * RAD;
  return { a: Math.sin(f).toFixed(4), n: (-Math.cos(f)).toFixed(4) };
});

// Rest pose: frontal. Head-on the piece is a DISC, a shape read at a glance; in
// three-quarters it is an ellipse, and a dark ellipse on a dark ground is a
// smudge. The tilt only puts the bottom rim in view.
const REST_PITCH = 8;
const MAX_YAW = 23;
const MAX_PITCH = 15;

// A flicked coin does not "play an animation": it takes a shove and loses it to
// friction, then settles on whichever face it was closest to.
const FLICK = 1180; // deg/s
const FRICTION = 1.6;
const SNAP_BELOW = 100; // deg/s

const clamp = (v: number, min: number, max: number) =>
  v < min ? min : v > max ? max : v;

// The Solana mark, struck rather than pasted.
const MARK = [
  "M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z",
  "M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z",
  "M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z",
];

function Mark() {
  return (
    <svg
      className="coin-mark"
      viewBox="0 0 397.7 311.7"
      aria-hidden
      focusable="false"
    >
      <g className="coin-mark-shade">
        {MARK.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <g className="coin-mark-lit">
        {MARK.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}

// The reverse. A coin you can flip has to have something on the other side —
// same strike, same two-copy relief, legend around the collar and the edition
// in the middle.
const LEGEND = "SUPERTEAM BRASIL ★ HACKATHON ★ SOLANA ★";
const LEGEND_PATH =
  "M100 100 m-72 0 a72 72 0 1 1 144 0 a72 72 0 1 1 -144 0";

function Reverse() {
  return (
    <svg
      className="coin-reverse"
      viewBox="0 0 200 200"
      aria-hidden
      focusable="false"
    >
      <defs>
        <path id="coin-legend-path" d={LEGEND_PATH} fill="none" />
      </defs>
      {(["shade", "lit"] as const).map((layer) => (
        <g key={layer} className={`coin-mark-${layer}`}>
          <text className="coin-legend">
            <textPath
              href="#coin-legend-path"
              startOffset="50%"
              textAnchor="middle"
              textLength="430"
              lengthAdjust="spacing"
            >
              {LEGEND}
            </textPath>
          </text>
          <text className="coin-year" x="100" y="116" textAnchor="middle">
            2026
          </text>
        </g>
      ))}
    </svg>
  );
}

export function SolanaCoin() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const scene = sceneRef.current;
    if (!stage || !scene) return;

    const calmer = window.matchMedia("(prefers-reduced-motion: reduce)");
    let teardown: (() => void) | null = null;

    const live = () => {
      const style = scene.style;
      let raf = 0;
      let last = 0;
      let rect = stage.getBoundingClientRect();
      let onScreen = false;
      let pointer: { x: number; y: number } | null = null;

      let yaw = 0;
      let pitch = REST_PITCH;
      let spin = 0;
      let spinVel = 0;
      let spinRest = 0;

      const write = () => {
        const total = yaw + spin;
        const ry = total * RAD;
        const rx = pitch * RAD;
        style.setProperty("--yaw", total.toFixed(2));
        style.setProperty("--pitch", pitch.toFixed(2));
        style.setProperty("--cy", Math.cos(ry).toFixed(4));
        style.setProperty("--sy", Math.sin(ry).toFixed(4));
        style.setProperty("--cp", Math.cos(rx).toFixed(4));
        style.setProperty("--sp", Math.sin(rx).toFixed(4));
      };

      const frame = (t: number) => {
        const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
        last = t;
        const now = t / 1000;

        // Breathing at rest — a piece that is dead still until you touch it
        // announces that it is waiting for you. This one is just standing.
        const idleYaw = Math.sin(now * 0.61) * 5.5;
        const idlePitch = Math.sin(now * 0.44 + 1.2) * 3;

        // Two ranges, not one: direction saturates close in — a pointer just
        // off the piece already turns it the whole way — while the hold fades
        // out over a much wider field, so the coin lets go of a cursor that
        // left the neighbourhood instead of staring at the far corner.
        let hold = 0;
        let toYaw = 0;
        let toPitch = 0;
        if (pointer) {
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = pointer.x - cx;
          const dy = pointer.y - cy;
          const span = Math.max(150, rect.width * 1.15);
          const field = Math.max(460, rect.width * 3.2);
          const t = clamp(Math.hypot(dx, dy) / field, 0, 1);
          hold = 1 - t * t;
          toYaw = clamp(dx / span, -1, 1) * MAX_YAW;
          toPitch = -clamp(dy / span, -1, 1) * MAX_PITCH;
        }

        const targetYaw = idleYaw * (1 - hold) + toYaw * hold;
        const targetPitch =
          REST_PITCH + idlePitch * (1 - hold) + toPitch * hold;

        const k = 1 - Math.exp(-dt * 7);
        yaw += (targetYaw - yaw) * k;
        pitch += (targetPitch - pitch) * k;

        if (spinVel !== 0) {
          spin += spinVel * dt;
          spinVel *= Math.exp(-dt * FRICTION);
          if (Math.abs(spinVel) < SNAP_BELOW) {
            spinVel = 0;
            spinRest = Math.round(spin / 360) * 360;
          }
        } else if (spin !== spinRest) {
          spin += (spinRest - spin) * (1 - Math.exp(-dt * 5));
          if (Math.abs(spinRest - spin) < 0.05) {
            // 360k is 0 to the eye, and resetting keeps the float honest.
            spin = 0;
            spinRest = 0;
          }
        }

        write();
        raf = requestAnimationFrame(frame);
      };

      const start = () => {
        if (raf || !onScreen || document.hidden) return;
        last = 0;
        raf = requestAnimationFrame(frame);
      };
      const stop = () => {
        if (!raf) return;
        cancelAnimationFrame(raf);
        raf = 0;
      };

      const onMove = (e: PointerEvent) => {
        if (e.pointerType === "touch") return;
        pointer = { x: e.clientX, y: e.clientY };
      };
      const onLeave = () => {
        pointer = null;
      };
      const onDown = (e: PointerEvent) => {
        stage.dataset.struck = "true";
        if (spinVel !== 0) return;
        // which side you hit decides which way it goes, as with a real piece
        const side = e.clientX < rect.left + rect.width / 2 ? -1 : 1;
        spinVel = side * FLICK;
      };
      const onUp = () => {
        delete stage.dataset.struck;
      };
      const measure = () => {
        rect = stage.getBoundingClientRect();
      };
      const onVisibility = () => (document.hidden ? stop() : start());

      const io = new IntersectionObserver(
        ([entry]) => {
          onScreen = entry.isIntersecting;
          measure();
          if (onScreen) start();
          else stop();
        },
        { rootMargin: "20%" },
      );
      io.observe(stage);

      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerleave", onLeave);
      window.addEventListener("scroll", measure, { passive: true });
      window.addEventListener("resize", measure);
      document.addEventListener("visibilitychange", onVisibility);
      stage.addEventListener("pointerdown", onDown);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      stage.dataset.live = "true";

      return () => {
        stop();
        io.disconnect();
        window.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerleave", onLeave);
        window.removeEventListener("scroll", measure);
        window.removeEventListener("resize", measure);
        document.removeEventListener("visibilitychange", onVisibility);
        stage.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        delete stage.dataset.live;
        delete stage.dataset.struck;
        for (const p of ["--yaw", "--pitch", "--cy", "--sy", "--cp", "--sp"]) {
          scene.style.removeProperty(p);
        }
      };
    };

    // Reduced motion gets the struck piece at rest, lit exactly as before, and
    // no tracking: rotation is the vector that costs vestibular comfort.
    const sync = () => {
      teardown?.();
      teardown = calmer.matches ? null : live();
    };
    sync();
    calmer.addEventListener("change", sync);

    return () => {
      calmer.removeEventListener("change", sync);
      teardown?.();
    };
  }, []);

  return (
    <div ref={stageRef} className="coin-stage">
      <div aria-hidden className="coin-cast" />

      <div ref={sceneRef} className="coin-scene" aria-hidden>
        <div className="coin">
          <div className="coin-face coin-face-front">
            <div className="coin-collar" />
            <div className="coin-field">
              <Mark />
            </div>
            <div className="coin-sheen" />
          </div>

          <div className="coin-face coin-face-back">
            <div className="coin-collar" />
            <div className="coin-field">
              <Reverse />
            </div>
            <div className="coin-sheen" />
          </div>

          <div className="coin-rim">
            {RIM.map(({ a, n }, i) => (
              <span
                key={i}
                className="coin-seg"
                style={{ "--i": i, "--a": a, "--n": n } as CSSProperties}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
