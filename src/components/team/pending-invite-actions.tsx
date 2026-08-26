"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { acceptTeamInvite, declineTeamInvite } from "@/app/(app)/h/[slug]/team/actions";

export function PendingInviteActions({ teamId, blocked }: { teamId: string; blocked: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [pending, start] = useTransition();

  function run(action: typeof acceptTeamInvite) {
    setError(null);
    start(async () => {
      const result = await action({ teamId });
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          variant="primary"
          disabled={pending || blocked}
          onClick={() => run(acceptTeamInvite)}
        >
          {pending ? "Um instante..." : "Entrar no time"}
        </Button>
        {declining ? (
          <span className="inline-flex items-center gap-2 text-sm">
            <span className="font-semibold">Recusar o convite?</span>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              className="px-4 py-2 text-sm text-red-700"
              onClick={() => run(declineTeamInvite)}
            >
              Confirmar
            </Button>
            <button
              type="button"
              onClick={() => setDeclining(false)}
              className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Cancelar
            </button>
          </span>
        ) : (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            className="px-4 py-2 text-sm"
            onClick={() => setDeclining(true)}
          >
            Recusar
          </Button>
        )}
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
