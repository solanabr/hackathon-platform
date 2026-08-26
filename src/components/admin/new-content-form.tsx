"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ATTACHMENT_OPTIONS } from "@/components/admin/content-row";
import { segmentedContainer } from "@/components/ui/segmented";
import { emptyDraft, type AttachmentType, type ContentDraft } from "@/lib/content-fields";
import { createContent, uploadContentFile } from "@/app/(app)/admin/h/[slug]/content/actions";

export function NewContentForm({ hackathonId, slug }: { hackathonId: string; slug: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ContentDraft>(emptyDraft);
  const [attachType, setAttachType] = useState<AttachmentType>("video");
  const [attachUrl, setAttachUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setDraft(emptyDraft());
    setAttachType("video");
    setAttachUrl("");
    setError(null);
  }

  function create() {
    setError(null);
    start(async () => {
      const result = await createContent({
        hackathonId,
        slug,
        details: draft,
        attachment:
          attachType === "file" ? undefined : { type: attachType, url: attachUrl },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }

      // The file path is keyed by the content id, so the upload can only
      // happen after the row exists.
      const file = fileRef.current?.files?.[0];
      if (attachType === "file" && file) {
        const formData = new FormData();
        formData.set("file", file);
        const uploaded = await uploadContentFile({ contentId: result.contentId, slug, formData });
        if (!uploaded.ok) {
          setError(`Conteúdo criado, mas o arquivo falhou: ${uploaded.error}`);
          return;
        }
      }

      reset();
      setOpen(false);
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
        Entra como rascunho no fim da lista. Cada item leva um anexo: vídeo, arquivo ou link.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="new-title"
            className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted"
          >
            Título
          </label>
          <Input
            id="new-title"
            value={draft.title}
            placeholder="Ex.: Abertura do hackathon"
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </div>
        <div>
          <label
            htmlFor="new-description"
            className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted"
          >
            Descrição
          </label>
          <textarea
            id="new-description"
            value={draft.description}
            rows={3}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className="mt-1 w-full rounded-xl border border-green-dark/15 bg-surface px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mt-5 border-t-2 border-green-dark/10 pt-4">
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

        {attachType === "file" ? (
          <div className="mt-3">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.pptx,.docx"
              className="block text-sm text-muted file:mr-3 file:rounded-full file:border-2 file:border-green-dark file:bg-transparent file:px-4 file:py-1.5 file:text-sm file:font-bold file:text-ink"
            />
            <p className="mt-1 text-xs text-muted">PDF, imagem, PPTX ou DOCX, até 25 MB.</p>
          </div>
        ) : (
          <div className="mt-3 max-w-md">
            <label
              htmlFor="new-attachment-url"
              className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted"
            >
              {attachType === "video" ? "Link do YouTube" : "Link externo"}
            </label>
            <Input
              id="new-attachment-url"
              value={attachUrl}
              spellCheck={false}
              placeholder={
                attachType === "video" ? "https://youtu.be/..." : "https://drive.google.com/..."
              }
              onChange={(e) => setAttachUrl(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="button" disabled={pending} onClick={create} className="px-5 py-2 text-sm">
          {pending ? "Criando..." : "Criar"}
        </Button>
        <button
          type="button"
          onClick={() => {
            reset();
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
