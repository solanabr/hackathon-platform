"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";

type NavLink = { href: string; label: string };
type PageNav = { links: NavLink[]; accent?: NavLink };

// Section jump links per public page; pages not listed render nothing.
const NAV: Record<string, PageNav> = {
  "/": {
    links: [
      { href: "#jornada", label: "Como funciona" },
      { href: "#cases", label: "Cases" },
      { href: "#calendario", label: "Calendário" },
      { href: "#trilha-brasil", label: "Trilha Brasil" },
      { href: "#recursos", label: "Recursos" },
      { href: "#faq", label: "FAQ" },
    ],
  },
  "/h": {
    links: [
      { href: "#edicoes", label: "Edições" },
      { href: "#como-funciona", label: "Como funciona" },
    ],
    accent: { href: "/", label: "Colosseum 2026" },
  },
};

export function LpSectionNav() {
  const pathname = usePathname();
  const nav = NAV[pathname];
  if (!nav) return null;

  return (
    <nav aria-label="Seções da página" className="hidden lg:flex lg:items-center lg:gap-1">
      {nav.links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-bold text-surface/80 transition-colors duration-150 hover:bg-surface/10 hover:text-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-green-dark"
        >
          {link.label}
        </a>
      ))}
      {nav.accent && (
        <Link
          href={nav.accent.href}
          className="ml-2 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-yellow px-3.5 py-1 text-sm font-bold text-yellow transition-colors duration-150 hover:bg-yellow hover:text-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-green-dark"
        >
          {nav.accent.label}
          <ArrowRightIcon size={14} weight="bold" aria-hidden />
        </Link>
      )}
    </nav>
  );
}
