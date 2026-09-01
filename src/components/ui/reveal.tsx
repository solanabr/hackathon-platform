"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useEntranceAnimation } from "@/hooks/use-entrance-animation";

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, isVisible } = useEntranceAnimation<HTMLDivElement>({ threshold: 0.15 });
  return (
    <div
      ref={ref}
      className={`reveal ${isVisible ? "reveal-in" : ""} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

export function CountUp({ value, duration = 1300 }: { value: string; duration?: number }) {
  const { ref, isVisible } = useEntranceAnimation<HTMLSpanElement>({ threshold: 0.6 });
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!isVisible) return;
    const match = value.match(/^([^0-9]*)(\d+)(.*)$/);
    if (!match || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const [, prefix, digits, suffix] = match;
    const target = parseInt(digits, 10);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(`${prefix}${Math.round(target * eased)}${suffix}`);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isVisible, value, duration]);

  return <span ref={ref}>{display}</span>;
}
