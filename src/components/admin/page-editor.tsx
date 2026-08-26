"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import type { DocContext } from "@/components/edition/page-doc";
import { savePageMd } from "@/app/(app)/admin/h/[slug]/page/actions";

// The live preview drags the whole markdown pipeline (micromark, remark-gfm)
// into the client — load it lazily so the editor paints without it.
const EditionPageDoc = dynamic(
  () => import("@/components/edition/page-doc").then((m) => m.EditionPageDoc),
  { ssr: false, loading: () => <p className="p-6 font-mono text-sm text-muted">Carregando…</p> },
);

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
        O documento é markdown puro — títulos com ## (que viram âncoras), listas e tabelas. Tudo
        que está na página se edita aqui, menos os finalistas (aparecem sozinhos depois do
        anúncio) e as marcas (geridas em Marcas), que entram no fim da página.
      </p>
    </div>
  );
}
