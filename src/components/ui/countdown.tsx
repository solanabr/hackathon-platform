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
 *     every 1s. `tone` switches it between the cream ground and a dark band.
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
    /* Só o tamanho xl (a última chamada da LP) tem hierarquia interna. Quatro
       números do mesmo corpo dão ao "05 SEG" — que muda a cada segundo e não
       decide nada — o mesmo peso do "33 DIAS", que é a informação. O dia vira
       o número da seção; hora, minuto e segundo viram o relógio de apoio ao
       lado, alinhados pela base para o olho ler uma linha só. */
    const hero = size === "xl";
    const digitClass =
      size === "md"
        ? "text-2xl sm:text-3xl"
        : hero
          ? "text-[2.1rem] sm:text-[3.1rem] lg:text-[3.9rem]"
          : "text-4xl sm:text-5xl";
    const leadDigitClass = "text-[4rem] sm:text-[6.75rem] lg:text-[8.75rem]";
    /* Sobre o esmeralda, creme com alpha não passa AA em corpo pequeno — o
       teto do par é 5.21:1 e só com alpha cheio. E o amarelo do rótulo-líder
       dá 4.30:1, que reprova como texto pequeno e passa como texto grande:
       por isso "DIAS" é 19px bold, tamanho de legenda do número, não de nota
       de rodapé. */
    const labelClass =
      size === "md"
        ? "mt-1 text-[10px]"
        : hero
          ? "mt-2 text-[11px] tracking-[0.2em]"
          : "mt-2 text-[11px]";
    const leadLabelClass = "mt-2 text-[19px] font-bold tracking-[0.2em]";
    const dotClass =
      size === "md" ? "mt-3 sm:mt-4" : hero ? "mb-7 sm:mb-9 lg:mb-11" : "mt-5 sm:mt-6";
    const onDark = tone === "surface";

    const digits = (value: number, lead: boolean) => (
      <p
        className={`font-mono font-bold tabular-nums leading-none tracking-tight ${
          onDark ? "text-surface" : "text-ink"
        } ${lead ? leadDigitClass : digitClass}`}
        suppressHydrationWarning
      >
        {seg !== undefined ? pad(value) : "00"}
      </p>
    );
    const caption = (label: string, lead: boolean) => (
      <p
        className={`font-mono uppercase tracking-wider ${
          onDark ? (lead ? "text-yellow" : "text-surface") : "text-muted"
        } ${lead && hero ? leadLabelClass : labelClass}`}
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

    if (hero) {
      const [lead, ...rest] = tiles;
      return (
        <div
          className={`flex items-end justify-center gap-5 sm:gap-8 lg:gap-10 ${className}`}
        >
          <div className="text-center">
            {digits(lead.value, true)}
            {caption(lead.label, true)}
          </div>
          <div className="flex items-end gap-3 sm:gap-5">
            {rest.map((tile, i) => (
              <Fragment key={tile.label}>
                {i > 0 && dot(tile.label)}
                <div className="text-center">
                  {digits(tile.value, false)}
                  {caption(tile.label, false)}
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div
        className={`flex items-start justify-center gap-3 sm:gap-5 ${className}`}
      >
        {tiles.map((tile, i) => (
          <Fragment key={tile.label}>
            {i > 0 && dot(tile.label)}
            <div className="text-center">
              {digits(tile.value, false)}
              {caption(tile.label, false)}
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
