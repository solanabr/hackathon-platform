"use client";

import { type ReactNode, useEffect, useRef } from "react";

const STEP = 0.21;
const SPAN = 0.33;

/** Pins the jornada: the pitch starts centred and each card rides up through
 * the screen from an alternating side, landing side by side in the row while
 * the pitch settles at the top. Progress is the scroll position inside the
 * tall spacer, so nothing moves on its own.
 *
 * Reduced motion and no-JS keep the resting layout — the pin unwinds in
 * globals.css so both paths render the same markup. */
export function JourneyPin({
  header,
  children,
  containerClassName = "",
}: {
  header: ReactNode;
  children: ReactNode;
  containerClassName?: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cards = [
      ...node.querySelectorAll<HTMLElement>("[data-journey-card]"),
    ];
    const pitch = node.querySelector<HTMLElement>(".journey-pin-pitch");
    let raf = 0;
    const paint = () => {
      raf = 0;
      const rect = node.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const p = travel <= 0 ? 1 : Math.min(1, Math.max(0, -rect.top / travel));
      cards.forEach((el, i) => {
        const t = Math.min(1, Math.max(0, (p - i * STEP) / SPAN));
        el.style.setProperty("--t", t.toFixed(4));
      });
      // The pitch clears the way as the first card comes in to land.
      const first = Math.min(1, Math.max(0, p / SPAN));
      pitch?.style.setProperty("--pp", first.toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="Como participar"
      className="journey-pin relative isolate hidden h-[380vh] lg:block"
    >
      {/* Kraft bleeds past the section so it meets the Informações sheet with
          no cream stripe in the margin between them. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-28 top-0 -z-10 bg-surface-kraft"
      />
      {/* Landing on the very top of the pin would show the pitch with no card
          in sight, so the anchor sits where the first one is already rising. */}
      <span
        id="jornada"
        aria-hidden
        className="absolute left-0 top-[16%] h-px w-px"
      />
      <div className="journey-pin-panel sticky top-0 flex h-screen flex-col justify-center overflow-hidden pt-14">
        <div className={`journey-pin-stack relative ${containerClassName}`}>
          <div className="journey-pin-pitch relative mx-auto max-w-4xl">
            {header}
          </div>
          <div className="relative mt-6 grid grid-cols-3 gap-6 xl:mt-8">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
