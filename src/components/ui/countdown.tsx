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
 * One digit of the board. The swap is a remount: the `key` is the character
 * itself, so a digit only re-animates when it CHANGES — the "1" of 18 stays
 * put while the "8" turns into 9. Otherwise the whole board pulsed each second.
 */
function TickDigit({ char }: { char: string }) {
  return (
    <span key={char} className="tique" suppressHydrationWarning>
      {char}
    </span>
  );
}

/**
 * Renders the time-until a deadline. Two variants:
 *   - "compact" (default): single string like "2d 7h", ticks every 30s. Used
 *     in the dashboard and submission page.
 *   - "segments": DIAS / HORAS / MIN / SEG. Sizes md and lg are four mono
 *     numbers; size xl is the clock board of the closing call. `tone`
 *     switches it between the cream ground and a dark band.
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
  tone = "ink",
}: {
  deadlineIso: string;
  placeholder?: string;
  className?: string;
  variant?: "compact" | "segments";
  size?: "md" | "lg" | "xl";
  tone?: "ink" | "surface";
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

  if (variant === "segments") {
    const tiles: Array<{ value: number; label: string }> = [
      { value: seg?.days ?? 0, label: "dias" },
      { value: seg?.hours ?? 0, label: "horas" },
      { value: seg?.minutes ?? 0, label: "min" },
      { value: seg?.seconds ?? 0, label: "seg" },
    ];
    const hero = size === "xl";
    const onDark = tone === "surface";
    const digitClass = size === "md" ? "text-2xl sm:text-3xl" : "text-4xl sm:text-5xl";
    const labelClass = size === "md" ? "mt-1 text-[10px]" : "mt-2 text-[11px]";
    const dotClass = size === "md" ? "mt-3 sm:mt-4" : "mt-5 sm:mt-6";

    /* The xl size (the LP's closing call) is BRUTALIST: four sharp-cornered
       paper blocks, 2px edge and hard shadow, each with the digit in black
       weight filling the whole box and a solid band with the label beneath.
       Nothing is translucent and nothing overflows — the force comes from the
       block's contrast against the ground, not from subtlety. */
    if (hero) {
      const chars = (value: number) => (seg !== undefined ? pad(value) : "00").split("");

      return (
        <div
          role="timer"
          className={`mx-auto grid max-w-3xl grid-cols-4 gap-2 sm:gap-3 lg:gap-4 ${className}`}
        >
          <span className="sr-only" suppressHydrationWarning>
            {seg === undefined
              ? "Carregando a contagem regressiva"
              : `Faltam ${tiles[0].value} dias, ${tiles[1].value} horas, ${tiles[2].value} minutos e ${tiles[3].value} segundos`}
          </span>
          {tiles.map((tile) => (
            <div
              key={tile.label}
              aria-hidden
              className={`flex flex-col overflow-hidden border-2 border-green-dark bg-surface-raised ${
                onDark ? "shadow-[6px_6px_0_var(--color-green-dark)]" : "shadow-sticker"
              }`}
            >
              <span className="flex flex-1 items-center justify-center px-1 pb-1.5 pt-2 font-heading text-[clamp(2.1rem,9.4vw,6.5rem)] font-black leading-[0.82] tracking-[-0.03em] text-ink [font-stretch:112%] sm:pb-2 sm:pt-3">
                {chars(tile.value).map((c, i) => (
                  <TickDigit key={`${tile.label}-${i}`} char={c} />
                ))}
              </span>
              <span className="border-t-2 border-green-dark bg-green-dark py-1 text-center font-mono text-[8px] font-bold uppercase leading-none tracking-[0.2em] text-surface sm:py-1.5 sm:text-[10px]">
                {tile.label}
              </span>
            </div>
          ))}
        </div>
      );
    }

    const digits = (value: number) => (
      <p
        className={`font-mono font-bold tabular-nums leading-none tracking-tight ${
          onDark ? "text-surface" : "text-ink"
        } ${digitClass}`}
        suppressHydrationWarning
      >
        {seg !== undefined ? pad(value) : "00"}
      </p>
    );
    const caption = (label: string) => (
      <p
        className={`font-mono uppercase tracking-wider ${
          onDark ? "text-surface" : "text-muted"
        } ${labelClass}`}
      >
        {label}
      </p>
    );
    const dot = (key: string) => (
      <span
        key={key}
        aria-hidden
        className={`h-[3px] w-[3px] shrink-0 rounded-full ${
          onDark ? "bg-yellow" : "bg-emerald/60"
        } ${dotClass}`}
      />
    );

    return (
      <div
        className={`flex items-start justify-center gap-3 sm:gap-5 ${className}`}
      >
        {tiles.map((tile, i) => (
          <Fragment key={tile.label}>
            {i > 0 && dot(tile.label)}
            <div className="text-center">
              {digits(tile.value)}
              {caption(tile.label)}
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
