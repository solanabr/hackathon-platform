"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TEAM_UP_ROLES } from "@/lib/team-up";
import { saveOpening } from "../team-up/actions";

type Opening = { roles: string[]; note: string | null; active: boolean };

const NOTE_MAX = 280;

const chipClass = (selected: boolean) =>
  `rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-colors ${
    selected
      ? "border-green-dark bg-yellow text-green-dark"
      : "border-green-dark/30 text-ink hover:border-green-dark/60"
  }`;

export function RecruitingCard({
  slug,
  teamId,
  initial,
}: {
  slug: string;
  teamId: string;
  initial: Opening | null;
}) {
  const router = useRouter();
  const [roles, setRoles] = useState<string[]>(initial?.roles ?? []);
  const [note, setNote] = useState(initial?.note ?? "");
  const [active, setActive] = useState(initial?.active ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleRole(key: string) {
    setRoles((prev) => (prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]));
  }

  function handleSubmit(nextActive: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await saveOpening({ teamId, roles, note, active: nextActive });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setActive(nextActive);
      router.refresh();
    });
  }

  return (
    <Card sticker className="p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="font-heading text-lg font-bold">Recrutamento</p>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          onClick={() => handleSubmit(!active)}
          disabled={pending}
          className={`relative h-6 w-11 shrink-0 rounded-full border-2 border-green-dark transition-colors disabled:opacity-50 ${
            active ? "bg-yellow" : "bg-surface-deep"
          }`}
        >
          <span
            className={`absolute left-0 top-0.5 h-4 w-4 rounded-full bg-green-dark transition-transform ${
              active ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      <p className="mt-1 text-sm text-muted">Anunciar vagas no mural</p>

      {active && (
        <Link href={`/h/${slug}/team-up`} className="mt-2 inline-block text-sm font-semibold text-emerald hover:underline">
          Ver no mural
        </Link>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {TEAM_UP_ROLES.map((r) => (
          <button
            key={r.key}
            type="button"
            className={chipClass(roles.includes(r.key))}
            onClick={() => toggleRole(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
          maxLength={NOTE_MAX}
          rows={2}
          placeholder="Uma frase sobre o que o time procura"
          className="w-full rounded-xl border border-green-dark/20 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-green-dark"
        />
        <p className="mt-1 text-right text-xs text-muted">
          {note.length}/{NOTE_MAX}
        </p>
      </div>

      {error && <p className="mt-2 text-sm font-semibold text-red-300">{error}</p>}

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          variant="primary"
          disabled={pending || roles.length === 0}
          onClick={() => handleSubmit(active)}
        >
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </Card>
  );
}
