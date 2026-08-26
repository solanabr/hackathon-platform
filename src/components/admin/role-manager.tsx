"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { grantRole, revokeRole } from "@/app/(app)/admin/people/actions";
import type { Hackathon } from "@/types/db";

export type RoleRow = {
  id: string;
  role: "admin" | "judge";
  email: string;
  name: string | null;
  avatarUrl: string | null;
  hackathonName: string | null;
};

type Person = {
  email: string;
  name: string | null;
  avatarUrl: string | null;
  roles: RoleRow[];
};

export function RoleManager({
  rows,
  hackathons,
}: {
  rows: RoleRow[];
  hackathons: Pick<Hackathon, "id" | "name">[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const people = useMemo(() => {
    const byEmail = new Map<string, Person>();
    for (const row of rows) {
      const person = byEmail.get(row.email) ?? {
        email: row.email,
        name: row.name,
        avatarUrl: row.avatarUrl,
        roles: [],
      };
      person.roles.push(row);
      byEmail.set(row.email, person);
    }
    return [...byEmail.values()].sort((a, b) =>
      (a.name ?? a.email).localeCompare(b.name ?? b.email, "pt-BR"),
    );
  }, [rows]);

  function remove(roleId: string) {
    if (confirming !== roleId) {
      setConfirming(roleId);
      return;
    }
    setConfirming(null);
    setError(null);
    startTransition(async () => {
      const result = await revokeRole(roleId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <Card sticker className="p-6 sm:p-7">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
          Adicionar papel
        </p>
        <p className="mt-2 text-sm text-muted">
          Admin sem edição vale para a plataforma inteira; com edição, só organiza aquela. Jurado
          sempre pertence a uma edição.
        </p>
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
          className="mt-4 flex flex-wrap items-center gap-3"
        >
          <input
            name="email"
            type="email"
            required
            placeholder="e-mail"
            className="min-h-11 min-w-0 flex-1 basis-56 rounded-full border-2 border-green-dark/15 bg-surface-deep px-4 py-2 text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-emerald"
          />
          <select
            name="role"
            className="min-h-11 rounded-full border-2 border-green-dark/15 bg-surface-deep px-4 py-2 text-ink outline-none transition-colors focus:border-emerald"
          >
            <option value="admin">Admin</option>
            <option value="judge">Jurado</option>
          </select>
          <select
            name="hackathon_id"
            className="min-h-11 rounded-full border-2 border-green-dark/15 bg-surface-deep px-4 py-2 text-ink outline-none transition-colors focus:border-emerald"
          >
            <option value="">Toda a plataforma</option>
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
        {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
      </Card>

      <ul className="space-y-4">
        {people.map((person) => (
          <li key={person.email}>
            <Card sticker className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar src={person.avatarUrl} name={person.name ?? person.email} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-heading text-base font-bold">
                      {person.name ?? person.email}
                    </p>
                    <p className="truncate font-mono text-xs text-muted">{person.email}</p>
                  </div>
                </div>

                <ul className="flex flex-wrap items-center gap-2">
                  {person.roles.map((role) => {
                    const label =
                      role.role === "admin"
                        ? role.hackathonName
                          ? `Admin · ${role.hackathonName}`
                          : "Admin global"
                        : `Jurado · ${role.hackathonName ?? "sem edição"}`;
                    const confirmingThis = confirming === role.id;
                    return (
                      <li key={role.id}>
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border-2 py-1 pl-3 pr-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide ${
                            role.role === "admin"
                              ? role.hackathonName
                                ? "border-emerald/30 bg-emerald/10 text-emerald"
                                : "border-green-dark bg-green-dark text-surface"
                              : "border-yellow-strong/60 bg-yellow/40 text-green-dark"
                          }`}
                        >
                          {label}
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => remove(role.id)}
                            aria-label={`Remover ${label} de ${person.email}`}
                            className={`rounded-full px-1.5 py-0.5 font-sans text-xs font-bold normal-case transition-colors disabled:opacity-50 ${
                              confirmingThis
                                ? "bg-red-700 text-white"
                                : "bg-black/10 hover:bg-red-700/20 hover:text-red-700"
                            }`}
                          >
                            {confirmingThis ? "Confirmar?" : "×"}
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      {confirming && (
        <button
          type="button"
          onClick={() => setConfirming(null)}
          className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Cancelar remoção
        </button>
      )}
    </div>
  );
}
