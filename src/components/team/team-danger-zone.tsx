"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { transferLeadership, deleteTeam, leaveTeam } from "@/app/(app)/h/[slug]/team/manage-actions";

type Candidate = { userId: string; label: string };

export function TeamDangerZone({
  teamId,
  slug,
  isLeader,
  locked,
  candidates,
  aloneInTeam,
}: {
  teamId: string;
  slug: string;
  isLeader: boolean;
  locked: boolean;
  candidates: Candidate[];
  aloneInTeam: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [newLeader, setNewLeader] = useState("");
  const [pending, startTransition] = useTransition();

  if (locked) return null;

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, after: string) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) router.push(after);
      else setError(result.error);
    });
  }

  return (
    <div className="space-y-5 rounded-2xl border border-red-400/30 bg-red-400/10 p-5">
      {isLeader && candidates.length > 0 && (
        <div>
          <h3 className="font-heading font-bold">Passar a liderança</h3>
          <p className="mt-1 text-sm text-muted">
            Quem for líder passa a ser a única pessoa que edita e envia a submissão.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select
              value={newLeader}
              onChange={(e) => setNewLeader(e.target.value)}
              aria-label="Novo líder"
              className="rounded-full border border-white/10 bg-surface-raised px-4 py-2 text-sm"
            >
              <option value="">Escolher integrante</option>
              {candidates.map((c) => (
                <option key={c.userId} value={c.userId}>
                  {c.label}
                </option>
              ))}
            </select>
            <ConfirmButton
              label="Passar liderança"
              variant="secondary"
              disabled={!newLeader || pending}
              className="px-5 py-2 text-sm"
              prompt="Passar a liderança? Você deixa de poder editar a submissão."
              confirmLabel="Passar"
              onConfirm={() =>
                run(
                  () => transferLeadership({ teamId, newLeaderId: newLeader, slug }),
                  `/h/${slug}/team`,
                )
              }
            />
          </div>
        </div>
      )}

      {isLeader && aloneInTeam && (
        <div>
          <h3 className="font-heading font-bold text-red-300">Excluir o time</h3>
          <p className="mt-1 text-sm text-muted">
            Só é possível enquanto você for a única pessoa no time e o projeto não tiver sido
            enviado. Isso apaga a submissão em rascunho.
          </p>
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            className="mt-3 px-5 py-2 text-sm"
            onClick={() => {
              if (!confirm("Excluir o time? Isso não pode ser desfeito.")) return;
              run(() => deleteTeam({ teamId, slug }), `/h/${slug}/dashboard`);
            }}
          >
            Excluir time
          </Button>
        </div>
      )}

      {!isLeader && (
        <div>
          <h3 className="font-heading font-bold text-red-300">Sair do time</h3>
          <p className="mt-1 text-sm text-muted">
            Você deixa de ver a submissão deste time e pode entrar em outro.
          </p>
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            className="mt-3 px-5 py-2 text-sm"
            onClick={() => {
              if (!confirm("Sair do time?")) return;
              run(() => leaveTeam({ teamId, slug }), `/h/${slug}/dashboard`);
            }}
          >
            Sair do time
          </Button>
        </div>
      )}

      {error && <p className="text-sm font-semibold text-red-300">{error}</p>}
    </div>
  );
}
