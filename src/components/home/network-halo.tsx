const POINTS = 440;
const RADIUS = 250;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

// Fibonacci sphere, projected flat: uniform on the surface means dense at the
// rim and sparse in the middle, which is what makes it read as a sphere
// instead of a disc. Depth drives both dot size and opacity.
const DOTS = Array.from({ length: POINTS }, (_, i) => {
  const y = 1 - (i / (POINTS - 1)) * 2;
  const ring = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = GOLDEN * i;
  const depth = (Math.sin(theta) * ring + 1) / 2;
  return {
    cx: (RADIUS + Math.cos(theta) * ring * RADIUS).toFixed(1),
    cy: (RADIUS + y * RADIUS).toFixed(1),
    r: (0.7 + depth * 1.7).toFixed(2),
    o: (0.08 + depth * 0.3).toFixed(2),
  };
});

export function NetworkHalo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${RADIUS * 2} ${RADIUS * 2}`}
      aria-hidden
      focusable="false"
      className={className}
    >
      {DOTS.map((dot, i) => (
        <circle key={i} cx={dot.cx} cy={dot.cy} r={dot.r} fill="currentColor" opacity={dot.o} />
      ))}
    </svg>
  );
}
