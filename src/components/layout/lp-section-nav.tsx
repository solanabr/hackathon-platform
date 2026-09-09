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
      { href: "#cases", label: "O hackathon" },
      { href: "#jornada", label: "Como participar" },
      { href: "#premiacoes", label: "Premiações" },
      { href: "#comunidade", label: "Comunidade" },
      { href: "#faq", label: "Dúvidas" },
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
    <nav aria-label="Seções da página" className="hidden lg:flex lg:items-center lg:gap-2">
      {nav.links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-ink/75 transition-colors duration-(--dur-instant) ease-entrada hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          {link.label}
        </a>
      ))}
      {nav.accent && (
        <Link
          href={nav.accent.href}
          className="ml-2 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-green-dark/25 px-3.5 py-1 text-sm font-medium text-ink transition-colors duration-(--dur-instant) ease-entrada hover:border-emerald-deep hover:bg-emerald-deep hover:text-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          {nav.accent.label}
          <ArrowRightIcon size={14} weight="bold" aria-hidden />
        </Link>
      )}
    </nav>
  );
}
