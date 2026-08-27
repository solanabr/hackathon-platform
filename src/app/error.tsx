"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";

// Next intercepts errors caught by this boundary, so the SDK never sees them
// on its own — the capture here is the only report.
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-surface px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border-2 border-green-dark bg-surface-raised p-10 text-center shadow-sticker">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
          Erro
        </p>
        <h1 className="mt-3 font-heading text-3xl font-black uppercase tracking-tight [font-stretch:118%]">
          Algo deu errado
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Não foi possível carregar esta página. Tente de novo — se persistir, avise a organização.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={reset} className="btn-primary px-6 py-3 text-sm">
            Tentar de novo
          </button>
          <Link
            href="/"
            className="text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            Voltar para o início
          </Link>
        </div>
      </div>
    </main>
  );
}
