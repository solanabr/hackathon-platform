"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getHackathonBySlug } from "@/lib/hackathon";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/supabase/unwrap";
import { requireUser } from "@/lib/user-state";
import { track } from "@/lib/analytics-server";
import { RD_FIELD, sendRdConversion } from "@/lib/rd-station";
import { formatBrt } from "@/lib/dates";
import { COLOSSEUM_SLUG } from "../pre-registro/constants";
import { STARTUP_PATH, STEPS, type StartupStep } from "./constants";
import { validateStartup, type StartupField, type StartupFields, type StartupIntent } from "./startup";

const SAVE_ERROR = "Não foi possível salvar. Tente novamente.";

type StartupError = { ok: false; error: string; field: StartupField };

const STEP_FIELDS: Record<StartupStep, (keyof StartupFields)[]> = {
  1: ["full_name", "whatsapp", "location", "telegram_handle", "linkedin_url", "job_title", "work_type"],
  2: ["name", "one_liner", "vertical", "stage", "website", "pitch_deck_url", "twitter", "logo_url"],
  3: ["hiring", "target_customers", "token_launch", "tech_team", "heard_from", "help_needed"],
};

function parseStep(raw: FormDataEntryValue | null): StartupStep {
  const n = Number(raw);
  return STEPS.some((s) => s.n === n) ? (n as StartupStep) : 1;
}

function parseIntent(raw: FormDataEntryValue | null): StartupIntent {
  return raw === "later" || raw === "complete" ? raw : "continue";
}

export async function saveStartup(
  _prevState: { ok: boolean; error?: string },
  formData: FormData,
): Promise<StartupError> {
  const state = await requireUser();
  const step = parseStep(formData.get("step"));
  // Only step 3 can finish the form; an old tab posting complete from step 1
  // would otherwise mark a startup done without a name.
  const rawIntent = parseIntent(formData.get("intent"));
  const intent: StartupIntent = rawIntent === "complete" && step !== 3 ? "continue" : rawIntent;

  const fields: StartupFields = {};
  for (const name of STEP_FIELDS[step]) {
    const v = formData.get(name);
    fields[name] = typeof v === "string" ? v : null;
  }
  const validation = validateStartup(step, fields, intent);
  if (!validation.ok) return validation;

  // Own-row writes behind RLS, like saveInterest.
  const supabase = await createServerSupabaseClient();

  if (validation.user) {
    const { error } = await supabase.from("users").update(validation.user).eq("id", state.userId);
    if (error) {
      logQueryError("startup.updateProfile", error);
      return { ok: false, error: SAVE_ERROR, field: "server" };
    }
  }

  const { data: prior, error: priorError } = await supabase
    .from("startups")
    .select("name, vertical, stage, completed_at")
    .eq("user_id", state.userId)
    .maybeSingle();
  if (priorError) logQueryError("startup.prior", priorError);

  // Step 3 has no name field, so the cross-step requirements for finishing
  // are checked against what is already stored.
  if (intent === "complete") {
    const profile = state.profile;
    if (!profile?.full_name || !profile.whatsapp || !profile.location) {
      return { ok: false, error: "Complete seus dados de contato no passo 1 antes de concluir.", field: "server" };
    }
    if (!prior?.name) {
      return { ok: false, error: "Informe o nome da startup no passo 2 antes de concluir.", field: "server" };
    }
  }

  const completedAt = new Date().toISOString();
  // Editing a finished form must not re-date it nor re-fire the RD event.
  const firstCompletion = intent === "complete" && !prior?.completed_at;

  if (validation.startup) {
    // The campaign that brought the founder is recorded once, on the first row.
    const hackathon = prior ? null : await getHackathonBySlug(COLOSSEUM_SLUG).catch(() => null);
    const { error } = await supabase.from("startups").upsert(
      {
        user_id: state.userId,
        ...(!prior && hackathon && { hackathon_id: hackathon.id }),
        ...validation.startup,
        ...(firstCompletion && { completed_at: completedAt }),
      },
      { onConflict: "user_id" },
    );
    if (error) {
      logQueryError("startup.upsert", error);
      return { ok: false, error: SAVE_ERROR, field: "server" };
    }
  }

  if (firstCompletion) {
    track(state.userId, "startup_registered", {
      has_vertical: Boolean(prior?.vertical),
      stage: prior?.stage ?? null,
    });
    sendRdConversion({
      identifier: "startup",
      email: state.email,
      name: state.profile?.full_name,
      whatsapp: state.profile?.whatsapp,
      fields: {
        [RD_FIELD.startup_completed_at]: formatBrt(completedAt),
        [RD_FIELD.startup_name]: prior?.name ?? null,
      },
    });
  }

  revalidatePath(STARTUP_PATH);
  if (intent === "later") redirect(`${STARTUP_PATH}?step=1&saved=1`);
  if (intent === "complete") redirect(`${STARTUP_PATH}?step=done`);
  redirect(`${STARTUP_PATH}?step=${step + 1}`);
}
