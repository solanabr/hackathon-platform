"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { restoreContent } from "@/app/(app)/admin/h/[slug]/content/actions";

export function RemovedContent({
  items,
  slug,
}: {
  items: Array<{ id: string; title: string; kind: string }>;
  slug: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border-2 border-green-dark/15 bg-surface-raised/60 p-5">
      <h2 className="font-heading text-lg font-bold text-muted">Removidos</h2>
      <p className="mt-1 text-sm text-muted">
        Não aparecem para os participantes. Restaurar traz de volta como rascunho.
      </p>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3">
            <span className="min-w-0 truncate text-sm text-muted">
              {item.title}
              <span className="ml-2 text-[11px] uppercase tracking-wider">{item.kind}</span>
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              className="px-4 py-1.5 text-xs"
              onClick={() =>
                start(async () => {
                  const result = await restoreContent({ contentId: item.id, slug });
                  if (!result.ok) setError(result.error);
                })
              }
            >
              Restaurar
            </Button>
          </li>
        ))}
      </ul>
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
    </section>
  );
}
