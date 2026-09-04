"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { registerForHackathon } from "@/app/(app)/h/[slug]/register/actions";
import { trackClient } from "@/lib/analytics-browser";
import { AttributionFields } from "@/components/analytics/attribution-fields";

export function RegistrationForm({
  slug,
  lumaUrl,
  requireLuma = true,
  external = false,
  submissionUrl = null,
}: {
  slug: string;
  lumaUrl: string | null;
  requireLuma?: boolean;
  external?: boolean;
  submissionUrl?: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    trackClient("registration_form_viewed", { edition: slug });
  }, [slug]);

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
              {external
                ? "Sua inscrição está confirmada."
                : "As aulas e a criação de time já estão liberadas."}
            </p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted">
          {external
            ? "Próximo passo: abra o listing no Superteam Earn e envie o projeto por lá até o prazo. O link fica salvo no seu painel."
            : "Próximo passo: monte seu time. Crie um time como líder ou peça para o líder te adicionar — e preparem o projeto para a submissão."}
        </p>
        <div className="flex flex-wrap gap-3">
          {external ? (
            <>
              {submissionUrl && (
                <a href={submissionUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  Abrir o listing no Earn
                </a>
              )}
              <Link href={`/h/${slug}/dashboard`} className={submissionUrl ? "btn-secondary" : "btn-primary"}>
                Ver meu painel
              </Link>
            </>
          ) : (
            <>
              <Link href={`/h/${slug}/team`} className="btn-primary">
                Montar meu time
              </Link>
              <Link href={`/h/${slug}/dashboard`} className="btn-secondary">
                Ir para o painel
              </Link>
            </>
          )}
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
          if (result.error) {
            setError(result.error);
            trackClient("registration_form_error", { edition: slug, field: "server" });
          } else setRegistered(true);
        })
      }
      className="space-y-5"
    >
      <AttributionFields />
      {requireLuma && (
      <label
        htmlFor="luma_confirmed"
        className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-green-dark/15 bg-surface-raised p-4"
      >
        <input
          id="luma_confirmed"
          type="checkbox"
          name="luma_confirmed"
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-emerald"
        />
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
      )}

      <label
        htmlFor="terms_accepted"
        className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-green-dark/15 bg-surface-raised p-4"
      >
        <input
          id="terms_accepted"
          type="checkbox"
          name="terms_accepted"
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-emerald"
        />
        <span className="text-sm text-ink">
          Li e aceito as regras do hackathon e a{" "}
          <a
            href="/privacidade"
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline"
          >
            Política de Privacidade
          </a>
          .
        </span>
      </label>

      {error && <p className="text-sm font-medium text-red-300">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Confirmando..." : "Confirmar inscrição"}
      </Button>
    </form>
  );
}
