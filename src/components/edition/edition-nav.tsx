"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; badge?: string | null };

export function EditionNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Seções do hackathon"
      className="sticky top-[68px] z-40 -mx-4 border-b border-green/10 bg-surface/85 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <ul className="mx-auto flex max-w-5xl gap-1 overflow-x-auto scrollbar-hide">
        {items.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  active
                    ? "border-emerald text-ink"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {item.label}
                {item.badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      active ? "bg-emerald text-surface" : "bg-green/10 text-muted"
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
  );
}
