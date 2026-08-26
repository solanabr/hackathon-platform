"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ContentFieldsForm } from "@/components/admin/content-fields-form";
import { emptyDraft, type ContentDraft } from "@/lib/content-fields";
import { createContent } from "@/app/(app)/admin/h/[slug]/content/actions";

export function NewContentForm({ hackathonId, slug }: { hackathonId: string; slug: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ContentDraft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function create() {
    setError(null);
    start(async () => {
      const result = await createContent({ hackathonId, slug, details: draft });
      if (result.ok) {
        setDraft(emptyDraft());
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Adicionar conteúdo
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-green-dark/15 bg-surface-raised p-5">
      <h2 className="font-heading text-lg font-bold">Novo conteúdo</h2>
      <p className="mt-1 text-sm text-muted">
        Entra como rascunho no fim da lista. O vídeo ou arquivo você anexa depois.
      </p>

      <div className="mt-5">
        <ContentFieldsForm draft={draft} onChange={setDraft} idPrefix="new" />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="button" disabled={pending} onClick={create} className="px-5 py-2 text-sm">
          {pending ? "Criando..." : "Criar"}
        </Button>
        <button
          type="button"
          onClick={() => {
            setDraft(emptyDraft());
            setError(null);
            setOpen(false);
          }}
          className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Cancelar
        </button>
        {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
      </div>
    </div>
  );
}
