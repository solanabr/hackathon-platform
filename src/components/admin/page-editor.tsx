"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
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

export function PageEditor({ slug, initialDoc }: { slug: string; initialDoc: string }) {
  const router = useRouter();
  const [doc, setDoc] = useState(initialDoc);
  const [saved, setSaved] = useState(initialDoc);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const segments = useMemo(() => parsePageDoc(doc), [doc]);
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

        <div className="h-[70vh] overflow-y-auto rounded-2xl border-2 border-green-dark/15 bg-surface p-5">
          {segments.length === 0 && (
            <p className="font-mono text-sm text-muted">Página em branco.</p>
          )}
          <div className="space-y-6">
            {segments.map((seg, i) =>
              seg.type === "prose" ? (
                <div key={i} className="prose-lp text-sm">
                  <ReactMarkdown>{seg.md}</ReactMarkdown>
                </div>
              ) : (
                <BlockPlaceholder key={i} name={seg.name} body={seg.body} />
              ),
            )}
          </div>
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

function BlockPlaceholder({ name, body }: { name: BlockName; body: string }) {
  const info = BLOCK_INFO[name];
  const badJson = name === "deliverables" && body.trim() !== "" && parseBlockBody(body) === null;
  return (
    <div className="rounded-xl border-2 border-dashed border-emerald/40 bg-emerald/5 px-4 py-3">
      <p className="font-mono text-xs font-bold uppercase tracking-widest text-emerald">
        {info.label}
      </p>
      <p className="mt-0.5 text-xs text-muted">{info.detail}</p>
      {badJson && (
        <p className="mt-1 text-xs font-semibold text-red-700">
          JSON inválido — o bloco não vai renderizar.
        </p>
      )}
    </div>
  );
}
