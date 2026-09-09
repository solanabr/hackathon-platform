"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

const START = 0.05;
const STEP = 0.24;
const SPAN = 0.4;

/** Pins the jornada while the three cards ride up into the rail, one at a
 * time and from alternating sides. Progress is the scroll position inside the
 * tall spacer, so the cards never move without the wheel moving. */
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
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const cards = [...node.querySelectorAll<HTMLElement>("[data-journey-card]")];

    if (reduced) {
      cards.forEach((el) => el.style.setProperty("--t", "1"));
      return;
    }

    let raf = 0;
    const paint = () => {
      raf = 0;
      const rect = node.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const p = travel <= 0 ? 1 : Math.min(1, Math.max(0, -rect.top / travel));
      cards.forEach((el, i) => {
        const t = Math.min(1, Math.max(0, (p - (START + i * STEP)) / SPAN));
        el.style.setProperty("--t", (1 - Math.pow(1 - t, 3)).toFixed(4));
      });
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
  }, [reduced]);

  return (
    <section
      ref={sectionRef}
      id="jornada"
      aria-label="Como participar"
      className={`relative hidden lg:block ${reduced ? "" : "h-[280vh]"}`}
    >
      <div
        className={`overflow-x-clip px-4 sm:px-6 lg:px-8 xl:px-12 ${
          reduced ? "pt-24 lg:pt-28" : "sticky top-0 flex h-screen flex-col justify-center"
        }`}
      >
        <div className={containerClassName}>
          {header}
          <div className="mt-10 grid grid-cols-3 gap-6 xl:mt-14">{children}</div>
        </div>
      </div>
    </section>
  );
}
