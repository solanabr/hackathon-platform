"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { registerForHackathon } from "@/app/(app)/h/[slug]/register/actions";

export function RegistrationForm({
  slug,
  lumaUrl,
}: {
  slug: string;
  lumaUrl: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [pending, startTransition] = useTransition();

  if (registered) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald text-surface">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <div>
            <h2 className="font-heading text-xl font-bold">Você está inscrito!</h2>
            <p className="mt-0.5 text-sm text-muted">
              As aulas e a criação de time já estão liberadas.
            </p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted">
          Próximo passo: monte seu time. Crie um time como líder ou peça para o líder te
          adicionar — e preparem o projeto para a submissão.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/h/${slug}/team`} className="btn-primary">
            Montar meu time
          </Link>
          <Link href={`/h/${slug}/dashboard`} className="btn-secondary">
            Ir para o painel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          setError(null);
          const result = await registerForHackathon(slug, formData);
          if (result.error) setError(result.error);
          else setRegistered(true);
        })
      }
      className="space-y-5"
    >
      <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-surface-raised p-4">
        <input type="checkbox" name="luma_confirmed" className="mt-0.5 h-4 w-4 accent-emerald" />
        <span className="text-sm text-ink">
          Confirmo que me inscrevi no evento pelo Luma
          {lumaUrl && (
            <>
              {" ("}
              <a
                href={lumaUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-emerald underline-offset-2 hover:underline"
              >
                abrir o Luma
              </a>
              {")"}
            </>
          )}
          .
        </span>
      </label>

      <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-surface-raised p-4">
        <input type="checkbox" name="terms_accepted" className="mt-0.5 h-4 w-4 accent-emerald" />
        <span className="text-sm text-ink">Li e aceito as regras do hackathon.</span>
      </label>

      {error && <p className="text-sm font-medium text-red-300">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Confirmando..." : "Confirmar inscrição"}
      </Button>
    </form>
  );
}
