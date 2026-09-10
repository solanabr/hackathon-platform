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
 * Um algarismo do painel. A troca é uma remontagem: a `key` é o próprio
 * caractere, então o dígito só reanima quando MUDA — o "1" de 18 fica parado
 * enquanto o "8" vira 9. Sem isso o placar inteiro pulsaria a cada segundo.
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
 *   - "segments": DIAS / HORAS / MIN / SEG. Sizes md and lg são quatro números
 *     mono; size xl é o painel de relógio da última chamada. `tone`
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

    /* O tamanho xl (a última chamada da LP) é um PAINEL DE RELÓGIO: quatro
       pás iguais e o algarismo TRANSBORDANDO a aresta de cima, porque quem
       manda no bloco é o número, não a caixa. Nenhuma peça é maior que a
       outra — a leitura vem do tamanho do dígito, e a pá é só o papel atrás.
       O algarismo é condensado (eixo wdth do Archivo) e leve: é o único lugar
       da marca onde o peso preto atrapalharia: em corpo de 8rem o black vira
       mancha. */
    if (hero) {
      const chars = (value: number) => (seg !== undefined ? pad(value) : "00").split("");
      const panelBg = onDark ? "bg-surface/10" : "bg-ink/[0.06]";
      const seamBg = onDark ? "bg-ink/15" : "bg-ink/[0.05]";
      const numTone = onDark ? "text-surface-raised" : "text-ink";
      const labelTone = onDark ? "text-surface/70" : "text-muted";

      return (
        <div
          role="timer"
          className={`mx-auto grid max-w-2xl grid-cols-4 gap-2 pt-4 sm:gap-3 sm:pt-6 lg:gap-4 ${className}`}
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
              className={`relative h-[58px] rounded-[3px] sm:h-[104px] lg:h-[132px] ${panelBg}`}
            >
              <span className={`absolute inset-x-0 top-0 h-[18%] rounded-t-[3px] ${seamBg}`} />
              <span
                className={`absolute inset-x-0 bottom-[24%] flex justify-center font-heading text-[3.6rem] font-light leading-none tracking-tight [font-stretch:74%] sm:text-[6.4rem] lg:text-[8.25rem] ${numTone}`}
              >
                {chars(tile.value).map((c, i) => (
                  <TickDigit key={`${tile.label}-${i}`} char={c} />
                ))}
              </span>
              <span
                className={`absolute inset-x-0 bottom-[7%] text-center font-mono text-[8px] uppercase leading-none tracking-[0.18em] sm:text-[10px] ${labelTone}`}
              >
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
