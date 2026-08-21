"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusChip } from "@/components/ui/section-card";
import { updateContent, uploadContentFile } from "@/app/(app)/admin/h/[slug]/content/actions";

export type AdminContentItem = {
  id: string;
  kind: string;
  title: string;
  speaker: string | null;
  scheduledLabel: string;
  youtubeId: string | null;
  fileUrl: string | null;
  published: boolean;
};

export function ContentRow({ item, slug }: { item: AdminContentItem; slug: string }) {
  const [videoUrl, setVideoUrl] = useState(
    item.youtubeId ? `https://youtu.be/${item.youtubeId}` : "",
  );
  const [published, setPublished] = useState(item.published);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

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
    <li className="rounded-2xl border border-green/15 bg-surface-raised p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
            {item.scheduledLabel} · {item.kind}
          </p>
          <h3 className="mt-1 font-heading text-lg font-bold">{item.title}</h3>
          {item.speaker && <p className="text-sm text-muted">{item.speaker}</p>}
        </div>
        <StatusChip tone={published ? "ok" : "muted"}>
          {published ? "publicado" : "rascunho"}
        </StatusChip>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label
            htmlFor={`video-${item.id}`}
            className="text-[11px] font-bold uppercase tracking-wider text-muted"
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

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-green/10 pt-4">
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

      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
      {saved && !error && <p className="mt-3 text-sm text-emerald">Salvo.</p>}
    </li>
  );
}
