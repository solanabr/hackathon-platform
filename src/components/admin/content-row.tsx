"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusChip } from "@/components/ui/section-card";
import { ContentFieldsForm } from "@/components/admin/content-fields-form";
import { draftFrom, type ContentDraft } from "@/lib/content-fields";
import {
  updateContent,
  updateContentDetails,
  deleteContent,
  moveContent,
  uploadContentFile,
} from "@/app/(app)/admin/h/[slug]/content/actions";

export type AdminContentItem = {
  id: string;
  kind: string;
  title: string;
  speaker: string | null;
  description: string | null;
  location: string | null;
  duration_minutes: number | null;
  scheduledAtLocal: string;
  scheduledLabel: string;
  youtubeId: string | null;
  fileUrl: string | null;
  published: boolean;
};

export function ContentRow({
  item,
  slug,
  hackathonId,
  isFirst,
  isLast,
}: {
  item: AdminContentItem;
  slug: string;
  hackathonId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [videoUrl, setVideoUrl] = useState(
    item.youtubeId ? `https://youtu.be/${item.youtubeId}` : "",
  );
  const [published, setPublished] = useState(item.published);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ContentDraft>(() => draftFrom(item));
  const fileRef = useRef<HTMLInputElement>(null);

  function saveDetails() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateContentDetails({ contentId: item.id, slug, details: draft });
      if (result.ok) {
        setSaved(true);
        setEditing(false);
      } else {
        setError(result.error);
      }
    });
  }

  function remove() {
    if (!confirm(`Remover "${item.title}"? Some para os participantes; dá para restaurar depois.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteContent({ contentId: item.id, slug });
      if (!result.ok) setError(result.error);
    });
  }

  function move(direction: "up" | "down") {
    setError(null);
    startTransition(async () => {
      const result = await moveContent({ contentId: item.id, hackathonId, slug, direction });
      if (!result.ok) setError(result.error);
    });
  }

  function upload(file: File) {
    setError(null);
    setSaved(false);
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadContentFile({ contentId: item.id, slug, formData });
      if (result.ok) setSaved(true);
      else setError(result.error);
    });
  }

  function save(nextPublished: boolean) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateContent({
        contentId: item.id,
        slug,
        videoUrl,
        published: nextPublished,
      });
      if (result.ok) {
        setPublished(nextPublished);
        setSaved(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <li className="rounded-xl border border-white-10 bg-surface-raised p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">
            {item.scheduledLabel} · {item.kind}
          </p>
          <h3 className="mt-1 font-heading text-lg font-bold">{item.title}</h3>
          {item.speaker && <p className="text-sm text-muted">{item.speaker}</p>}
        </div>
        <div className="flex items-center gap-2">
          <StatusChip tone={published ? "ok" : "muted"}>
            {published ? "publicado" : "rascunho"}
          </StatusChip>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => move("up")}
              disabled={pending || isFirst}
              aria-label="Mover para cima"
              className="rounded-lg px-2 py-1 text-muted transition-colors hover:text-ink disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move("down")}
              disabled={pending || isLast}
              aria-label="Mover para baixo"
              className="rounded-lg px-2 py-1 text-muted transition-colors hover:text-ink disabled:opacity-30"
            >
              ↓
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="font-semibold text-emerald underline-offset-4 hover:underline"
        >
          {editing ? "Fechar detalhes" : "Editar detalhes"}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="text-muted underline-offset-4 hover:text-red-400 hover:underline disabled:opacity-50"
        >
          Remover
        </button>
      </div>

      {editing && (
        <div className="mt-4 rounded-xl border border-white-10 bg-surface-deep p-5">
          <ContentFieldsForm draft={draft} onChange={setDraft} idPrefix={item.id} />
          <div className="mt-4 flex items-center gap-3">
            <Button
              type="button"
              disabled={pending}
              onClick={saveDetails}
              className="min-h-11 bg-yellow px-5 py-2 text-sm text-[#1b231d] hover:bg-yellow-strong"
            >
              {pending ? "Salvando..." : "Salvar detalhes"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setDraft(draftFrom(item));
                setEditing(false);
              }}
              className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label
            htmlFor={`video-${item.id}`}
            className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted"
          >
            Link do YouTube
          </label>
          <Input
            id={`video-${item.id}`}
            value={videoUrl}
            spellCheck={false}
            placeholder="https://youtu.be/..."
            onChange={(e) => {
              setVideoUrl(e.target.value);
              setSaved(false);
            }}
          />
        </div>

        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => save(published)}
          className="px-5 py-2 text-sm"
        >
          {pending ? "Salvando..." : "Salvar"}
        </Button>

        <Button
          type="button"
          variant={published ? "ghost" : "primary"}
          disabled={pending}
          onClick={() => save(!published)}
          className="px-5 py-2 text-sm"
        >
          {published ? "Despublicar" : "Publicar"}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white-10 pt-4">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.pptx,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => fileRef.current?.click()}
          className="px-5 py-2 text-sm"
        >
          {item.fileUrl ? "Trocar arquivo" : "Enviar arquivo"}
        </Button>
        {item.fileUrl ? (
          <a
            href={item.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-emerald underline-offset-4 hover:underline"
          >
            Ver arquivo atual
          </a>
        ) : (
          <p className="text-xs text-muted">PDF, imagem, PPTX ou DOCX, até 25 MB.</p>
        )}
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-red-400">{error}</p>}
      {saved && !error && <p className="mt-3 text-sm text-emerald">Salvo.</p>}
    </li>
  );
}
