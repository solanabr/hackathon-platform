"use client";

import { type PointerEvent, type ReactNode, useRef } from "react";

/** Lets a flat card behave like an object: it tilts a few degrees toward the
 * mouse and settles back. Style is mutated directly so nothing re-renders;
 * touch pointers and reduced-motion users get the static base rotation. */
export function Tilt({
  children,
  max = 6,
  className = "",
}: {
  children: ReactNode;
  max?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useRef<MediaQueryList | null>(null);

  const apply = (rx: number, ry: number, animate: boolean) => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = animate ? "transform 450ms cubic-bezier(0.2, 0.8, 0.3, 1)" : "none";
    el.style.transform = `perspective(1200px) rotate(var(--tilt-base, 0deg)) rotateX(${rx}deg) rotateY(${ry}deg)`;
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    reducedMotion.current ??= window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.current.matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    apply(-py * max * 2, px * max * 2, false);
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={() => apply(0, 0, true)}
      className={className}
      style={{
        transform: "perspective(1200px) rotate(var(--tilt-base, 0deg))",
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}
