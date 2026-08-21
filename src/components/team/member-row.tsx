"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

type Props = {
  memberId: string;
  email: string;
  fullName: string | null;
  isLeader: boolean;
  status: "pending" | "accepted" | "removed";
  hasAccount: boolean;
  canRemove: boolean;
};

export function MemberRow({
  memberId,
  email,
  fullName,
  isLeader,
  status,
  hasAccount,
  canRemove,
}: Props) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    if (!confirm(`Remover ${fullName ?? email} do time?`)) return;
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
      <div>
        <p className="font-medium text-ink">
          {fullName ?? email}
          {isLeader && (
            <span className="ml-2 text-xs uppercase tracking-wider text-yellow">Líder</span>
          )}
        </p>
        <p className="text-xs text-muted">{email}</p>
      </div>
      <div className="flex items-center gap-3">
        {status === "pending" && (
          <Badge tone={hasAccount ? "neutral" : "yellow"}>
            {hasAccount ? "Pendente" : "Sem conta"}
          </Badge>
        )}
        {canRemove && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className="text-xs text-red-300 underline-offset-2 hover:underline disabled:opacity-50"
          >
            {removing ? "Removendo..." : "Remover"}
          </button>
        )}
      </div>
    </li>
  );
}
