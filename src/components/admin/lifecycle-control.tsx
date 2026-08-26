"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { updateEditionStatus } from "@/app/(app)/admin/h/[slug]/actions";
import type { HackathonStatus } from "@/types/db";

type ManualAction = {
  target: HackathonStatus;
  label: string;
  primary: boolean;
};

const ACTIONS: Partial<Record<HackathonStatus, ManualAction[]>> = {
  draft: [{ target: "published", label: "Publicar edição", primary: true }],
  published: [
    { target: "judging", label: "Anunciar finalistas", primary: true },
    { target: "draft", label: "Voltar para rascunho", primary: false },
  ],
  submissions_open: [{ target: "published", label: "Republicar edição", primary: true }],
  judging: [
    { target: "closed", label: "Encerrar edição", primary: true },
    { target: "published", label: "Desfazer anúncio", primary: false },
  ],
  closed: [{ target: "judging", label: "Reabrir julgamento", primary: false }],
};

const NOTE: Partial<Record<HackathonStatus, string>> = {
  draft: "Publicar coloca a edição na home e abre a página pública.",
  published:
    "Inscrições, submissões e julgamento seguem as datas configuradas — nada a avançar aqui. Anunciar finalistas libera a seção pública de finalistas na data de anúncio.",
  judging:
    "Finalistas anunciados. Encerrar deixa os resultados públicos permanentemente.",
  closed: "A edição está encerrada. Os resultados ficam públicos permanentemente.",
};

export function LifecycleControl({
  slug,
  status,
  phaseLabel,
  finalistsAnnouncedAt,
}: {
  slug: string;
  status: HackathonStatus;
  phaseLabel: string;
  finalistsAnnouncedAt: string | null;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<HackathonStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const actions = ACTIONS[status] ?? [];

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
        <h2 className="font-heading text-lg font-bold">{phaseLabel}</h2>
        <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">
          fases seguem as datas
        </span>
      </div>

      {NOTE[status] && (
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{NOTE[status]}</p>
      )}
      {status === "published" && !finalistsAnnouncedAt && (
        <p className="mt-2 max-w-xl rounded-xl border-2 border-yellow bg-yellow/10 p-3 text-sm leading-relaxed">
          A data de <strong>Anúncio dos finalistas</strong> está vazia. Sem ela, os finalistas
          continuam invisíveis mesmo depois do anúncio.
        </p>
      )}

      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {actions.map((action) => (
          <button
            key={action.target}
            type="button"
            disabled={pending}
            onClick={() => transition(action.target)}
            className={`min-h-11 rounded-full border-2 text-sm font-bold transition-colors disabled:opacity-50 ${
              confirming === action.target
                ? "border-red-700/40 bg-red-700/10 px-5 py-2 text-red-700"
                : action.primary
                  ? "border-green-dark bg-green-dark px-5 py-2 text-surface hover:bg-green-dark/90"
                  : "border-green-dark/20 px-4 py-1.5 text-muted hover:border-green-dark hover:text-ink"
            }`}
          >
            {confirming === action.target ? "Confirmar?" : action.label}
          </button>
        ))}
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
