import Link from "next/link";

/** The LP pill: nav tabs, filters and pill-shaped links share one look. */
export function PillLink({
  href,
  active = false,
  className = "",
  children,
}: {
  href: string;
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`whitespace-nowrap rounded-full border-2 border-green-dark px-4 py-1.5 text-sm font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
        active ? "bg-green-dark text-surface" : "text-ink hover:bg-green-dark/10"
      } ${className}`}
    >
      {children}
    </Link>
  );
}
