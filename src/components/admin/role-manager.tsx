"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { grantRole, revokeRole } from "@/app/(app)/admin/people/actions";
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
          className="min-h-11 rounded-full border border-green-dark/15 bg-surface-deep px-4 py-2 text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-emerald"
        />
        <select
          name="role"
          className="min-h-11 rounded-full border border-green-dark/15 bg-surface-deep px-4 py-2 text-ink outline-none transition-colors focus:border-emerald"
        >
          <option value="admin">Admin</option>
          <option value="judge">Jurado</option>
        </select>
        <select
          name="hackathon_id"
          className="min-h-11 rounded-full border border-green-dark/15 bg-surface-deep px-4 py-2 text-ink outline-none transition-colors focus:border-emerald"
        >
          <option value="">Hackathon (jurado sempre; admin: vazio = global)</option>
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

      {error && <p className="text-sm font-semibold text-red-400">{error}</p>}

      <ul className="divide-y divide-white-10">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-4 py-3">
            <span className="min-w-0">
              <span className="font-mono text-sm">{row.email}</span>
              <span
                className={`ml-2 inline-flex items-center rounded border px-2 py-0.5 font-mono text-[11px] font-semibold uppercase ${
                  row.role === "admin"
                    ? "border-emerald/30 bg-emerald/10 text-emerald"
                    : "border-yellow-strong/60 bg-yellow/40 text-green-dark"
                }`}
              >
                {row.role === "admin" ? "Admin" : "Jurado"}
              </span>
              {row.hackathonName && (
                <span className="ml-2 text-sm text-muted">{row.hackathonName}</span>
              )}
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