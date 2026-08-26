"use client";

import { usePathname } from "next/navigation";
import { PillLink } from "@/components/ui/pill-link";

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
          <PillLink key={tab.path} href={href} active={active}>
            {tab.label}
          </PillLink>
        );
      })}
    </nav>
  );
}
