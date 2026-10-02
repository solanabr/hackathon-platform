"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, startTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { trackClient } from "@/lib/analytics-browser";
import { saveStartup } from "./actions";
import {
  HIRING_OPTIONS,
  LAST_REGISTRATION_STEP,
  STAGE_OPTIONS,
  STARTUP_PATH,
  SUBMISSION_STATUS_OPTIONS,
  SUBMISSION_STEP,
  TARGET_CUSTOMERS_OPTIONS,
  TECH_TEAM_OPTIONS,
  TOKEN_LAUNCH_OPTIONS,
  TRACK_OPTIONS,
  VERTICAL_OPTIONS,
  WORK_TYPE_OPTIONS,
  YES_NO_OPTIONS,
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

function CheckCards({
  name,
  options,
  defaultValues,
  invalid,
}: {
  name: string;
  options: readonly { value: string; label: string }[];
  defaultValues: readonly string[];
  invalid: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <span key={o.value} className="contents">
          <input
            type="checkbox"
            id={`${name}-${o.value}`}
            name={name}
            value={o.value}
            defaultChecked={defaultValues.includes(o.value)}
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

const LEGEND = "mb-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-emerald";

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

      {step === SUBMISSION_STEP && (
        <>
          <p className="text-sm leading-relaxed text-muted">
            Conte como está sua submissão no Colosseum. Tudo é opcional: preencha o que já tem e volte para atualizar. É
            por aqui que o time da Superteam Brasil acompanha seu projeto e manda feedback por e-mail. A submissão
            oficial continua sendo feita no site do Colosseum.
          </p>

          <fieldset className="space-y-4">
            <legend className={LEGEND}>Status</legend>
            <div {...group("submission_status")}>
              <Label>Como está sua submissão no Colosseum?</Label>
              <RadioCards name="submission_status" options={SUBMISSION_STATUS_OPTIONS} defaultValue={startup?.submission_status} invalid={errorField === "submission_status"} />
              {fieldError("submission_status")}
            </div>
            <div>
              <Label htmlFor="colosseum_url" hint="opcional">Link do projeto no Colosseum</Label>
              <Input id="colosseum_url" name="colosseum_url" type="text" inputMode="url" spellCheck={false} placeholder="https://" defaultValue={startup?.colosseum_url ?? ""} {...invalid("colosseum_url")} />
              {fieldError("colosseum_url")}
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className={LEGEND}>O projeto</legend>
            {!startup?.name && (
              <div>
                <Label htmlFor="name">Nome do projeto</Label>
                <Input id="name" name="name" maxLength={120} defaultValue="" />
              </div>
            )}
            <div>
              <Label htmlFor="description" hint="como está no Colosseum, em inglês">Descrição</Label>
              <Textarea id="description" name="description" rows={6} maxLength={3000} defaultValue={startup?.description ?? ""} />
            </div>
            <div {...group("tracks")}>
              <Label hint="marque as que você vai disputar">Trilhas</Label>
              <CheckCards name="tracks" options={TRACK_OPTIONS} defaultValues={startup?.tracks ?? []} invalid={errorField === "tracks"} />
              {fieldError("tracks")}
            </div>
            <div>
              <Label htmlFor="prior_work" hint="o Colosseum pede">O que já existia antes de 14 de setembro?</Label>
              <Textarea id="prior_work" name="prior_work" rows={3} maxLength={1000} placeholder="Nada, começamos no hackathon. Ou: o contrato X e o site já existiam..." defaultValue={startup?.prior_work ?? ""} />
            </div>
            <div>
              <Label htmlFor="traction" hint="opcional">Um número de tração</Label>
              <Input id="traction" name="traction" maxLength={200} placeholder="120 usuários ativos, US$ 3 mil em volume..." defaultValue={startup?.traction ?? ""} />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className={LEGEND}>Links da submissão</legend>
            <div>
              <Label htmlFor="github_url" hint="precisa estar público">Repositório</Label>
              <Input id="github_url" name="github_url" type="text" inputMode="url" spellCheck={false} placeholder="https://github.com/..." defaultValue={startup?.github_url ?? ""} {...invalid("github_url")} />
              {fieldError("github_url")}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="pitch_video_url" hint="2 a 3 min">Vídeo de pitch</Label>
                <Input id="pitch_video_url" name="pitch_video_url" type="text" inputMode="url" spellCheck={false} placeholder="https://" defaultValue={startup?.pitch_video_url ?? ""} {...invalid("pitch_video_url")} />
                {fieldError("pitch_video_url")}
              </div>
              <div>
                <Label htmlFor="demo_video_url">Vídeo de demo técnica</Label>
                <Input id="demo_video_url" name="demo_video_url" type="text" inputMode="url" spellCheck={false} placeholder="https://" defaultValue={startup?.demo_video_url ?? ""} {...invalid("demo_video_url")} />
                {fieldError("demo_video_url")}
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className={LEGEND}>Time</legend>
            <div className="max-w-40">
              <Label htmlFor="team_size">Pessoas no time</Label>
              <Input id="team_size" name="team_size" type="number" inputMode="numeric" min={1} max={20} defaultValue={startup?.team_size ?? ""} {...invalid("team_size")} />
            </div>
            {fieldError("team_size")}
            <div {...group("team_registered")}>
              <Label>Todo mundo do time já se inscreveu no colosseum.com?</Label>
              <RadioCards
                name="team_registered"
                options={YES_NO_OPTIONS}
                defaultValue={startup?.team_registered == null ? null : startup.team_registered ? "yes" : "no"}
                invalid={errorField === "team_registered"}
              />
              {fieldError("team_registered")}
            </div>
          </fieldset>

          <div>
            <Label htmlFor="submission_notes" hint="opcional">Quer feedback em algo específico?</Label>
            <Textarea id="submission_notes" name="submission_notes" rows={3} maxLength={1000} placeholder="O pitch, a demo, a escolha da trilha..." defaultValue={startup?.submission_notes ?? ""} />
          </div>
        </>
      )}

      {errorField === "server" && (
        <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      )}

      {step === SUBMISSION_STEP ? (
        <div className="flex flex-col gap-3">
          <Button type="submit" name="intent" value="continue" fullWidth disabled={pending}>
            {pending ? "Salvando..." : "Salvar submissão"}
          </Button>
          <Link
            href={`${STARTUP_PATH}?step=done`}
            className="self-center text-sm font-semibold text-muted underline underline-offset-4 hover:text-ink"
          >
            Voltar sem salvar
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Button type="submit" name="intent" value={step === LAST_REGISTRATION_STEP ? "complete" : "continue"} fullWidth disabled={pending}>
            {pending ? "Salvando..." : step === LAST_REGISTRATION_STEP ? "Concluir cadastro" : "Salvar e continuar"}
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
      )}
    </form>
  );
}
