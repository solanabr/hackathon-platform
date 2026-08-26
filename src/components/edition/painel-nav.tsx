"use client";

import { usePathname } from "next/navigation";
import { SegmentedNav } from "@/components/ui/segmented";

const TABS = [
  { path: "dashboard", label: "Visão geral" },
  { path: "team", label: "Time" },
  { path: "submission", label: "Submissão" },
  { path: "content", label: "Conteúdos" },
] as const;

/** DoraHacks-style section tabs, in the LP segmented control. */
export function PainelNav({ slug }: { slug: string }) {
  const pathname = usePathname();

  return (
    <SegmentedNav
      label="Seções do painel"
      items={TABS.map((tab) => {
        const href = `/h/${slug}/${tab.path}`;
        return {
          key: tab.path,
          href,
          label: tab.label,
          active: pathname === href || pathname.startsWith(`${href}/`),
        };
      })}
    />
  );
}
