import { Suspense } from "react";
import { LabIndex } from "./index-board";
import { LabSwitcher } from "./switcher";
import { renderLabHero } from "./variants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hero lab (preview)",
  robots: { index: false, follow: false },
};

export default async function LabHeroPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; set?: string }>;
}) {
  const { v, set } = await searchParams;
  const finalsOnly = set === "final";
  const isIndex = !v || v === "indice";

  const props = {
    cadastroHref: "/auth?next=/pre-registro",
    ctaLabel: "Criar conta",
    colosseumUrl: null as string | null,
  };

  return (
    <div className="bg-surface text-ink">
      {isIndex ? (
        <LabIndex finalsOnly={finalsOnly} />
      ) : (
        renderLabHero(v, props)
      )}
      <Suspense>
        <LabSwitcher current={v ?? "indice"} setFilter={set} />
      </Suspense>
    </div>
  );
}
