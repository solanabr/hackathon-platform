/* The cup is drawn, not photographed: the whole LP is print — closed ink
   stroke, flat fill inside. That is why the highlight is not a gradient but
   a half painted darker, as in a two-colour screen print. */
export function Trophy({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 226"
      role="img"
      aria-label="Taça de premiação"
      className={className}
    >
      <ellipse cx="100" cy="214" rx="60" ry="8" fill="rgb(27 35 29 / 0.16)" />

      <g
        stroke="var(--color-green-dark)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M50 82C20 80 10 104 26 120c9 9 21 11 30 6"
          fill="none"
          strokeWidth="10"
        />
        <path
          d="M150 82c30-2 40 22 24 38-9 9-21 11-30 6"
          fill="none"
          strokeWidth="10"
        />

        <path
          d="M54 76h92c-2 46-16 76-46 86-30-10-44-40-46-86Z"
          fill="var(--color-yellow)"
        />
        <path
          d="M100 162c30-10 44-40 46-86h-22c-2 40-10 68-24 86Z"
          fill="var(--color-yellow-strong)"
        />
        <path d="M82 92c1 26 6 44 18 58" fill="none" strokeWidth="3" />
        <path d="M100 94v66" fill="none" strokeWidth="3" />

        <rect
          x="46"
          y="56"
          width="108"
          height="20"
          rx="6"
          fill="var(--color-yellow)"
        />
        <path d="M46 68h108" fill="none" strokeWidth="2.5" />

        <path d="M92 162h16v8H92z" fill="var(--color-yellow-strong)" />
        <path
          d="M84 170h32c0 13-6 19-16 19s-16-6-16-19Z"
          fill="var(--color-yellow)"
        />

        <path d="M74 189h52l6 10H68l6-10Z" fill="var(--color-yellow-strong)" />
        <rect
          x="60"
          y="197"
          width="80"
          height="14"
          rx="4"
          fill="var(--color-yellow)"
        />
      </g>
    </svg>
  );
}
