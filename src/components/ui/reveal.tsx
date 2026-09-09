"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useEntranceAnimation } from "@/hooks/use-entrance-animation";
import { readMotionSeconds } from "@/lib/motion";

/** Como o elemento entra. O tom escolhe distância, stagger e curva de uma vez
 * — a decisão é "que tipo de coisa é isso", não "quantos pixels e quantos ms". */
type RevealTone =
  /** linhas de texto: anda pouco, entra apertado */
  | "texto"
  /** o padrão: um bloco de conteúdo */
  | "objeto"
  /** card, ticket, selo — objeto de papel, entra carimbado */
  | "papel"
  /** o que a seção quer que você olhe: vem de mais longe */
  | "longe";

const TONE_CLASS: Record<RevealTone, string> = {
  texto: "reveal-texto",
  objeto: "",
  papel: "reveal-papel",
  longe: "reveal-longe",
};

export function Reveal({
  children,
  index = 0,
  tone = "objeto",
  className = "",
}: {
  children: ReactNode;
  /** Posição na família. O intervalo entre um e o próximo sai do token de
   * stagger, nunca de um número de ms digitado no call site. */
  index?: number;
  tone?: RevealTone;
  className?: string;
}) {
  const { ref, isVisible } = useEntranceAnimation<HTMLDivElement>({
    threshold: 0.15,
    // Dispara quando o elemento entra de verdade no campo de leitura, não
    // quando encosta a primeira linha de pixels na borda de baixo.
    rootMargin: "0px 0px -10% 0px",
  });

  return (
    <div
      ref={ref}
      className={`reveal ${TONE_CLASS[tone]} ${isVisible ? "reveal-in" : ""} ${className}`
        .replace(/\s+/g, " ")
        .trim()}
      style={index ? ({ "--reveal-i": index } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}

export function CountUp({ value }: { value: string }) {
  const { ref, isVisible } = useEntranceAnimation<HTMLSpanElement>({ threshold: 0.6 });
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!isVisible) return;
    const match = value.match(/^([^0-9]*)(\d+)(.*)$/);
    if (!match) return;
    const [, prefix, digits, suffix] = match;
    const target = parseInt(digits, 10);

    // A contagem é uma entrada narrativa e usa a mesma escala de tempo do
    // resto: em movimento reduzido o token já vem encurtado, então o número
    // ainda conta — só não fica rolando meio segundo na tela.
    const duration = readMotionSeconds("--dur-lenta", 1.25) * 1000;

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Mesma sensação de --ease-entrada: quase tudo no primeiro terço, e o
      // resto só assentando. Um count-up linear denuncia o cronômetro.
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(`${prefix}${Math.round(target * eased)}${suffix}`);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isVisible, value]);

  return <span ref={ref}>{display}</span>;
}
