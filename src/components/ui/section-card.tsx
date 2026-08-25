import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "./card";

export function SectionCard({
  title,
  action,
  children,
  className = "",
  sticker = false,
}: {
  title: string;
  action?: { href: string; label: string };
  children: ReactNode;
  className?: string;
  sticker?: boolean;
}) {
  return (
    <Card sticker={sticker} className={`flex flex-col p-6 sm:p-7 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate font-heading text-xl font-bold">{title}</h2>
        </div>
        {action && (
          <Link
            href={action.href}
            className="shrink-0 rounded-full border border-green-dark/15 px-3.5 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-emerald/40 hover:bg-emerald/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            {action.label}
          </Link>
        )}
      </div>
      <div className="mt-5 flex-1">{children}</div>
    </Card>
  );
}

export function StatusChip({
  tone,
  children,
}: {
  tone: "ok" | "pending" | "muted";
  children: ReactNode;
}) {
  const tones = {
    ok: "bg-emerald/12 text-emerald",
    pending: "bg-yellow/30 text-ink",
    muted: "bg-green/8 text-muted",
  } as const;

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function CheckRow({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      <span
        aria-hidden
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
          done ? "bg-emerald text-surface" : "border border-green-dark/15 bg-transparent text-transparent"
        }`}
      >
        ✓
      </span>
      <span className={done ? "text-muted line-through decoration-green/30" : ""}>{children}</span>
    </li>
  );
}
