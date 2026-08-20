type Tone = "yellow" | "emerald" | "neutral";

const tones: Record<Tone, string> = {
  yellow: "bg-yellow text-ink",
  emerald: "bg-emerald text-surface",
  neutral: "bg-green/10 text-muted",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
}