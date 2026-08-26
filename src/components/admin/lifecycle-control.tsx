"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { updateEditionStatus } from "@/app/(app)/admin/h/[slug]/actions";
import type { HackathonStatus } from "@/types/db";

const ORDER: HackathonStatus[] = ["draft", "published", "submissions_open", "judging", "closed"];

const LABEL: Record<HackathonStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
  submissions_open: "Submissões abertas",
  judging: "Em julgamento",
  closed: "Encerrado",
};

const UNLOCKS: Record<HackathonStatus, string> = {
  draft: "Rascunho tira a edição da home e da página pública.",
  published: "Publicado coloca a edição na home e abre a página pública.",
  submissions_open: "Submissões abertas sinaliza a fase de construção para os participantes.",
  judging:
    "Em julgamento libera a seção pública de finalistas assim que a data de anúncio passar.",
  closed: "Encerrado sempre exibe os finalistas e os resultados na página pública.",
};

export function LifecycleControl({
  slug,
  status,
  finalistsAnnouncedAt,
}: {
  slug: string;
  status: HackathonStatus;
  finalistsAnnouncedAt: string | null;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<HackathonStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const idx = ORDER.indexOf(status);
  const next = ORDER[idx + 1] ?? null;
  const prev = ORDER[idx - 1] ?? null;

  function transition(target: HackathonStatus) {
    if (confirming !== target) {
      setConfirming(target);
      return;
    }
    setConfirming(null);
    setError(null);
    start(async () => {
      const result = await updateEditionStatus({ slug, status: target });
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <Card sticker className="p-6 sm:p-7">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
        Ciclo de vida
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h2 className="font-heading text-lg font-bold">{LABEL[status]}</h2>
        <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">
          etapa {idx + 1} de {ORDER.length}
        </span>
      </div>

      {next && (
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{UNLOCKS[next]}</p>
      )}
      {next === "judging" && !finalistsAnnouncedAt && (
        <p className="mt-2 max-w-xl rounded-xl border-2 border-yellow bg-yellow/10 p-3 text-sm leading-relaxed">
          A data de <strong>Anúncio dos finalistas</strong> está vazia. Sem ela, os finalistas
          continuam invisíveis mesmo em julgamento.
        </p>
      )}
      {!next && (
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          A edição está encerrada. Os resultados ficam públicos permanentemente.
        </p>
      )}

      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {next && (
          <button
            type="button"
            disabled={pending}
            onClick={() => transition(next)}
            className={`min-h-11 rounded-full border-2 px-5 py-2 text-sm font-bold transition-colors disabled:opacity-50 ${
              confirming === next
                ? "border-red-700/40 bg-red-700/10 text-red-700"
                : "border-green-dark bg-green-dark text-surface hover:bg-green-dark/90"
            }`}
          >
            {confirming === next ? "Confirmar?" : `Avançar para ${LABEL[next]}`}
          </button>
        )}
        {prev && (
          <button
            type="button"
            disabled={pending}
            onClick={() => transition(prev)}
            className={`min-h-11 rounded-full border-2 px-4 py-1.5 text-sm font-bold transition-colors disabled:opacity-50 ${
              confirming === prev
                ? "border-red-700/40 bg-red-700/10 text-red-700"
                : "border-green-dark/20 text-muted hover:border-green-dark hover:text-ink"
            }`}
          >
            {confirming === prev ? "Confirmar?" : `Voltar para ${LABEL[prev]}`}
          </button>
        )}
        {confirming && (
          <button
            type="button"
            onClick={() => setConfirming(null)}
            className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Cancelar
          </button>
        )}
      </div>
    </Card>
  );
}
