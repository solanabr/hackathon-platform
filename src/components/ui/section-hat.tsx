import type { ReactNode } from "react";

export function SectionHat({
  children,
  centered = false,
  onDark = false,
}: {
  children: ReactNode;
  centered?: boolean;
  onDark?: boolean;
}) {
  return (
    <p
      className={`flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] ${onDark ? "text-surface" : "text-ink/75"} ${centered ? "justify-center" : ""}`}
    >
      <span
        aria-hidden
        className={`h-[7px] w-[18px] shrink-0 rounded-[2px] ${onDark ? "bg-yellow" : "bg-emerald"}`}
      />
      {children}
    </p>
  );
}
