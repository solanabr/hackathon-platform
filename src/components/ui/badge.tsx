type Tone = "yellow" | "emerald" | "neutral";

const tones: Record<Tone, string> = {
  yellow: "bg-yellow/15 text-yellow border-yellow/30",
  emerald: "bg-emerald/15 text-emerald border-emerald/30",
  neutral: "bg-white/5 text-muted border-white/10",
};

export function Badge({
  tone = "neutral",
  mono = false,
  children,
}: {
  tone?: Tone;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
        mono ? "font-mono text-[11px] tabular-nums" : ""
      } ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
