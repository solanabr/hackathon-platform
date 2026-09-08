type Shape = "badge" | "arena" | "community" | "question";

const STROKE = 3.5;

/** Cadastro: o crachá que sai do formulário, com o carimbo de confirmado. */
function Badge() {
  return (
    <g>
      <rect
        x="44"
        y="32"
        width="92"
        height="84"
        rx="10"
        fill="var(--color-yellow)"
        transform="rotate(-7 90 74)"
      />
      <rect
        x="62"
        y="24"
        width="96"
        height="88"
        rx="10"
        fill="var(--color-surface-raised)"
        stroke="currentColor"
        strokeWidth={STROKE}
      />
      <circle cx="88" cy="52" r="12" fill="var(--color-emerald)" />
      <path d="M74 78a14 14 0 0 1 28 0z" fill="var(--color-emerald)" />
      <path
        d="M114 46h30M114 60h22"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M78 96h64"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.22"
      />
      <circle
        cx="152"
        cy="102"
        r="15"
        fill="var(--color-emerald)"
        stroke="currentColor"
        strokeWidth={STROKE}
      />
      <path
        d="M145 102l5 5 9-11"
        fill="none"
        stroke="var(--color-surface-raised)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** Colosseum: a fachada elíptica em duas arcadas, o sol atrás. */
function Arena() {
  const arch = (cx: number, base: number, top: number) =>
    `M${cx - 11} ${base}V${top + 11}a11 11 0 0 1 22 0V${base}z`;

  return (
    <g>
      <circle cx="56" cy="40" r="21" fill="var(--color-yellow)" />
      <path
        d="M44 122V78a56 34 0 0 1 112 0v44z"
        fill="var(--color-surface-raised)"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      {[72, 100, 128].map((cx) => (
        <path
          key={`t1-${cx}`}
          d={arch(cx, 92, 62)}
          fill={cx === 100 ? "var(--color-emerald)" : "currentColor"}
        />
      ))}
      <path d="M44 97h112" stroke="currentColor" strokeWidth="3" />
      {[72, 100, 128].map((cx) => (
        <path
          key={`t2-${cx}`}
          d={arch(cx, 122, 103)}
          fill={cx === 100 ? "var(--color-emerald)" : "currentColor"}
        />
      ))}
      <path
        d="M26 122h148"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </g>
  );
}

/** Comunidade: o grupo dentro do balão. */
function Community() {
  const figure = (cx: number, cy: number, r: number, fill: string) => (
    <g key={cx} fill={fill}>
      <circle cx={cx} cy={cy} r={r} />
      <path d={`M${cx - r - 5} 84a${r + 5} ${r + 5} 0 0 1 ${2 * r + 10} 0z`} />
    </g>
  );

  return (
    <g>
      <rect x="66" y="14" width="106" height="60" rx="14" fill="var(--color-yellow)" />
      <path
        d="M60 28h84a14 14 0 0 1 14 14v40a14 14 0 0 1-14 14h-40l-30 20 10-20H60a14 14 0 0 1-14-14V42a14 14 0 0 1 14-14z"
        fill="var(--color-surface-raised)"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      {figure(76, 56, 9, "var(--color-emerald)")}
      {figure(102, 50, 10, "currentColor")}
      {figure(128, 56, 9, "var(--color-emerald)")}
    </g>
  );
}

/** FAQ: o balão da pergunta com a resposta chegando por trás. */
function Question() {
  return (
    <g>
      <rect
        x="20"
        y="34"
        width="102"
        height="76"
        rx="16"
        fill="var(--color-yellow)"
        transform="rotate(-9 71 72)"
      />
      <path
        d="M48 16h92a16 16 0 0 1 16 16v52a16 16 0 0 1-16 16H92l-26 20 7-20H48a16 16 0 0 1-16-16V32a16 16 0 0 1 16-16z"
        fill="var(--color-surface-raised)"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <path
        d="M78 50a16 16 0 1 1 16 16v8"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle cx="94" cy="86" r="5.5" fill="currentColor" />
      <circle
        cx="162"
        cy="106"
        r="21"
        fill="var(--color-emerald)"
        stroke="currentColor"
        strokeWidth={STROKE}
      />
      {[152, 162, 172].map((cx) => (
        <circle key={cx} cx={cx} cy="106" r="2.8" fill="var(--color-surface-raised)" />
      ))}
    </g>
  );
}

const SHAPES: Record<Shape, () => React.JSX.Element> = {
  badge: Badge,
  arena: Arena,
  community: Community,
  question: Question,
};

/** Ilustração de um passo da jornada — vetor no traço da marca, sem asset. */
export function StepGlyph({ shape, className }: { shape: Shape; className?: string }) {
  const Art = SHAPES[shape];
  return (
    <svg viewBox="0 0 200 140" aria-hidden role="presentation" className={className}>
      <Art />
    </svg>
  );
}
