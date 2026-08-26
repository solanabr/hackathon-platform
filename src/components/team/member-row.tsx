"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { transferLeadership } from "@/app/(app)/h/[slug]/team/manage-actions";

type Props = {
  memberId: string;
  userId: string | null;
  teamId: string;
  slug: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  isLeader: boolean;
  status: "pending" | "accepted" | "removed";
  hasAccount: boolean;
  canRemove: boolean;
  canPromote: boolean;
};

export function MemberRow({
  memberId,
  userId,
  teamId,
  slug,
  email,
  fullName,
  avatarUrl,
  isLeader,
  status,
  hasAccount,
  canRemove,
  canPromote,
}: Props) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleRemove() {
    setError(null);
    setRemoving(true);
    const res = await fetch("/api/team/member", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    if (!res.ok) {
      setRemoving(false);
      setError("Não foi possível remover.");
      return;
    }
    router.refresh();
  }

  function promote() {
    if (!userId) return;
    setError(null);
    startTransition(async () => {
      const result = await transferLeadership({ teamId, newLeaderId: userId, slug });
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            src={avatarUrl}
            name={fullName ?? email}
            size="sm"
            className={isLeader ? "ring-2 ring-emerald/20" : ""}
          />
          <div className="min-w-0">
            <p className="font-medium text-ink">
              {fullName ?? email}
              {isLeader && (
                <span className="ml-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-green">
                  Líder
                </span>
              )}
            </p>
            <p className="truncate font-mono text-xs text-muted">{email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {status === "pending" && (
            <Badge tone={hasAccount ? "neutral" : "yellow"}>
              {hasAccount ? "Pendente" : "Sem conta"}
            </Badge>
          )}
          {canPromote && userId && (
            <ConfirmButton
              label="Tornar líder"
              variant="ghost"
              disabled={pending || removing}
              className="px-3 py-1 text-xs text-emerald underline-offset-2 hover:underline disabled:opacity-50"
              prompt={`Tornar ${fullName ?? email} líder? Você deixa de editar e enviar a submissão.`}
              confirmLabel="Tornar líder"
              onConfirm={promote}
            />
          )}
          {canRemove && (
            <ConfirmButton
              label={removing ? "Removendo..." : "Remover"}
              variant="ghost"
              disabled={removing || pending}
              className="px-3 py-1 text-xs text-red-700 underline-offset-2 hover:underline disabled:opacity-50"
              prompt={`Remover ${fullName ?? email} do time?`}
              confirmLabel="Remover"
              onConfirm={handleRemove}
            />
          )}
        </div>
      </div>
      {error && <p className="mt-1.5 text-right text-xs font-semibold text-red-700">{error}</p>}
    </li>
  );
}
