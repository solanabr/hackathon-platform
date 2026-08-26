"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EditionPageDoc, type DocContext } from "@/components/edition/page-doc";
import { savePageMd } from "@/app/(app)/admin/h/[slug]/page/actions";

export function PageEditor({
  slug,
  initialDoc,
  savedDoc,
  ctx,
}: {
  slug: string;
  initialDoc: string;
  ctx: DocContext;
  // What the DB currently holds — differs from initialDoc when the editor
  // pre-fills the template for an edition that has no document yet.
  savedDoc?: string;
}) {
  const router = useRouter();
  const [doc, setDoc] = useState(initialDoc);
  const [saved, setSaved] = useState(savedDoc ?? initialDoc);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = doc !== saved;

  function onSave() {
    setError(null);
    startTransition(async () => {
      const result = await savePageMd({ slug, pageMd: doc });
      if (result.ok) {
        setSaved(doc);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={pending || !dirty}
          onClick={onSave}
          className="px-6 py-2 text-sm"
        >
          {pending ? "Salvando..." : dirty ? "Salvar" : "Salvo"}
        </Button>
        {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <textarea
          value={doc}
          onChange={(e) => setDoc(e.target.value)}
          spellCheck={false}
          className="h-[70vh] w-full resize-none rounded-2xl border-2 border-green-dark/15 bg-surface-raised p-5 font-mono text-sm leading-relaxed"
          aria-label="Documento da página"
        />

        <div className="h-[70vh] overflow-y-auto rounded-2xl border-2 border-green-dark/15 bg-surface">
          {/* Scaled down so the full-width page composition is readable
              inside the pane without a horizontal scrollbar. */}
          <div className="w-[200%] origin-top-left scale-50">
            <EditionPageDoc doc={doc} ctx={ctx} />
          </div>
        </div>
      </div>

      <p className="mt-4 max-w-2xl text-xs text-muted">
        O documento é markdown — títulos com ##, listas e tabelas. Uma linha com{" "}
        <code className="rounded bg-green-dark/10 px-1.5 py-0.5 font-mono text-xs">```phases```</code>{" "}
        ou{" "}
        <code className="rounded bg-green-dark/10 px-1.5 py-0.5 font-mono text-xs">```schedule```</code>{" "}
        solta ali a linha do tempo ou a agenda ao vivo (datas na edição, agenda em Conteúdos).
        Finalistas e as marcas entram sozinhos no fim da página.
      </p>
    </div>
  );
}
