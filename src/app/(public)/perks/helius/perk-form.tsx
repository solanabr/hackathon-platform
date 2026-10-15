"use client";

import { useActionState, useEffect, useState, startTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { trackClient } from "@/lib/analytics-browser";
import { applyForHeliusPerk } from "./actions";
import { PERK } from "./constants";
import { PERK_LIMITS, type PerkField } from "./application";
import type { PerkApplication, User } from "@/types/db";

type State = { ok: false; error: string; field: PerkField };

export type ProjectPrefill = { project_name: string; project_summary: string | null };

const LEGEND = "mb-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-emerald";

export function PerkForm({
  profile,
  email,
  application,
  prefill,
}: {
  profile: User | null;
  email: string;
  application: PerkApplication | null;
  prefill: ProjectPrefill | null;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: State, formData: FormData) => {
      // A successful send redirects from the action, so only an error comes back.
      const result = await applyForHeliusPerk(prev, formData);
      if (!result) return prev;
      trackClient("perk_form_error", { perk: PERK, field: result.field });
      return result;
    },
    { ok: false, error: "", field: "server" } as State,
  );

  useEffect(() => {
    trackClient("perk_form_viewed", { perk: PERK, editing: Boolean(application) });
  }, [application]);

  // Same reason as StartupForm: a manual dispatch keeps the answers on a
  // validation error.
  const [edited, setEdited] = useState(false);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEdited(false);
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  };

  const errorField = state.error && !edited ? state.field : null;
  useEffect(() => {
    if (!errorField || errorField === "server") return;
    const el = document.getElementById(errorField);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    el?.focus({ preventScroll: true });
  }, [errorField, state]);
  const invalid = (field: PerkField) =>
    errorField === field
      ? {
          "aria-invalid": true as const,
          "aria-describedby": `${field}-error`,
          className: "border-red-500 focus:border-red-500 focus:ring-red-500/30",
        }
      : {};
  const fieldError = (field: PerkField) =>
    errorField === field ? (
      <p id={`${field}-error`} role="alert" className="mt-1.5 text-sm font-semibold text-red-700">
        {state.error}
      </p>
    ) : null;

  return (
    <form onSubmit={submit} onChange={() => setEdited(true)} className="space-y-6">
      <fieldset className="space-y-4">
        <legend className={LEGEND}>Seus dados</legend>
        <div>
          <Label htmlFor="full_name">Nome</Label>
          <Input
            id="full_name"
            name="full_name"
            autoComplete="name"
            maxLength={PERK_LIMITS.full_name}
            defaultValue={profile?.full_name ?? ""}
            {...invalid("full_name")}
          />
          {fieldError("full_name")}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="whatsapp" hint="com DDD">WhatsApp</Label>
            <Input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              autoComplete="tel"
              placeholder="(11) 91234-5678"
              defaultValue={profile?.whatsapp ?? ""}
              {...invalid("whatsapp")}
            />
            {fieldError("whatsapp")}
          </div>
          <div>
            <Label htmlFor="email" hint="vem do seu login">E-mail</Label>
            <Input id="email" type="email" value={email} readOnly className="bg-surface text-muted" />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className={LEGEND}>Seu projeto</legend>
        {prefill && (
          <p className="rounded-xl bg-yellow/30 px-4 py-3 text-sm leading-relaxed text-ink">
            Trouxemos o que você já contou para a gente em outro formulário. Confira antes de enviar.
          </p>
        )}
        <div>
          <Label htmlFor="project_name">Nome do projeto</Label>
          <Input
            id="project_name"
            name="project_name"
            maxLength={PERK_LIMITS.project_name}
            defaultValue={application?.project_name ?? prefill?.project_name ?? ""}
            {...invalid("project_name")}
          />
          {fieldError("project_name")}
        </div>
        <div>
          <Label htmlFor="project_summary" hint="o que é e em que pé está">Resumo do projeto</Label>
          <Textarea
            id="project_summary"
            name="project_summary"
            rows={4}
            maxLength={PERK_LIMITS.project_summary}
            defaultValue={application?.project_summary ?? prefill?.project_summary ?? ""}
            {...invalid("project_summary")}
          />
          {fieldError("project_summary")}
        </div>
        <div>
          <Label htmlFor="usage_plan">Onde e por que você usaria os produtos da Helius?</Label>
          <Textarea
            id="usage_plan"
            name="usage_plan"
            rows={4}
            maxLength={PERK_LIMITS.usage_plan}
            placeholder="RPC, webhooks, DAS API... Conte qual parte do projeto depende disso."
            defaultValue={application?.usage_plan ?? ""}
            {...invalid("usage_plan")}
          />
          {fieldError("usage_plan")}
        </div>
      </fieldset>

      {errorField === "server" && (
        <p role="alert" className="text-sm font-semibold text-red-700">
          {state.error}
        </p>
      )}

      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "Enviando..." : application ? "Salvar alterações" : "Enviar aplicação"}
      </Button>
    </form>
  );
}
