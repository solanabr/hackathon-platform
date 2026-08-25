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

type DeliverableItem = { value: string; unit: string; label: string; note: string };
type PhaseOverride = { key: string; label: string; detail: string };

const PHASE_KEYS = [
  { key: "fase1", name: "Fase 1" },
  { key: "submissao", name: "Desenvolvimento e submissão" },
  { key: "selecao", name: "Seleção" },
  { key: "fase2", name: "Fase 2" },
] as const;

function readItems<T>(config: Record<string, unknown>): T[] {
  return Array.isArray(config.items) ? (config.items as T[]) : [];
}

export function SectionRow({ slug, section }: { slug: string; section: HackathonSection }) {
  const router = useRouter();
  const [title, setTitle] = useState(section.title ?? "");
  const [subtitle, setSubtitle] = useState(section.subtitle ?? "");
  const [bodyMd, setBodyMd] = useState(section.body_md ?? "");
  const [deliverables, setDeliverables] = useState<DeliverableItem[]>(
    section.kind === "deliverables" ? readItems<DeliverableItem>(section.config) : [],
  );
  const [phaseOverrides, setPhaseOverrides] = useState<PhaseOverride[]>(
    section.kind === "phases"
      ? PHASE_KEYS.map((p) => {
          const existing = readItems<PhaseOverride>(section.config).find((o) => o.key === p.key);
          return { key: p.key, label: existing?.label ?? "", detail: existing?.detail ?? "" };
        })
      : [],
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

  // The editor owns the config shape; the action only ever sees valid JSON.
  function buildConfigJson(): string | null {
    if (section.kind === "deliverables") {
      const items = deliverables
        .map((d) => ({
          value: d.value.trim(),
          unit: d.unit.trim(),
          label: d.label.trim(),
          note: d.note.trim(),
        }))
        .filter((d) => d.label);
      return JSON.stringify({ items });
    }
    if (section.kind === "phases") {
      const items = phaseOverrides
        .map((o) => ({ key: o.key, label: o.label.trim(), detail: o.detail.trim() }))
        .filter((o) => o.label || o.detail)
        .map((o) => ({
          key: o.key,
          ...(o.label ? { label: o.label } : {}),
          ...(o.detail ? { detail: o.detail } : {}),
        }));
      return JSON.stringify(items.length > 0 ? { items } : {});
    }
    return null;
  }

  function setDeliverable(i: number, patch: Partial<DeliverableItem>) {
    setDeliverables((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  function setPhase(i: number, patch: Partial<PhaseOverride>) {
    setPhaseOverrides((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }

  return (
    <div
      id={`s-${section.id}`}
      className={`rounded-2xl border-2 p-5 sm:p-6 ${
        section.visible
          ? "border-green-dark bg-surface-raised"
          : "border-green-dark/25 bg-surface-raised/60"
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

      {section.kind === "deliverables" && (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-semibold text-muted">Itens</p>
          {deliverables.map((d, i) => (
            <div
              key={i}
              className="grid gap-2 rounded-xl border border-green-dark/15 p-3 sm:grid-cols-[5rem_7rem_1fr_auto]"
            >
              <Input
                aria-label="Valor"
                placeholder="10"
                value={d.value}
                onChange={(e) => setDeliverable(i, { value: e.target.value })}
              />
              <Input
                aria-label="Unidade"
                placeholder="slides"
                value={d.unit}
                onChange={(e) => setDeliverable(i, { unit: e.target.value })}
              />
              <div className="space-y-2">
                <Input
                  aria-label="Nome do item"
                  placeholder="Pitch deck"
                  value={d.label}
                  onChange={(e) => setDeliverable(i, { label: e.target.value })}
                />
                <Input
                  aria-label="Observação"
                  placeholder="Quem passar do limite é desclassificado."
                  value={d.note}
                  onChange={(e) => setDeliverable(i, { note: e.target.value })}
                />
              </div>
              <button
                type="button"
                aria-label="Remover item"
                onClick={() => setDeliverables((prev) => prev.filter((_, idx) => idx !== i))}
                className="self-start rounded-lg border border-red-700/30 px-2.5 py-1 text-sm font-bold text-red-800 hover:bg-red-600/10"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setDeliverables((prev) => [...prev, { value: "", unit: "", label: "", note: "" }])
            }
            className="rounded-full border-2 border-green-dark px-4 py-1.5 text-sm font-bold hover:bg-green-dark/10"
          >
            + Item
          </button>
        </div>
      )}

      {section.kind === "phases" && (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-semibold text-muted">
            Texto das etapas (vazio = usa o texto padrão; as datas vêm da edição)
          </p>
          {phaseOverrides.map((o, i) => (
            <div key={o.key} className="rounded-xl border border-green-dark/15 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald">
                {PHASE_KEYS[i].name}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Input
                  aria-label={`Título da ${PHASE_KEYS[i].name}`}
                  placeholder="Título"
                  value={o.label}
                  onChange={(e) => setPhase(i, { label: e.target.value })}
                />
                <Input
                  aria-label={`Descrição da ${PHASE_KEYS[i].name}`}
                  placeholder="Descrição"
                  value={o.detail}
                  onChange={(e) => setPhase(i, { detail: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {section.kind === "prizes" && (
        <p className="mt-4 rounded-xl border border-yellow/40 bg-yellow/10 px-4 py-3 text-sm leading-relaxed">
          Os prêmios vêm do campo <strong>Premiação</strong> da edição — edite em{" "}
          <a href={`/admin/h/${slug}`} className="font-semibold text-emerald underline">
            dados da edição
          </a>
          .
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() =>
              updateSection({
                slug,
                sectionId: section.id,
                title,
                subtitle,
                bodyMd,
                configJson: buildConfigJson(),
              }),
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

export function AddSectionButton({ slug }: { slug: string }) {
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
            const result = await createMarkdownSection({ slug });
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
