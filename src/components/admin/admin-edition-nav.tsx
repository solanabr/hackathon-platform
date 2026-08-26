"use client";

import { usePathname } from "next/navigation";
import { SegmentedNav } from "@/components/ui/segmented";

const TABS = [
  { path: "", label: "Visão geral" },
  { path: "/page", label: "Página" },
  { path: "/content", label: "Conteúdos" },
  { path: "/sponsors", label: "Marcas" },
  { path: "/judges", label: "Jurados" },
  { path: "/finalistas", label: "Finalistas" },
] as const;

/** Edition admin section tabs, mirroring PainelNav's segmented control. */
export function AdminEditionNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/admin/h/${slug}`;

  return (
    <SegmentedNav
      label="Seções da administração"
      items={TABS.map((tab) => {
        const href = `${base}${tab.path}`;
        return {
          key: tab.path || "overview",
          href,
          label: tab.label,
          active:
            tab.path === ""
              ? pathname === base
              : pathname === href || pathname.startsWith(`${href}/`),
        };
      })}
    />
  );
}
