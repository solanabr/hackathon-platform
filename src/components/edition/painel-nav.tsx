"use client";

import { usePathname } from "next/navigation";
import { SegmentedNav } from "@/components/ui/segmented";
import { COLOSSEUM_SLUG } from "@/app/(public)/pre-registro/constants";
import { STARTUP_PATH, SUBMISSION_STEP } from "@/app/(public)/startup-registration/constants";

const TABS = [
  { path: "dashboard", label: "Visão geral" },
  { path: "team", label: "Time" },
  { path: "team-up", label: "Encontrar time" },
  { path: "submission", label: "Submissão" },
  { path: "content", label: "Conteúdos" },
] as const;

/** DoraHacks-style section tabs, in the LP segmented control. */
const TEAM_TABS: ReadonlyArray<(typeof TABS)[number]["path"]> = ["team", "team-up", "submission"];

export function PainelNav({ slug, usesTeams = true }: { slug: string; usesTeams?: boolean }) {
  const pathname = usePathname();
  const tabs = usesTeams ? TABS : TABS.filter((tab) => !TEAM_TABS.includes(tab.path));

  return (
    <SegmentedNav
      label="Seções do painel"
      items={tabs.map((tab) => {
        // The Colosseum submission is kept on the startup form, not on a team.
        const href =
          tab.path === "submission" && slug === COLOSSEUM_SLUG
            ? `${STARTUP_PATH}?step=${SUBMISSION_STEP}`
            : `/h/${slug}/${tab.path}`;
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
