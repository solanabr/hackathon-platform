"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { ImageUpload } from "./image-upload";
import { sanitizeText, sanitizeUrl } from "@/lib/security";
import type { Submission } from "@/types/db";

type Props = {
  teamId: string;
  isLeader: boolean;
  editable: boolean;
  initial: Submission;
  initialImageUrl: string | null;
  dashboardHref: string;
};

type FormState = {
  project_name: string;
  description: string;
  pitch_deck_url: string;
  pitch_video_url: string;
  demo_video_url: string;
  github_url: string;
  twitter_url: string;
  website_url: string;
  github_access_granted: boolean;
};

function formatSavedAt(date: Date): string {
  // Pin to America/Sao_Paulo so SSR (UTC) and client (BRT) format identically.
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function toForm(s: Submission): FormState {
  return {
    project_name: s.project_name ?? "",
    description: s.description ?? "",
    pitch_deck_url: s.pitch_deck_url ?? "",
    pitch_video_url: s.pitch_video_url ?? "",
    demo_video_url: s.demo_video_url ?? "",
    github_url: s.github_url ?? "",
    twitter_url: s.twitter_url ?? "",
    website_url: s.website_url ?? "",
    github_access_granted: s.github_access_granted ?? false,
  };
}

const SUBMIT_ERRORS: Record<string, string> = {
  not_authenticated: "Sessão expirada.",
  not_leader: "Apenas o líder pode submeter.",
  already_locked: "Time já submetido.",
  team_not_found: "Time não encontrado.",
  deadline_passed: "Prazo encerrado.",
  missing_required_fields:
    "Preencha todos os campos obrigatórios (incluindo a imagem do projeto) antes de submeter.",
  members_missing_luma:
    "Todos os integrantes precisam confirmar a inscrição no Luma antes da submissão.",
};

export function SubmissionEditor({ teamId, isLeader, editable, initial, initialImageUrl, dashboardHref }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState<FormState>(toForm(initial));
  const [imagePath, setImagePath] = useState<string | null>(initial.image_path);
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [savedAt, setSavedAt] = useState<Date | null>(initial.updated_at ? new Date(initial.updated_at) : null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingSubmit, startSubmit] = useTransition();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function save(): Promise<boolean> {
    if (!editable) return false;
    setSaving(true);
    setSubmitError(null);

    const payload = {
      project_name: sanitizeText(form.project_name, 120),
      description: sanitizeText(form.description, 4000),
      pitch_deck_url: sanitizeUrl(form.pitch_deck_url),
      pitch_video_url: sanitizeUrl(form.pitch_video_url),
      demo_video_url: sanitizeUrl(form.demo_video_url),
      github_url: sanitizeUrl(form.github_url),
      twitter_url: sanitizeUrl(form.twitter_url),
      website_url: sanitizeUrl(form.website_url),
      image_path: imagePath,
      github_access_granted: form.github_access_granted,
    };

    const { error } = await supabase.from("submissions").update(payload).eq("team_id", teamId);
    setSaving(false);
    if (error) {
      setSubmitError("Não foi possível salvar. Tente novamente.");
      return false;
    }
    setSavedAt(new Date());
    router.refresh();
    return true;
  }

  async function submit() {
    if (!editable || !isLeader) return;
    if (!confirm("Após submeter, ninguém do time pode editar. Confirma?")) return;

    const saved = await save();
    if (!saved) return;

    startSubmit(async () => {
      setSubmitError(null);
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const code = data.code as string | undefined;
        setSubmitError(
          (code && SUBMIT_ERRORS[code]) ?? data.error ?? "Não foi possível submeter.",
        );
        return;
      }
      router.push(dashboardHref);
      router.refresh();
    });
  }

  const allRequiredFilled =
    !!form.project_name.trim() &&
    !!form.description.trim() &&
    !!sanitizeUrl(form.pitch_deck_url) &&
    !!sanitizeUrl(form.pitch_video_url) &&
    !!sanitizeUrl(form.github_url) &&
    form.github_access_granted;

  return (
    <div className="space-y-6">
      <fieldset disabled={!editable} className="space-y-6 disabled:opacity-70">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="project_name">Nome do projeto*</Label>
            <Input
              id="project_name"
              maxLength={120}
              placeholder="Ex.: Cerrado Pay"
              value={form.project_name}
              onChange={(e) => set("project_name", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description" hint={`${form.description.length}/4000`}>
              Descrição*
            </Label>
            <Textarea
              id="description"
              rows={5}
              maxLength={4000}
              placeholder="O que é o projeto, para quem é, o que já está rodando e o que vem a seguir."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="pitch_deck_url">Deck (PDF / Notion / Slides)*</Label>
            <Input
              id="pitch_deck_url"
              type="url"
              placeholder="https://"
              value={form.pitch_deck_url}
              onChange={(e) => set("pitch_deck_url", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="pitch_video_url">Vídeo de apresentação (demo) (≤ 3 min)*</Label>
            <Input
              id="pitch_video_url"
              type="url"
              placeholder="https://youtube.com/..."
              value={form.pitch_video_url}
              onChange={(e) => set("pitch_video_url", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="github_url">Repositório GitHub*</Label>
            <Input
              id="github_url"
              type="url"
              placeholder="https://github.com/..."
              value={form.github_url}
              onChange={(e) => set("github_url", e.target.value)}
            />
            <p className="mt-1.5 text-xs text-muted">
              Se o repositório for privado, adicione{" "}
              <a
                href="https://github.com/kauenet"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-ink underline-offset-2 hover:text-emerald hover:underline"
              >
                @kauenet
              </a>{" "}
              como colaborador para os juízes terem acesso.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-start gap-3 rounded-xl border border-green/15 bg-surface-raised p-4">
              <input
                type="checkbox"
                checked={form.github_access_granted}
                onChange={(e) => set("github_access_granted", e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-emerald"
              />
              <span className="text-sm text-ink">
                Confirmo que adicionei{" "}
                <a
                  href="https://github.com/kauenet"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline-offset-2 hover:text-emerald hover:underline"
                >
                  @kauenet
                </a>{" "}
                como colaborador do repositório, para os juízes acessarem o código.*
              </span>
            </label>
          </div>
          <div>
            <Label htmlFor="twitter_url" hint="opcional">X / Twitter</Label>
            <Input
              id="twitter_url"
              type="url"
              placeholder="https://x.com/..."
              value={form.twitter_url}
              onChange={(e) => set("twitter_url", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="website_url" hint="opcional">Site</Label>
            <Input
              id="website_url"
              type="url"
              placeholder="https://"
              value={form.website_url}
              onChange={(e) => set("website_url", e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label hint="JPG / PNG · 250 × 250 px · até 5 MB">Imagem de capa do projeto</Label>
          <ImageUpload
            teamId={teamId}
            currentPath={imagePath}
            currentUrl={imageUrl}
            disabled={!editable}
            onUploaded={async (path, url) => {
              setImagePath(path);
              setImageUrl(url);
              if (!editable) return;
              const { error } = await supabase
                .from("submissions")
                .update({ image_path: path })
                .eq("team_id", teamId);
              if (!error) {
                setSavedAt(new Date());
                router.refresh();
              }
            }}
          />
        </div>
      </fieldset>

      {submitError && (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {submitError}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-green/15 pt-6">
        <p className="text-xs text-muted" suppressHydrationWarning>
          {savedAt ? `Salvo às ${formatSavedAt(savedAt)} (horário de Brasília).` : "Nenhuma edição salva ainda."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={() => save()} disabled={!editable || saving}>
            {saving ? "Salvando..." : "Salvar rascunho"}
          </Button>
          {isLeader && (
            <Button
              type="button"
              variant="primary"
              onClick={submit}
              disabled={!editable || pendingSubmit || !allRequiredFilled}
              title={allRequiredFilled ? "" : "Preencha todos os campos obrigatórios"}
            >
              {pendingSubmit ? "Submetendo..." : "Submeter projeto"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
