"use client";

import { type ReactNode, useEffect, useState, useSyncExternalStore } from "react";
import { useEntranceAnimation } from "@/hooks/use-entrance-animation";
import { readMotionSeconds } from "@/lib/motion";

/** How the element enters. The tone picks distance, stagger and curve at once:
 * the decision is "what kind of thing is this", not "how many pixels and ms". */
type RevealTone =
  /** lines of text: travels little, enters tight */
  | "texto"
  /** the default: a block of content */
  | "objeto"
  /** card, ticket, stamp: a paper object, enters stamped */
  | "papel"
  /** what the section wants you to look at: comes from further away */
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
  /** Position in the family. The gap to the next one comes from the stagger
   * token, never from a number of ms typed at the call site. */
  index?: number;
  tone?: RevealTone;
  className?: string;
}) {
  const { ref, isVisible } = useEntranceAnimation<HTMLDivElement>({
    threshold: 0.15,
    // Fires when the element truly enters the reading area, not when its
    // first row of pixels touches the bottom edge.
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

export function CountUp({ value }: { value: string }) {
  const { ref, isVisible } = useEntranceAnimation<HTMLSpanElement>({ threshold: 0.35 });
  // The server HTML carries the real number: crawlers and no-JS readers must
  // never see "0B". The zero appears only once the animation is about to run.
  const [display, setDisplay] = useState(value);

  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);

  useEffect(() => {
    const match = value.match(NUMBER);
    if (!isVisible || !match || reducedMotion) return;
    const [, prefix, digits, suffix] = match;
    const target = parseInt(digits, 10);

    // The count is a narrative entrance on the same time scale as the rest:
    // under reduced motion the token is already shortened, so the number
    // still counts, it just does not roll on screen for half a second.
    const duration = readMotionSeconds("--dur-lenta", 1.25) * 1000;

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Same feel as --ease-entrada: almost everything in the first third and
      // the rest settling. A linear count-up gives the stopwatch away.
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(`${prefix}${Math.round(target * eased)}${suffix}`);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isVisible, value, reducedMotion]);

  return <span ref={ref}>{reducedMotion ? value : display}</span>;
}
