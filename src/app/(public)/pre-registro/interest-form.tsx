"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { trackClient } from "@/lib/analytics-browser";
import { saveInterest } from "./actions";
import { HAS_PROJECT_OPTIONS, STAGE_OPTIONS, type InterestField } from "./interest";
import type { CampaignInterest } from "@/types/db";

type State = { ok: false; error: string; field: InterestField };

export function InterestForm({ interest }: { interest: CampaignInterest | null }) {
  const [hasProject, setHasProject] = useState(interest?.has_project ?? "");
  const [state, formAction, pending] = useActionState(
    async (prev: State, formData: FormData) => {
      // A successful save redirects from the action, so only an error comes back.
      const result = await saveInterest(prev, formData);
      if (!result) return prev;
      trackClient("registration_form_error", { field: result.field, form: "interest" });
      return result;
    },
    { ok: false, error: "", field: "server" } as State,
  );

  useEffect(() => {
    trackClient("interest_form_viewed");
  }, []);

  const lookingDefault =
    interest?.looking_for_team === true ? "yes" : interest?.looking_for_team === false ? "no" : "";

  return (
    <form action={formAction} className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-emerald">
          Situação
        </legend>
        <div>
          <Label htmlFor="has_project">Já tem projeto pra esse hackathon?</Label>
          <Select
            id="has_project"
            name="has_project"
            value={hasProject}
            onChange={(e) => setHasProject(e.target.value)}
          >
            <option value="">Selecione</option>
            {HAS_PROJECT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="looking_for_team">Está procurando time ou membros?</Label>
          <Select id="looking_for_team" name="looking_for_team" defaultValue={lookingDefault}>
            <option value="">Selecione</option>
            <option value="yes">Sim</option>
            <option value="no">Não</option>
          </Select>
        </div>
      </fieldset>

      {hasProject === "yes" && (
        <fieldset className="space-y-4 rounded-2xl border-2 border-green-dark/15 bg-surface p-5">
          <legend className="px-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-emerald">
            Projeto
          </legend>
          <div>
            <Label htmlFor="project_name">Nome do projeto</Label>
            <Input id="project_name" name="project_name" maxLength={120} defaultValue={interest?.project_name ?? ""} />
          </div>
          <div>
            <Label htmlFor="one_liner" hint="uma frase">O que ele faz?</Label>
            <Input id="one_liner" name="one_liner" maxLength={280} defaultValue={interest?.one_liner ?? ""} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="stage">Estágio</Label>
              <Select id="stage" name="stage" defaultValue={interest?.stage ?? ""}>
                <option value="">Selecione</option>
                {STAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="team_size">Tamanho do time</Label>
              <Input
                id="team_size"
                name="team_size"
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                defaultValue={interest?.team_size ?? ""}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="project_url">Site ou repositório</Label>
            <Input
              id="project_url"
              name="project_url"
              type="url"
              inputMode="url"
              placeholder="https://"
              defaultValue={interest?.project_url ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="project_socials" hint="opcional">Redes sociais do projeto</Label>
            <Input
              id="project_socials"
              name="project_socials"
              placeholder="@projeto no X, Instagram, ..."
              defaultValue={interest?.project_socials ?? ""}
            />
          </div>
        </fieldset>
      )}

      <div>
        <Label htmlFor="notes" hint="opcional">Algo mais?</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="O que você quer tirar desse hackathon, o que precisa, o que falta..."
          defaultValue={interest?.notes ?? ""}
        />
      </div>

      {state.error && (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <Button type="submit" name="intent" value="complete" fullWidth disabled={pending}>
          {pending ? "Salvando..." : "Salvar e continuar"}
        </Button>
        <Button type="submit" name="intent" value="later" variant="secondary" fullWidth disabled={pending}>
          Salvar e terminar depois
        </Button>
      </div>
    </form>
  );
}
