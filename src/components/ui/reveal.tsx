"use client";

import { type ReactNode, useEffect, useState, useSyncExternalStore } from "react";
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

const NUMBER = /^([^0-9]*)(\d+)(.*)$/;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return window.matchMedia(REDUCED_MOTION).matches;
}

export function CountUp({ value, duration = 1800 }: { value: string; duration?: number }) {
  const { ref, isVisible } = useEntranceAnimation<HTMLSpanElement>({ threshold: 0.35 });
  const [display, setDisplay] = useState(() => {
    const match = value.match(NUMBER);
    return match ? `${match[1]}0${match[3]}` : value;
  });

  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);

  useEffect(() => {
    const match = value.match(NUMBER);
    if (!isVisible || !match || reducedMotion) return;
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
  }, [isVisible, value, duration, reducedMotion]);

  return <span ref={ref}>{reducedMotion ? value : display}</span>;
}
