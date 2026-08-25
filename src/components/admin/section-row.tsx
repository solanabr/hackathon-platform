"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  createMarkdownSection,
  deleteSection,
  moveSection,
  setSectionVisible,
  updateSection,
} from "@/app/(app)/admin/h/[slug]/sections/actions";
import type { HackathonSection } from "@/types/db";

const KIND_LABEL: Record<string, string> = {
  markdown: "Markdown",
  phases: "Etapas",
  schedule: "Programação",
  deliverables: "Entregáveis",
  prizes: "Premiação",
};

export function SectionRow({ slug, section }: { slug: string; section: HackathonSection }) {
  const router = useRouter();
  const [title, setTitle] = useState(section.title ?? "");
  const [subtitle, setSubtitle] = useState(section.subtitle ?? "");
  const [bodyMd, setBodyMd] = useState(section.body_md ?? "");
  const [configJson, setConfigJson] = useState(
    Object.keys(section.config).length > 0 ? JSON.stringify(section.config, null, 2) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error ?? "Algo deu errado.");
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div
      id={`s-${section.id}`}
      className={`rounded-2xl border-2 p-5 sm:p-6 ${
        section.visible ? "border-green-dark bg-surface-raised" : "border-green-dark/25 bg-surface-raised/60"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Badge tone={section.visible ? "emerald" : "neutral"}>
            {KIND_LABEL[section.kind] ?? section.kind}
          </Badge>
          {!section.visible && <span className="text-xs font-semibold text-muted">oculta</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Mover para cima"
            disabled={pending}
            onClick={() => run(() => moveSection({ slug, sectionId: section.id, direction: "up" }))}
            className="rounded-lg border border-green-dark/20 px-2.5 py-1 text-sm font-bold hover:bg-green-dark/10 disabled:opacity-50"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Mover para baixo"
            disabled={pending}
            onClick={() =>
              run(() => moveSection({ slug, sectionId: section.id, direction: "down" }))
            }
            className="rounded-lg border border-green-dark/20 px-2.5 py-1 text-sm font-bold hover:bg-green-dark/10 disabled:opacity-50"
          >
            ↓
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(() =>
                setSectionVisible({ slug, sectionId: section.id, visible: !section.visible }),
              )
            }
            className="rounded-lg border border-green-dark/20 px-3 py-1 text-sm font-semibold hover:bg-green-dark/10 disabled:opacity-50"
          >
            {section.visible ? "Ocultar" : "Mostrar"}
          </button>
          {section.kind === "markdown" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (window.confirm("Remover esta seção da página?")) {
                  run(() => deleteSection({ slug, sectionId: section.id }));
                }
              }}
              className="rounded-lg border border-red-700/30 px-3 py-1 text-sm font-semibold text-red-800 hover:bg-red-600/10 disabled:opacity-50"
            >
              Remover
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`title-${section.id}`}>Título</Label>
          <Input
            id={`title-${section.id}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`subtitle-${section.id}`}>Subtítulo</Label>
          <Input
            id={`subtitle-${section.id}`}
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />
        </div>
      </div>

      {section.kind === "markdown" && (
        <div className="mt-4">
          <Label htmlFor={`body-${section.id}`}>Conteúdo (markdown)</Label>
          <Textarea
            id={`body-${section.id}`}
            rows={8}
            value={bodyMd}
            onChange={(e) => setBodyMd(e.target.value)}
            placeholder={"## Um título\n\nTexto livre com **negrito**, listas e links."}
            className="font-mono text-sm"
          />
        </div>
      )}

      {(section.kind === "phases" || section.kind === "deliverables") && (
        <div className="mt-4">
          <Label htmlFor={`config-${section.id}`}>
            {section.kind === "phases"
              ? "Config (JSON) — items: [{key, label, detail}] sobrescreve o texto das etapas"
              : "Config (JSON) — items: [{value, unit, label, note}]"}
          </Label>
          <Textarea
            id={`config-${section.id}`}
            rows={6}
            value={configJson}
            onChange={(e) => setConfigJson(e.target.value)}
            className="font-mono text-sm"
          />
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() =>
              updateSection({ slug, sectionId: section.id, title, subtitle, bodyMd, configJson }),
            )
          }
        >
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        {saved && !pending && <span className="text-sm font-semibold text-emerald">Salvo.</span>}
        {error && <span className="text-sm font-semibold text-red-800">{error}</span>}
      </div>
    </div>
  );
}

export function AddSectionButton({ slug, hackathonId }: { slug: string; hackathonId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await createMarkdownSection({ slug, hackathonId });
            if (!result.ok) setError(result.error);
            else router.refresh();
          });
        }}
      >
        {pending ? "Criando..." : "+ Nova seção de texto"}
      </Button>
      {error && <span className="text-sm font-semibold text-red-800">{error}</span>}
    </div>
  );
}
