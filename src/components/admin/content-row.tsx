"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusChip } from "@/components/ui/section-card";
import { segmentedContainer } from "@/components/ui/segmented";
import {
  attachmentTypeOf,
  draftFrom,
  type AttachmentType,
  type ContentDraft,
} from "@/lib/content-fields";
import {
  updateContentAttachment,
  setContentPublished,
  updateContentDetails,
  deleteContent,
  moveContent,
  uploadContentFile,
} from "@/app/(app)/admin/h/[slug]/content/actions";

export const ATTACHMENT_OPTIONS: Array<{ value: AttachmentType; label: string }> = [
  { value: "video", label: "Vídeo" },
  { value: "file", label: "Arquivo" },
  { value: "link", label: "Link" },
];

export type AdminContentItem = {
  id: string;
  title: string;
  description: string | null;
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
  const [attachType, setAttachType] = useState<AttachmentType>(
    () => attachmentTypeOf(item) ?? "video",
  );
  const [videoUrl, setVideoUrl] = useState(
    item.youtubeId ? `https://youtu.be/${item.youtubeId}` : "",
  );
  const [linkUrl, setLinkUrl] = useState(
    item.fileUrl && attachmentTypeOf(item) === "link" ? item.fileUrl : "",
  );
  const [published, setPublished] = useState(item.published);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<ContentDraft>(() => draftFrom(item));
  const [savedDraft, setSavedDraft] = useState<ContentDraft>(() => draftFrom(item));
  const fileRef = useRef<HTMLInputElement>(null);
  const detailsDirty =
    draft.title !== savedDraft.title || draft.description !== savedDraft.description;

  function saveDetails() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateContentDetails({ contentId: item.id, slug, details: draft });
      if (result.ok) {
        setSavedDraft(draft);
        setSaved(true);
      } else {
        setError(result.error);
      }
    });
  }

  const [confirmingRemove, setConfirmingRemove] = useState(false);

  function remove() {
    if (!confirmingRemove) {
      setConfirmingRemove(true);
      return;
    }
    setConfirmingRemove(false);
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

  function saveAttachment() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateContentAttachment({
        contentId: item.id,
        slug,
        attachment:
          attachType === "video" ? { type: "video", url: videoUrl } : { type: "link", url: linkUrl },
      });
      if (result.ok) setSaved(true);
      else setError(result.error);
    });
  }

  function togglePublished() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await setContentPublished({
        contentId: item.id,
        slug,
        published: !published,
      });
      if (result.ok) {
        setPublished(!published);
        setSaved(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <li className="rounded-xl border-2 border-green-dark/15 bg-surface-raised p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <Input
            aria-label="Título"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="max-w-xl font-heading text-lg font-bold"
          />
          <textarea
            aria-label="Descrição"
            value={draft.description}
            rows={2}
            placeholder="Descrição"
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className="w-full max-w-xl rounded-xl border border-green-dark/15 bg-surface px-3 py-2 text-sm"
          />
          {detailsDirty && (
            <div className="flex items-center gap-3">
              <Button
                type="button"
                disabled={pending}
                onClick={saveDetails}
                className="px-4 py-1.5 text-sm"
              >
                {pending ? "Salvando..." : "Salvar"}
              </Button>
              <button
                type="button"
                onClick={() => setDraft(savedDraft)}
                className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
              >
                Desfazer
              </button>
            </div>
          )}
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
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className={`text-sm underline-offset-4 hover:underline disabled:opacity-50 ${
              confirmingRemove ? "font-bold text-red-700" : "text-muted hover:text-red-400"
            }`}
          >
            {confirmingRemove ? "Confirmar?" : "Remover"}
          </button>
          {confirmingRemove && (
            <button
              type="button"
              onClick={() => setConfirmingRemove(false)}
              className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 border-t-2 border-green-dark/10 pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">
            Anexo
          </p>
          <div role="group" aria-label="Tipo de anexo" className={segmentedContainer}>
            {ATTACHMENT_OPTIONS.map((o) => {
              const active = attachType === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setAttachType(o.value)}
                  className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-inset ${
                    active ? "bg-green-dark text-surface" : "text-ink hover:bg-green-dark/10"
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        {attachType === "video" && (
          <div className="mt-3 flex flex-wrap items-end gap-3">
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
              onClick={saveAttachment}
              className="px-5 py-2 text-sm"
            >
              {pending ? "Salvando..." : "Salvar vídeo"}
            </Button>
          </div>
        )}

        {attachType === "file" && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
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
        )}

        {attachType === "link" && (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <label
                htmlFor={`link-${item.id}`}
                className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted"
              >
                Link externo
              </label>
              <Input
                id={`link-${item.id}`}
                value={linkUrl}
                spellCheck={false}
                placeholder="https://drive.google.com/..."
                onChange={(e) => {
                  setLinkUrl(e.target.value);
                  setSaved(false);
                }}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={saveAttachment}
              className="px-5 py-2 text-sm"
            >
              {pending ? "Salvando..." : "Salvar link"}
            </Button>
          </div>
        )}

        <div className="mt-4">
          <Button
            type="button"
            variant={published ? "ghost" : "primary"}
            disabled={pending}
            onClick={togglePublished}
            className="px-5 py-2 text-sm"
          >
            {published ? "Despublicar" : "Publicar"}
          </Button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-red-400">{error}</p>}
      {saved && !error && <p className="mt-3 text-sm text-emerald">Salvo.</p>}
    </li>
  );
}
