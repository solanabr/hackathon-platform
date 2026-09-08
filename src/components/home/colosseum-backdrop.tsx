const BAYS = 37;
const THETA_MAX = 1.32;
const CX = 800;
const RADIUS = 1080;
const BASE = 470;
const BASE_RISE = 55;
const CORNICE = 58;
const EDGE_DROP = 100;

// Tier bands as fractions of each bay's own height, so the storeys foreshorten
// with the bay instead of shearing off the curve. The gaps are the cornices:
// without that horizontal banding the façade reads as a picket fence.
const BANDS = {
  attic: [0, 0.155],
  tier3: [0.2, 0.415],
  tier2: [0.46, 0.675],
  tier1: [0.72, 1],
} as const;

// Where the outer wall has fallen: the attic goes first, then the third
// arcade. That stepped edge is what separates the Colosseum from an arcade.
const ATTIC_ENDS = 21;
const TIER3_ENDS = 27;

type Opening = { x: number; w: number; top: number; bottom: number };

function build() {
  const bays = Array.from({ length: BAYS }, (_, i) => {
    const theta = -THETA_MAX + (i * (2 * THETA_MAX)) / (BAYS - 1);
    const depth = Math.cos(theta);
    const cornice = CORNICE + EDGE_DROP * (1 - depth);
    const base = BASE - BASE_RISE * (1 - depth);
    const h = base - cornice;
    const band = ([a, b]: readonly [number, number]) => ({ top: cornice + a * h, bottom: cornice + b * h });
    const level = i <= ATTIC_ENDS ? 0 : i <= TIER3_ENDS ? 1 : 2;
    const attic = band(BANDS.attic);
    const tier3 = band(BANDS.tier3);
    const tier2 = band(BANDS.tier2);
    return {
      x: CX + RADIUS * Math.sin(theta),
      w: 25 * depth,
      level,
      base,
      top: level === 0 ? attic.top : level === 1 ? tier3.top : tier2.top,
      attic,
      tier3,
      tier2,
      tier1: band(BANDS.tier1),
    };
  });

  const edges = [bays[0].x - (bays[1].x - bays[0].x) / 2];
  for (let i = 1; i < BAYS; i += 1) edges.push((bays[i - 1].x + bays[i].x) / 2);
  edges.push(bays[BAYS - 1].x + (bays[BAYS - 1].x - bays[BAYS - 2].x) / 2);

  // Top edge steps bay to bay; the base runs back as the near ground ellipse.
  let silhouette = `M ${edges[0].toFixed(1)} ${bays[0].base.toFixed(1)}`;
  bays.forEach((bay, i) => {
    silhouette += ` L ${edges[i].toFixed(1)} ${bay.top.toFixed(1)} L ${edges[i + 1].toFixed(1)} ${bay.top.toFixed(1)}`;
  });
  for (let i = BAYS - 1; i >= 0; i -= 1) {
    silhouette += ` L ${edges[i + 1].toFixed(1)} ${bays[i].base.toFixed(1)} L ${edges[i].toFixed(1)} ${bays[i].base.toFixed(1)}`;
  }
  silhouette += " Z";

  const openings: Opening[] = [];
  bays.forEach((bay, i) => {
    if (bay.level === 0 && i % 2 === 0) {
      const h = bay.attic.bottom - bay.attic.top;
      openings.push({ x: bay.x, w: bay.w * 0.34, top: bay.attic.top + h * 0.28, bottom: bay.attic.bottom - h * 0.32 });
    }
    if (bay.level <= 1) openings.push({ x: bay.x, w: bay.w, ...bay.tier3 });
    openings.push({ x: bay.x, w: bay.w, ...bay.tier2 });
    openings.push({ x: bay.x, w: bay.w, ...bay.tier1 });
  });

  return { silhouette, openings };
}

const { silhouette, openings } = build();

// Attic windows are square-headed; the arcades are arched. Both are drawn as
// recesses over the wall mass, so the façade carries two tones instead of
// reading as a flat stencil.
const openingPath = ({ x, w, top, bottom }: Opening) => {
  const l = (x - w).toFixed(1);
  const r = (x + w).toFixed(1);
  const springing = Math.min(top + w, bottom);
  return `M ${l} ${bottom.toFixed(1)} L ${l} ${springing.toFixed(1)} A ${w.toFixed(1)} ${w.toFixed(1)} 0 0 1 ${r} ${springing.toFixed(1)} L ${r} ${bottom.toFixed(1)} Z`;
};

/** The amphitheatre rising out of the hero's base — the one image on the page,
 *  dissolving into the cream before it reaches the headline. */
export function ColosseumBackdrop({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1600 620"
      preserveAspectRatio="xMidYMax slice"
      className={`pointer-events-none h-full w-full text-ink ${className}`}
    >
      <defs>
        <linearGradient id="colosseum-fade" x1="0" y1="180" x2="0" y2="620" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4a4a4a" />
          <stop offset="0.4" stopColor="#dedede" />
          <stop offset="0.72" stopColor="#ffffff" />
        </linearGradient>
        <mask id="colosseum-fade-mask" maskUnits="userSpaceOnUse" x="-400" y="0" width="2400" height="620">
          <rect x="-400" y="0" width="2400" height="620" fill="url(#colosseum-fade)" />
        </mask>
      </defs>
      <g mask="url(#colosseum-fade-mask)" fill="currentColor" transform="translate(0,180)">
        <path d={silhouette} opacity="0.1" />
        {openings.map((opening, i) => (
          <path key={i} d={openingPath(opening)} opacity="0.14" />
        ))}
      </g>
    </svg>
  );
}
