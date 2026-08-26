"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EditionPageDoc, type DocContext } from "@/components/edition/page-doc";
import { savePageMd } from "@/app/(app)/admin/h/[slug]/page/actions";
import { parsePageDoc, parseBlockBody, type BlockName } from "@/lib/page-doc";

const BLOCK_INFO: Record<BlockName, { label: string; detail: string }> = {
  phases: { label: "Etapas", detail: "Linha do tempo das fases, com as datas da edição." },
  schedule: { label: "Programação", detail: "Agenda publicada em Conteúdos." },
  deliverables: { label: "Entregáveis", detail: "Cards de número grande a partir do JSON." },
  prizes: { label: "Premiação", detail: "Painel de prêmios a partir do resumo da edição." },
  finalists: { label: "Finalistas", detail: "Grid de finalistas, só depois do anúncio." },
  partners: { label: "Marcas", detail: "Faixa Realização/Apoiadores, gerida em Marcas." },
};

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
  const segments = useMemo(() => parsePageDoc(doc), [doc]);
  // The renderer drops a malformed block silently, so surface it here.
  const badBlocks = useMemo(
    () =>
      segments
        .filter((s) => s.type === "block" && s.body.trim() !== "" && parseBlockBody(s.body) === null)
        .map((s) => (s as { name: BlockName }).name),
    [segments],
  );
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
          {segments.length === 0 ? (
            <p className="p-5 font-mono text-sm text-muted">Página em branco.</p>
          ) : (
            <>
              {badBlocks.length > 0 && (
                <ul className="m-5 mb-0 space-y-1 rounded-xl border-2 border-red-700/30 bg-red-600/10 p-4">
                  {badBlocks.map((name) => (
                    <li key={name} className="text-xs font-semibold text-red-800">
                      {`\`\`\`${name}`}: JSON inválido — o bloco não vai renderizar.
                    </li>
                  ))}
                </ul>
              )}
              {/* Scaled down so the full-width page composition is readable
                  inside the pane without a horizontal scrollbar. */}
              <div className="w-[200%] origin-top-left scale-50">
                <EditionPageDoc doc={doc} ctx={ctx} />
              </div>
            </>
          )}
        </div>
      </div>

      <details className="mt-6 rounded-2xl border-2 border-green-dark/15 bg-surface-raised p-5">
        <summary className="cursor-pointer font-heading text-sm font-bold">
          Blocos disponíveis
        </summary>
        <ul className="mt-4 space-y-2 text-sm">
          {(Object.keys(BLOCK_INFO) as BlockName[]).map((name) => (
            <li key={name} className="flex flex-wrap items-baseline gap-x-3">
              <code className="rounded bg-green-dark/10 px-1.5 py-0.5 font-mono text-xs">
                ```{name}```
              </code>
              <span className="font-semibold">{BLOCK_INFO[name].label}</span>
              <span className="text-muted">{BLOCK_INFO[name].detail}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">
          Entregáveis levam o conteúdo em JSON dentro do bloco. Os demais blocos leem os dados da
          edição — datas, agenda, prêmios, finalistas e marcas são editados nas telas deles.
        </p>
      </details>
    </div>
  );
}
