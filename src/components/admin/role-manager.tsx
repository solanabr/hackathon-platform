"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { grantRole, revokeRole } from "@/app/(app)/admin/pessoas/actions";
import type { Hackathon } from "@/types/db";

type Row = { id: string; role: "admin" | "judge"; email: string; hackathonName: string | null };

export function RoleManager({
  rows,
  hackathons,
}: {
  rows: Row[];
  hackathons: Pick<Hackathon, "id" | "name">[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      <form
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            const result = await grantRole(
              String(formData.get("email") ?? ""),
              formData.get("role") === "admin" ? "admin" : "judge",
              (formData.get("hackathon_id") as string) || null,
            );
            if (result.error) setError(result.error);
          })
        }
        className="flex flex-wrap items-end gap-3"
      >
        <input
          name="email"
          type="email"
          required
          placeholder="e-mail"
          className="rounded-full border border-green/30 bg-surface-raised px-4 py-2"
        />
        <select name="role" className="rounded-full border border-green/30 bg-surface-raised px-4 py-2">
          <option value="admin">Admin</option>
          <option value="judge">Jurado</option>
        </select>
        <select name="hackathon_id" className="rounded-full border border-green/30 bg-surface-raised px-4 py-2">
          <option value="">— hackathon (jurado) —</option>
          {hackathons.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={pending}>
          Adicionar
        </Button>
      </form>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <ul className="divide-y divide-green/10">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-4 py-3">
            <span>
              <strong>{row.email}</strong> · {row.role === "admin" ? "Admin" : "Jurado"}
              {row.hackathonName && <span className="text-muted"> · {row.hackathonName}</span>}
            </span>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => startTransition(async () => void (await revokeRole(row.id)))}
            >
              Remover
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}