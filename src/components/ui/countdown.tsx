"use client";

import { Fragment, useEffect, useState } from "react";

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
 *   - "segments": four large mono digits (DIAS / HORAS / MIN / SEG), ticks
 *     every 1s. Used in the hero countdown card.
 *
 * SSR renders the `placeholder` (compact) or zeroed tiles (segments) to
 * avoid hydration mismatch from Date.now() differing between server and
 * client.
 */
export function Countdown({
  deadlineIso,
  placeholder = "-",
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
      <div className={`flex items-start justify-center gap-3 sm:gap-5 ${className}`}>
        {tiles.map((tile, i) => (
          <Fragment key={tile.label}>
            {i > 0 && (
              <span
                aria-hidden
                className="mt-3 h-[2px] w-[2px] shrink-0 rounded-full bg-emerald/60 sm:mt-4"
              />
            )}
            <div className="text-center">
              <p
                className="font-mono text-4xl font-bold tabular-nums tracking-tight text-ink sm:text-5xl"
                suppressHydrationWarning
              >
                {mounted ? pad(tile.value) : "00"}
              </p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-muted">
                {tile.label}
              </p>
            </div>
          </Fragment>
        ))}
      </div>
    );
  }

  return (
    <span className={className}>{mounted ? formatCompact(seg) : placeholder}</span>
  );
}
