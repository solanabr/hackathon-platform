"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; badge?: string | null };

export function EditionNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="sticky top-[69px] z-40 border-b border-green/10 bg-surface/80 backdrop-blur-md">
      <nav
        aria-label="Seções do hackathon"
        className="mx-auto max-w-5xl px-4 py-3 sm:px-6 lg:px-8"
      >
        <ul className="scrollbar-hide flex gap-1.5 overflow-x-auto rounded-full border border-green/15 bg-surface-raised p-1.5 shadow-[0_4px_16px_rgba(0,140,76,0.06)]">
          {items.map((item) => {
            const active =
              pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
            return (
              <li key={item.href} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised ${
                    active
                      ? "bg-ink text-surface shadow-[0_2px_8px_rgba(27,35,29,0.25)]"
                      : "text-muted hover:bg-green/6 hover:text-ink"
                  }`}
                >
                  {item.label}
                  {item.badge && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                        active ? "bg-surface/25 text-surface" : "bg-green/10 text-muted"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
