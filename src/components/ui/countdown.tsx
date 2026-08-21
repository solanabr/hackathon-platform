"use client";

import { useEffect, useState } from "react";

type Segments = { days: number; hours: number; minutes: number; seconds: number };

function diffSegments(deadlineMs: number, nowMs: number): Segments | null {
  const diff = deadlineMs - nowMs;
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1_000) % 60),
  };
}

function formatCompact(seg: Segments | null): string {
  if (!seg) return "Encerrado";
  if (seg.days > 0) return `${seg.days}d ${seg.hours}h`;
  if (seg.hours > 0) return `${seg.hours}h ${seg.minutes}m`;
  return `${seg.minutes}m`;
}

const pad = (n: number) => n.toString().padStart(2, "0");

/**
 * Renders the time-until a deadline. Two variants:
 *   - "compact" (default): single string like "2d 7h", ticks every 30s. Used
 *     in the dashboard and submission page.
 *   - "segments": four big tiles (DIAS / HORAS / MIN / SEG), ticks every 1s.
 *     Used in the hero countdown card.
 *
 * SSR renders the `placeholder` (compact) or zeroed tiles (segments) to
 * avoid hydration mismatch from Date.now() differing between server and
 * client.
 */
export function Countdown({
  deadlineIso,
  placeholder = "—",
  className = "",
  variant = "compact",
}: {
  deadlineIso: string;
  placeholder?: string;
  className?: string;
  variant?: "compact" | "segments";
}) {
  const deadlineMs = new Date(deadlineIso).getTime();
  const [seg, setSeg] = useState<Segments | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const tick = () => setSeg(diffSegments(deadlineMs, Date.now()));
    tick();
    const intervalMs = variant === "segments" ? 1_000 : 30_000;
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [deadlineMs, variant]);

  if (variant === "segments") {
    const tiles: Array<{ value: number; label: string }> = [
      { value: seg?.days ?? 0, label: "dias" },
      { value: seg?.hours ?? 0, label: "horas" },
      { value: seg?.minutes ?? 0, label: "min" },
      { value: seg?.seconds ?? 0, label: "seg" },
    ];
    return (
      <div className={`grid grid-cols-4 gap-2 sm:gap-3 ${className}`}>
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-2xl border border-green/15 bg-surface-raised px-2 py-4 text-center"
          >
            <p
              className="font-heading text-3xl font-bold tabular-nums text-ink sm:text-4xl"
              suppressHydrationWarning
            >
              {mounted ? pad(tile.value) : "00"}
            </p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
              {tile.label}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <span className={className}>{mounted ? formatCompact(seg) : placeholder}</span>
  );
}
