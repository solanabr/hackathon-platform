import type { CSSProperties } from "react";

// The disc is geometry, not a drawing: a front face, a back face and 36 rim
// panels standing in `preserve-3d`. A gradient faking an edge is what made the
// old hub read as a lens grip — a real cylinder has an edge because it has one.
const SEGMENTS = 36;
const STEP = 360 / SEGMENTS;

// One light, fixed at upper-left-front, in screen coordinates (y points DOWN,
// as everywhere in CSS — hence the -0.5 for a light that comes from above).
// Two sources on one object is how a struck piece starts looking painted.
const L = (() => {
  const [x, y, z] = [-0.5, -0.5, 0.707];
  const n = Math.hypot(x, y, z);
  return { x: x / n, y: y / n, z: z / n };
})();

const lambert = (nx: number, ny: number, nz: number) =>
  Math.max(0, nx * L.x + ny * L.y + nz * L.z);

// The pose is frontal: head-on the piece is a DISC, a shape read at a glance.
// In three-quarters it is an ellipse, and a dark ellipse on a dark ground is a
// smudge. The tilt only puts the bottom rim in view.
const FACE_B = lambert(0, 0, 1).toFixed(3);

const RIM_B = Array.from({ length: SEGMENTS }, (_, i) => {
  const f = (i * STEP * Math.PI) / 180;
  return lambert(Math.sin(f), -Math.cos(f), 0).toFixed(3);
});

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

export function SolanaCoin() {
  return (
    <div className="coin-stage">
      <div aria-hidden className="coin-cast" />

      <div className="coin-scene" aria-hidden>
        <div className="coin">
          <div
            className="coin-face coin-face-front"
            style={{ "--b": FACE_B } as CSSProperties}
          >
            <div className="coin-collar" />
            <div className="coin-field">
              <Mark />
            </div>
            <div className="coin-sheen" />
          </div>

          <div
            className="coin-face coin-face-back"
            style={{ "--b": "0" } as CSSProperties}
          />

          <div className="coin-rim">
            {RIM_B.map((b, i) => (
              <span
                key={i}
                className="coin-seg"
                style={{ "--i": i, "--b": b } as CSSProperties}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
