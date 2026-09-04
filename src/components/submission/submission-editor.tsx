"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DATE_TIME_NUMERIC } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { ImageUpload } from "./image-upload";
import { sanitizeText, sanitizeUrl } from "@/lib/security";
import type { Submission } from "@/types/db";

type Props = {
  teamId: string;
  teamName: string;
  isLeader: boolean;
  editable: boolean;
  initial: Submission;
  initialImageUrl: string | null;
  dashboardHref: string;
  membersPending: number;
  membersAccepted: number;
  teamMin: number;
  judgeGithubHandle: string | null;
};

type FormState = {
  description: string;
  pitch_deck_url: string;
  pitch_video_url: string;
  demo_video_url: string;
  github_url: string;
  twitter_url: string;
  website_url: string;
  github_access_granted: boolean;
};

// Pinned to America/Sao_Paulo so SSR (UTC) and client (BRT) format identically.
const formatSavedAt = (date: Date) => DATE_TIME_NUMERIC.format(date);
const formatSubmittedAt = formatSavedAt;

function toForm(s: Submission): FormState {
  return {
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

function submitErrors(teamMin: number): Record<string, string> {
  return {
    not_authenticated: "Sessão expirada.",
    not_leader: "Apenas o líder pode submeter.",
    already_locked: "Time já submetido.",
    team_not_found: "Time não encontrado.",
    deadline_passed: "Prazo encerrado.",
    missing_required_fields:
      "Preencha todos os campos obrigatórios (incluindo a imagem do projeto) antes de submeter.",
    team_too_small: `O time precisa de pelo menos ${teamMin} integrantes para submeter.`,
    members_missing_luma:
      "Todos os integrantes precisam confirmar a inscrição no Luma antes da submissão.",
  };
}

export function SubmissionEditor({
  teamId,
  teamName,
  isLeader,
  editable,
  initial,
  initialImageUrl,
  dashboardHref,
  membersPending,
  membersAccepted,
  teamMin,
  judgeGithubHandle,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState<FormState>(toForm(initial));
  const [name, setName] = useState(teamName);
  const savedName = useRef(teamName);
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

    // Without .select() PostgREST answers 204 even when RLS matched zero rows
    // (locked team, deadline passed) — the editor would paint "Salvo" over
    // writes being thrown away.
    const { data, error } = await supabase
      .from("submissions")
      .update(payload)
      .eq("team_id", teamId)
      .select("id");
    setSaving(false);
    if (error) {
      setSubmitError("Não foi possível salvar. Tente novamente.");
      return false;
    }
    if (!data || data.length === 0) {
      setSubmitError(
        "Nada foi salvo: o prazo de submissão passou e o time foi travado. Recarregue a página.",
      );
      return false;
    }

    // The name is the team's name — one edit point. The teams trigger is the
    // only writer of project_name; RLS lets only the unlocked team's leader
    // through here.
    const nextName = sanitizeText(name, 80);
    if (isLeader && nextName && nextName !== savedName.current) {
      const { data: renamed, error: renameError } = await supabase
        .from("teams")
        .update({ name: nextName })
        .eq("id", teamId)
        .select("id");
      if (renameError) {
        setSubmitError(
          renameError.code === "23505"
            ? "Já existe um time com esse nome."
            : "Não foi possível salvar o nome. Tente novamente.",
        );
        return false;
      }
      if (!renamed || renamed.length === 0) {
        setSubmitError("O nome não foi salvo: o time já está travado.");
        return false;
      }
      savedName.current = nextName;
    }

    setSavedAt(new Date());
    router.refresh();
    return true;
  }

  const submitInFlight = useRef(false);

  async function submit() {
    if (!editable || !isLeader) return;
    if (submitInFlight.current || pendingSubmit) return;
    submitInFlight.current = true;

    const saved = await save();
    if (!saved) {
      submitInFlight.current = false;
      return;
    }

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
          (code && submitErrors(teamMin)[code]) ?? data.error ?? "Não foi possível submeter.",
        );
        submitInFlight.current = false;
        return;
      }
      router.push(dashboardHref);
      router.refresh();
    });
  }

  const isDraft = initial.status !== "submitted";
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // Autosave drafts 800ms after the last keystroke, but never while a
    // submit is in flight; the manual "Salvar rascunho" button still saves
    // on click.
    if (!editable || pendingSubmit || !isDraft) return;
    const id = setTimeout(() => {
      void saveRef.current();
    }, 800);
    return () => clearTimeout(id);
  }, [form, name, pendingSubmit, editable, isDraft]);

  const allRequiredFilled =
    !!name.trim() &&
    !!form.description.trim() &&
    !!sanitizeUrl(form.pitch_deck_url) &&
    !!sanitizeUrl(form.pitch_video_url) &&
    !!sanitizeUrl(form.github_url) &&
    form.github_access_granted;

  const canSubmit = allRequiredFilled && membersPending === 0 && membersAccepted >= teamMin;
  const blockedReason = !allRequiredFilled
    ? "Preencha todos os campos obrigatórios"
    : membersAccepted < teamMin
      ? `O time precisa de pelo menos ${teamMin} integrantes`
      : membersPending > 0
      ? `${membersPending} ${membersPending === 1 ? "integrante ainda não confirmou" : "integrantes ainda não confirmaram"} a inscrição`
      : "";

  return (
    <div className="space-y-6">
      <fieldset disabled={!editable} className="space-y-6 disabled:opacity-70">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="project_name">Nome do projeto*</Label>
            <Input
              id="project_name"
              maxLength={80}
              placeholder="Ex.: Cerrado Pay"
              value={name}
              disabled={!isLeader}
              onChange={(e) => setName(e.target.value)}
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
              {judgeGithubHandle ? (
                <a
                  href={`https://github.com/${judgeGithubHandle}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-ink underline-offset-2 hover:text-emerald hover:underline"
                >
                  @{judgeGithubHandle}
                </a>
              ) : (
                <span className="font-medium text-ink">o usuário indicado pela organização</span>
              )}{" "}
              como colaborador para os juízes terem acesso.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="github_access_granted"
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-green-dark/15 bg-surface-raised p-4 has-[:disabled]:cursor-not-allowed"
            >
              <input
                id="github_access_granted"
                type="checkbox"
                checked={form.github_access_granted}
                onChange={(e) => set("github_access_granted", e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-emerald disabled:cursor-not-allowed"
              />
              <span className="text-sm text-ink">
                Confirmo que adicionei{" "}
                {judgeGithubHandle ? (
                  <a
                    href={`https://github.com/${judgeGithubHandle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline-offset-2 hover:text-emerald hover:underline"
                  >
                    @{judgeGithubHandle}
                  </a>
                ) : (
                  <span className="font-medium">o usuário indicado pela organização</span>
                )}{" "}
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
          <Label htmlFor="project_image" hint="JPG / PNG, 250 × 250 px, até 5 MB">Imagem de capa do projeto</Label>
          <ImageUpload
            inputId="project_image"
            teamId={teamId}
            currentPath={imagePath}
            currentUrl={imageUrl}
            disabled={!editable}
            onUploaded={async (path, url) => {
              setImagePath(path);
              setImageUrl(url);
              if (!editable) return;
              setSubmitError(null);
              const { data, error } = await supabase
                .from("submissions")
                .update({ image_path: path })
                .eq("team_id", teamId)
                .select("id");
              if (error) {
                setSubmitError("A imagem subiu, mas não foi salva no projeto. Tente de novo.");
                return;
              }
              if (!data || data.length === 0) {
                setSubmitError(
                  "A imagem subiu, mas nada foi salvo: o prazo passou e o time foi travado.",
                );
                return;
              }
              setSavedAt(new Date());
              router.refresh();
            }}
          />
        </div>
      </fieldset>

      {submitError && (
        <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {submitError}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-green-dark/15 pt-6">
        <p className="text-xs text-muted" suppressHydrationWarning>
          {initial.submitted_at
            ? `Submetido em ${formatSubmittedAt(new Date(initial.submitted_at))} (horário de Brasília).`
            : savedAt
              ? `Salvo às ${formatSavedAt(savedAt)} (horário de Brasília).`
              : "Nenhuma edição salva ainda."}
        </p>
        <div className="flex flex-wrap gap-3">
          {editable && (
          <Button type="button" variant="secondary" onClick={() => save()} disabled={saving}>
            {saving ? "Salvando..." : "Salvar rascunho"}
          </Button>
          )}
          {isLeader && (
            <ConfirmButton
              label={pendingSubmit ? "Submetendo..." : "Submeter projeto"}
              variant="primary"
              disabled={!editable || pendingSubmit || !canSubmit}
              title={blockedReason}
              prompt="Após submeter, ninguém do time pode editar."
              confirmLabel="Submeter"
              onConfirm={submit}
            />
          )}
        </div>
      </div>
      {editable && isLeader && !canSubmit && (
        <p className="text-sm font-medium text-red-300">{blockedReason}.</p>
      )}
    </div>
  );
}
