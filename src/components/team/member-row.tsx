"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmButton } from "@/components/ui/confirm-button";

type Props = {
  memberId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  isLeader: boolean;
  status: "pending" | "accepted" | "removed";
  hasAccount: boolean;
  canRemove: boolean;
};

export function MemberRow({
  memberId,
  email,
  fullName,
  avatarUrl,
  isLeader,
  status,
  hasAccount,
  canRemove,
}: Props) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    const res = await fetch("/api/team/member", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    if (!res.ok) {
      setRemoving(false);
      alert("Não foi possível remover.");
      return;
    }
    router.refresh();
  }

  return (
    <li className="flex items-center justify-between gap-3 py-3">
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
        {canRemove && (
          <ConfirmButton
            label={removing ? "Removendo..." : "Remover"}
            variant="ghost"
            disabled={removing}
            className="px-3 py-1 text-xs text-red-300 underline-offset-2 hover:underline disabled:opacity-50"
            prompt={`Remover ${fullName ?? email} do time?`}
            confirmLabel="Remover"
            onConfirm={handleRemove}
          />
        )}
      </div>
    </li>
  );
}
