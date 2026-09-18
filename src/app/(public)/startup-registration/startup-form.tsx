"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, startTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { trackClient } from "@/lib/analytics-browser";
import { saveStartup } from "./actions";
import {
  HIRING_OPTIONS,
  STAGE_OPTIONS,
  STARTUP_PATH,
  TARGET_CUSTOMERS_OPTIONS,
  TECH_TEAM_OPTIONS,
  TOKEN_LAUNCH_OPTIONS,
  VERTICAL_OPTIONS,
  WORK_TYPE_OPTIONS,
  type StartupStep,
} from "./constants";
import type { StartupField } from "./startup";
import type { Startup, User } from "@/types/db";

type State = { ok: false; error: string; field: StartupField };

const RADIO_CARD =
  "cursor-pointer rounded-xl border-2 border-green-dark/15 bg-surface-raised px-3 py-2.5 text-sm font-medium text-ink transition-colors duration-(--dur-instant) ease-entrada hover:border-green-dark/40 peer-checked:border-green-dark peer-checked:bg-yellow/40 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald/30";

function RadioCards({
  name,
  options,
  defaultValue,
  invalid,
}: {
  name: string;
  options: readonly { value: string; label: string }[];
  defaultValue: string | null | undefined;
  invalid: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <span key={o.value} className="contents">
          <input
            type="radio"
            id={`${name}-${o.value}`}
            name={name}
            value={o.value}
            defaultChecked={defaultValue === o.value}
            className="peer sr-only"
          />
          <label htmlFor={`${name}-${o.value}`} className={`${RADIO_CARD} ${invalid ? "border-red-500" : ""}`}>
            {o.label}
          </label>
        </span>
      ))}
    </div>
  );
}

export function StartupForm({
  step,
  profile,
  email,
  startup,
}: {
  step: StartupStep;
  profile: User | null;
  email: string;
  startup: Startup | null;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: State, formData: FormData) => {
      // A successful save redirects from the action, so only an error comes back.
      const result = await saveStartup(prev, formData);
      if (!result) return prev;
      trackClient("startup_form_error", { field: result.field, step });
      return result;
    },
    { ok: false, error: "", field: "server" } as State,
  );

  useEffect(() => {
    trackClient("startup_form_viewed", { step });
  }, [step]);

  // Same reason as InterestForm: a manual dispatch keeps the answers on a
  // validation error. The intent travels with the button that was clicked.
  const [edited, setEdited] = useState(false);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEdited(false);
    const formData = new FormData(e.currentTarget);
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.name === "intent") formData.set("intent", submitter.value);
    startTransition(() => formAction(formData));
  };

  const errorField = state.error && !edited ? state.field : null;
  useEffect(() => {
    if (!errorField || errorField === "server") return;
    const el = document.getElementById(errorField);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    el?.focus({ preventScroll: true });
  }, [errorField, state]);
  const invalid = (field: StartupField) =>
    errorField === field
      ? {
          "aria-invalid": true as const,
          "aria-describedby": `${field}-error`,
          className: "border-red-500 focus:border-red-500 focus:ring-red-500/30",
        }
      : {};
  const fieldError = (field: StartupField) =>
    errorField === field ? (
      <p id={`${field}-error`} role="alert" className="mt-1.5 text-sm font-semibold text-red-700">
        {state.error}
      </p>
    ) : null;
  // Radio groups have no single input to mark, so the fieldset takes the id
  // and focus.
  const group = (field: StartupField) => ({
    id: field,
    tabIndex: -1,
    ...(errorField === field && { "aria-invalid": true as const, "aria-describedby": `${field}-error` }),
  });

  return (
    <form onSubmit={submit} onChange={() => setEdited(true)} className="space-y-6">
      <input type="hidden" name="step" value={step} />

      {step === 1 && (
        <>
          <fieldset className="space-y-4">
            <legend className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-emerald">
              Contato
            </legend>
            <div>
              <Label htmlFor="full_name">Nome completo</Label>
              <Input id="full_name" name="full_name" maxLength={120} defaultValue={profile?.full_name ?? ""} {...invalid("full_name")} />
              {fieldError("full_name")}
            </div>
            <div>
              <Label htmlFor="email" hint="vem do seu login">E-mail</Label>
              <Input id="email" type="email" value={email} readOnly className="bg-surface text-muted" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="whatsapp" hint="com DDD">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  name="whatsapp"
                  type="tel"
                  placeholder="(11) 91234-5678"
                  defaultValue={profile?.whatsapp ?? ""}
                  {...invalid("whatsapp")}
                />
                {fieldError("whatsapp")}
              </div>
              <div>
                <Label htmlFor="location">Cidade/Estado</Label>
                <Input id="location" name="location" placeholder="São Paulo/SP" defaultValue={profile?.location ?? ""} {...invalid("location")} />
                {fieldError("location")}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="telegram_handle" hint="opcional">Telegram</Label>
                <Input id="telegram_handle" name="telegram_handle" placeholder="@usuario" defaultValue={profile?.telegram_handle ?? ""} />
              </div>
              <div>
                <Label htmlFor="linkedin_url" hint="opcional">LinkedIn</Label>
                <Input
                  id="linkedin_url"
                  name="linkedin_url"
                  type="text"
                  inputMode="url"
                  spellCheck={false}
                  placeholder="https://linkedin.com/in/..."
                  defaultValue={profile?.linkedin_url ?? ""}
                  {...invalid("linkedin_url")}
                />
                {fieldError("linkedin_url")}
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-emerald">
              Seu papel
            </legend>
            <div>
              <Label htmlFor="job_title" hint="opcional">Cargo</Label>
              <Input id="job_title" name="job_title" maxLength={80} placeholder="CEO, CTO..." defaultValue={profile?.job_title ?? ""} />
            </div>
            <div {...group("work_type")}>
              <Label hint="opcional">Tipo de trabalho</Label>
              <RadioCards name="work_type" options={WORK_TYPE_OPTIONS} defaultValue={profile?.work_type} invalid={errorField === "work_type"} />
              {fieldError("work_type")}
            </div>
          </fieldset>
        </>
      )}

      {step === 2 && (
        <>
          <fieldset className="space-y-4">
            <legend className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-emerald">
              Startup
            </legend>
            <div>
              <Label htmlFor="name">Nome da startup</Label>
              <Input id="name" name="name" maxLength={120} defaultValue={startup?.name ?? ""} {...invalid("name")} />
              {fieldError("name")}
            </div>
            <div>
              <Label htmlFor="one_liner" hint="uma frase">O que ela faz?</Label>
              <Input id="one_liner" name="one_liner" maxLength={280} defaultValue={startup?.one_liner ?? ""} />
            </div>
            <div {...group("vertical")}>
              <Label hint="opcional">Vertical</Label>
              <RadioCards name="vertical" options={VERTICAL_OPTIONS} defaultValue={startup?.vertical} invalid={errorField === "vertical"} />
              {fieldError("vertical")}
            </div>
            <div {...group("stage")}>
              <Label hint="opcional">Estágio</Label>
              <RadioCards name="stage" options={STAGE_OPTIONS} defaultValue={startup?.stage} invalid={errorField === "stage"} />
              {fieldError("stage")}
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-emerald">
              Links
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="website" hint="opcional">Site</Label>
                <Input id="website" name="website" type="text" inputMode="url" spellCheck={false} placeholder="https://" defaultValue={startup?.website ?? ""} {...invalid("website")} />
                {fieldError("website")}
              </div>
              <div>
                <Label htmlFor="pitch_deck_url" hint="opcional">Pitch deck</Label>
                <Input id="pitch_deck_url" name="pitch_deck_url" type="text" inputMode="url" spellCheck={false} placeholder="https://" defaultValue={startup?.pitch_deck_url ?? ""} {...invalid("pitch_deck_url")} />
                {fieldError("pitch_deck_url")}
              </div>
              <div>
                <Label htmlFor="twitter" hint="opcional">X / Twitter</Label>
                <Input id="twitter" name="twitter" placeholder="@startup" defaultValue={startup?.twitter ?? ""} />
              </div>
              <div>
                <Label htmlFor="logo_url" hint="opcional">Logo</Label>
                <Input id="logo_url" name="logo_url" type="text" inputMode="url" spellCheck={false} placeholder="https://" defaultValue={startup?.logo_url ?? ""} {...invalid("logo_url")} />
                {fieldError("logo_url")}
              </div>
            </div>
          </fieldset>
        </>
      )}

      {step === 3 && (
        <fieldset className="space-y-5">
          <legend className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-emerald">
            Mais detalhes
          </legend>
          <div {...group("hiring")}>
            <Label hint="opcional">Está contratando?</Label>
            <RadioCards name="hiring" options={HIRING_OPTIONS} defaultValue={startup?.hiring} invalid={errorField === "hiring"} />
            {fieldError("hiring")}
          </div>
          <div {...group("target_customers")}>
            <Label hint="opcional">Para quem você vende?</Label>
            <RadioCards name="target_customers" options={TARGET_CUSTOMERS_OPTIONS} defaultValue={startup?.target_customers} invalid={errorField === "target_customers"} />
            {fieldError("target_customers")}
          </div>
          <div {...group("token_launch")}>
            <Label hint="opcional">Token</Label>
            <RadioCards name="token_launch" options={TOKEN_LAUNCH_OPTIONS} defaultValue={startup?.token_launch} invalid={errorField === "token_launch"} />
            {fieldError("token_launch")}
          </div>
          <div {...group("tech_team")}>
            <Label hint="opcional">Time técnico</Label>
            <RadioCards name="tech_team" options={TECH_TEAM_OPTIONS} defaultValue={startup?.tech_team} invalid={errorField === "tech_team"} />
            {fieldError("tech_team")}
          </div>
          <div>
            <Label htmlFor="heard_from" hint="opcional">Como soube da Superteam Brasil?</Label>
            <Input id="heard_from" name="heard_from" maxLength={200} defaultValue={startup?.heard_from ?? ""} />
          </div>
          <div>
            <Label htmlFor="help_needed" hint="opcional">Como a gente pode ajudar?</Label>
            <Textarea
              id="help_needed"
              name="help_needed"
              rows={4}
              maxLength={1000}
              placeholder="Investidores, grants, talentos, divulgação..."
              defaultValue={startup?.help_needed ?? ""}
            />
          </div>
        </fieldset>
      )}

      {errorField === "server" && (
        <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <Button type="submit" name="intent" value={step === 3 ? "complete" : "continue"} fullWidth disabled={pending}>
          {pending ? "Salvando..." : step === 3 ? "Concluir cadastro" : "Salvar e continuar"}
        </Button>
        <Button type="submit" name="intent" value="later" variant="secondary" fullWidth disabled={pending}>
          Salvar e terminar depois
        </Button>
        {step > 1 && (
          <Link
            href={`${STARTUP_PATH}?step=${step - 1}`}
            className="self-center text-sm font-semibold text-muted underline underline-offset-4 hover:text-ink"
          >
            Voltar
          </Link>
        )}
      </div>
    </form>
  );
}
