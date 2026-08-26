"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { deleteTeam, leaveTeam } from "@/app/(app)/h/[slug]/team/manage-actions";

export function TeamDangerZone({
  teamId,
  slug,
  isLeader,
  locked,
  aloneInTeam,
}: {
  teamId: string;
  slug: string;
  isLeader: boolean;
  locked: boolean;
  aloneInTeam: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canDelete = isLeader && aloneInTeam;
  const canLeave = !isLeader;
  if (locked || (!canDelete && !canLeave)) return null;

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, after: string) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) router.push(after);
      else setError(result.error);
    });
  }

  return (
    <div>
      <p className="text-sm text-muted">
        {canDelete
          ? "Só é possível enquanto você for a única pessoa no time e o projeto não tiver sido enviado. Isso apaga a submissão em rascunho."
          : "Você deixa de ver a submissão deste time e pode entrar em outro."}
      </p>
      <div className="mt-4">
        {canDelete ? (
          <ConfirmButton
            label="Excluir time"
            variant="danger"
            disabled={pending}
            className="px-5 py-2 text-sm"
            prompt="Excluir o time? Isso não pode ser desfeito."
            confirmLabel="Excluir"
            onConfirm={() => run(() => deleteTeam({ teamId, slug }), `/h/${slug}/dashboard`)}
          />
        ) : (
          <ConfirmButton
            label="Sair do time"
            variant="danger"
            disabled={pending}
            className="px-5 py-2 text-sm"
            prompt="Sair do time?"
            confirmLabel="Sair"
            onConfirm={() => run(() => leaveTeam({ teamId, slug }), `/h/${slug}/dashboard`)}
          />
        )}
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
