"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { path: "dashboard", label: "Visão geral" },
  { path: "team", label: "Time" },
  { path: "submission", label: "Submissão" },
  { path: "content", label: "Conteúdos" },
] as const;

/** DoraHacks-style section tabs, in the LP pill language. */
export function PainelNav({ slug }: { slug: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Seções do painel"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
    >
      {TABS.map((tab) => {
        const href = `/h/${slug}/${tab.path}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={tab.path}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-full border-2 border-green-dark px-4 py-1.5 text-sm font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
              active ? "bg-green-dark text-surface" : "text-ink hover:bg-green-dark/10"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
