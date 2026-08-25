import Link from "next/link";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface-raised px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-emerald/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <span aria-hidden>←</span>
      {label}
    </Link>
  );
}
