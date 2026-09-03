"use client";

import { usePathname } from "next/navigation";

const LINKS = [
  { href: "#jornada", label: "Como funciona" },
  { href: "#cases", label: "Cases" },
  { href: "#calendario", label: "Calendário" },
  { href: "#trilha-brasil", label: "Trilha Brasil" },
  { href: "#recursos", label: "Recursos" },
  { href: "#faq", label: "FAQ" },
];

/** Section jump links for the campaign LP only; hidden on every other page. */
export function LpSectionNav() {
  const pathname = usePathname();
  if (pathname !== "/") return null;

  return (
    <nav aria-label="Seções da página" className="hidden lg:flex lg:items-center lg:gap-1">
      {LINKS.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-bold text-surface/80 transition-colors duration-150 hover:bg-surface/10 hover:text-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-green-dark"
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
