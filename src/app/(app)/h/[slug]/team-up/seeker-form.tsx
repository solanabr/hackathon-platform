"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LabeledSwitch } from "@/components/ui/labeled-switch";
import { TEAM_UP_ROLES } from "@/lib/team-up";
import { saveSeekerPost } from "./actions";

type SeekerPost = { roles: string[]; note: string | null; active: boolean };

const NOTE_MAX = 280;

const chipClass = (selected: boolean) =>
  `rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-colors ${
    selected
      ? "border-green-dark bg-yellow text-green-dark"
      : "border-green-dark/30 text-ink hover:border-green-dark/60"
  }`;

export function SeekerForm({
  hackathonId,
  profileComplete,
  initial,
}: {
  hackathonId: string;
  profileComplete: boolean;
  initial: SeekerPost | null;
}) {
  const router = useRouter();
  const [roles, setRoles] = useState<string[]>(initial?.roles ?? []);
  const [note, setNote] = useState(initial?.note ?? "");
  const [active, setActive] = useState(initial?.active ?? false);
  const [error, setError] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!profileComplete && (needsProfile || active)) {
    return (
      <Card sticker className="p-6">
        <p className="font-heading text-lg font-bold">Complete seu perfil para aparecer aqui</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Complete seu perfil — nome, headline e Telegram — para aparecer aqui.
        </p>
        <Link href="/account" className="btn-primary mt-4 inline-block px-5 py-2 text-sm">
          Completar perfil
        </Link>
      </Card>
    );
  }

  function toggleRole(key: string) {
    setRoles((prev) => (prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]));
  }

  function handleSubmit(nextActive: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await saveSeekerPost({ hackathonId, roles, note, active: nextActive });
      if (!res.ok) {
        if (res.error === "profile_incomplete") {
          setNeedsProfile(true);
          return;
        }
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
        <div>
          <p className="font-heading text-lg font-bold">Estou disponível</p>
          <p className="mt-0.5 text-sm text-muted">
            Ative para aparecer no mural com seu perfil e contatos para os times desta edição.
          </p>
        </div>
        <LabeledSwitch
          active={active}
          ariaLabel="Aparecer no mural"
          disabled={pending}
          onToggle={(next) => handleSubmit(next)}
        />
      </div>

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
          id="seeker_note"
          aria-label="Uma frase sobre você e o que procura"
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
          maxLength={NOTE_MAX}
          rows={2}
          placeholder="Uma frase sobre você e o que procura"
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
