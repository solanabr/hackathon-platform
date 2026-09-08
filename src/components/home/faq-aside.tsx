"use client";

import { useEffect, useRef, type ReactNode } from "react";

const HEADER = 64;

export function FaqAside({ children }: { children: ReactNode }) {
  const holderRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const holder = holderRef.current;
    const inner = innerRef.current;
    const section = holder?.closest("section");
    if (!holder || !inner || !section) return;

    const wide = window.matchMedia("(min-width: 64rem)");
    let frame = 0;

    const unpin = () => {
      inner.style.position = "";
      inner.style.top = "";
      inner.style.left = "";
      inner.style.width = "";
    };

    const measure = () => {
      frame = 0;
      if (!wide.matches) {
        unpin();
        holder.style.minHeight = "";
        return;
      }
      const height = inner.offsetHeight;
      holder.style.minHeight = `${height}px`;
      const holderBox = holder.getBoundingClientRect();
      const sectionBox = section.getBoundingClientRect();
      /* Pinning where the title already sits when the panel meets the header
         is what makes it arrive locked instead of sliding up into place. */
      const pin = HEADER + parseFloat(getComputedStyle(holder.parentElement!).paddingTop);
      if (holderBox.top > pin || sectionBox.bottom <= 0) {
        unpin();
        return;
      }
      inner.style.position = "fixed";
      inner.style.top = `${Math.min(pin, sectionBox.bottom - height)}px`;
      inner.style.left = `${holderBox.left}px`;
      inner.style.width = `${holderBox.width}px`;
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    wide.addEventListener("change", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(section);
    observer.observe(inner);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      wide.removeEventListener("change", schedule);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={holderRef} className="lg:self-start">
      <div ref={innerRef}>{children}</div>
    </div>
  );
}
