"use client";

import { usePathname } from "next/navigation";
import { PillLink } from "@/components/ui/pill-link";

const TABS = [
  { path: "", label: "Visão geral" },
  { path: "/page", label: "Página" },
  { path: "/content", label: "Conteúdos" },
  { path: "/sponsors", label: "Marcas" },
  { path: "/judges", label: "Jurados" },
  { path: "/finalistas", label: "Finalistas" },
] as const;

/** Edition admin section tabs, mirroring PainelNav's pill language. */
export function AdminEditionNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/admin/h/${slug}`;

  return (
    <nav
      aria-label="Seções da administração"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
    >
      {TABS.map((tab) => {
        const href = `${base}${tab.path}`;
        const active =
          tab.path === "" ? pathname === base : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <PillLink key={tab.path} href={href} active={active}>
            {tab.label}
          </PillLink>
        );
      })}
    </nav>
  );
}
