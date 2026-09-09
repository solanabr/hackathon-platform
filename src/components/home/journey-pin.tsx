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
      className="journey-pin relative hidden h-[380vh] lg:block"
    >
      {/* Landing on the very top of the pin would show the pitch with no card
          in sight, so the anchor sits where the first one is already rising. */}
      <span
        id="jornada"
        aria-hidden
        className="absolute left-0 top-[16%] h-px w-px"
      />
      <div className="journey-pin-panel sticky top-0 flex h-screen flex-col justify-center overflow-hidden px-4 pt-14 sm:px-6 lg:px-8 xl:px-12">
        <div className={`journey-pin-stack relative ${containerClassName}`}>
          <div
            aria-hidden
            className="journey-pin-guides pointer-events-none absolute -inset-y-[100vh] inset-x-0"
          >
            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-green-dark/15" />
            <span className="absolute inset-x-0 top-1/2 h-px bg-green-dark/15" />
            <svg
              viewBox="0 0 12 12"
              className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 text-emerald"
            >
              <path
                d="M6 0v12M0 6h12"
                stroke="currentColor"
                strokeWidth="1.4"
              />
            </svg>
          </div>

          <div className="journey-pin-pitch relative mx-auto max-w-2xl">
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
