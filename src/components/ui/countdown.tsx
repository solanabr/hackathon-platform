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
 * Renders the time-until a deadline. Three variants:
 *   - "compact" (default): single string like "2d 7h", ticks every 30s. Used
 *     in the dashboard and submission page.
 *   - "segments": four large mono digits (DIAS / HORAS / MIN / SEG), ticks
 *     every 1s. Used in the hero countdown card.
 *   - "backdrop": giant mono digits (DD:HH:MM:SS) with small unit labels,
 *     ticks every 1s. Decorative watermark above the closing CTA card, so it
 *     is aria-hidden: the deadline itself is stated in the calendar and FAQ.
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
  size = "lg",
}: {
  deadlineIso: string;
  placeholder?: string;
  className?: string;
  variant?: "compact" | "segments" | "backdrop";
  size?: "md" | "lg" | "xl";
}) {
  const deadlineMs = new Date(deadlineIso).getTime();
  // undefined = no client tick yet (SSR and first paint), null = expired.
  // Collapsing the two would show the placeholder forever past the deadline.
  const [seg, setSeg] = useState<Segments | null | undefined>(undefined);

  useEffect(() => {
    const tick = () => setSeg(diffSegments(deadlineMs, Date.now()));
    tick();
    const intervalMs = variant === "compact" ? 30_000 : 1_000;
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [deadlineMs, variant]);

  if (variant === "backdrop") {
    const groups: Array<{ value: number; label: string }> = [
      { value: seg?.days ?? 0, label: "dias" },
      { value: seg?.hours ?? 0, label: "horas" },
      { value: seg?.minutes ?? 0, label: "min" },
      { value: seg?.seconds ?? 0, label: "seg" },
    ];
    return (
      <div
        aria-hidden
        className={`flex select-none items-start justify-center whitespace-nowrap font-mono font-black leading-none tabular-nums tracking-tighter ${className}`}
      >
        {groups.map((group, i) => (
          <Fragment key={group.label}>
            {i > 0 && <span className="opacity-60">:</span>}
            <div className="text-center">
              <span className="block" suppressHydrationWarning>
                {pad(seg !== undefined ? group.value : 0)}
              </span>
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.3em] sm:mt-2 sm:text-xs lg:text-sm">
                {group.label}
              </span>
            </div>
          </Fragment>
        ))}
      </div>
    );
  }

  if (variant === "segments") {
    const tiles: Array<{ value: number; label: string }> = [
      { value: seg?.days ?? 0, label: "dias" },
      { value: seg?.hours ?? 0, label: "horas" },
      { value: seg?.minutes ?? 0, label: "min" },
      { value: seg?.seconds ?? 0, label: "seg" },
    ];
    const digitClass =
      size === "md"
        ? "text-2xl sm:text-3xl"
        : size === "xl"
          ? "text-[3.25rem] sm:text-[5.5rem] lg:text-[7rem]"
          : "text-4xl sm:text-5xl";
    const labelClass =
      size === "md"
        ? "mt-1 text-[10px]"
        : size === "xl"
          ? "mt-2 text-[11px] tracking-[0.2em] sm:mt-3 sm:text-xs"
          : "mt-2 text-[11px]";
    const dotClass = size === "md" ? "mt-3 sm:mt-4" : size === "xl" ? "mt-7 sm:mt-12 lg:mt-16" : "mt-5 sm:mt-6";
    return (
      <div
        className={`flex items-start justify-center ${size === "xl" ? "gap-4 sm:gap-8 lg:gap-10" : "gap-3 sm:gap-5"} ${className}`}
      >
        {tiles.map((tile, i) => (
          <Fragment key={tile.label}>
            {i > 0 && (
              <span
                aria-hidden
                className={`h-[2px] w-[2px] shrink-0 rounded-full bg-emerald/60 ${dotClass}`}
              />
            )}
            <div className="text-center">
              <p
                className={`font-mono font-bold tabular-nums leading-none tracking-tight text-ink ${digitClass}`}
                suppressHydrationWarning
              >
                {seg !== undefined ? pad(tile.value) : "00"}
              </p>
              <p className={`font-mono uppercase tracking-wider text-muted ${labelClass}`}>
                {tile.label}
              </p>
            </div>
          </Fragment>
        ))}
      </div>
    );
  }

  return (
    <span className={className}>{seg !== undefined ? formatCompact(seg) : placeholder}</span>
  );
}
