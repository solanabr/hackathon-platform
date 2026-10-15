"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/supabase/unwrap";
import { requireUser } from "@/lib/user-state";
import { track } from "@/lib/analytics-server";
import { sendRdConversion } from "@/lib/rd-station";
import { HELIUS_PERK_PATH, PERK } from "./constants";
import { validatePerkApplication, type PerkField, type PerkFields } from "./application";

const SAVE_ERROR = "Não foi possível enviar. Tente novamente.";
const FIELDS = ["full_name", "whatsapp", "project_name", "project_summary", "usage_plan"] as const;

type PerkError = { ok: false; error: string; field: PerkField };

export async function applyForHeliusPerk(
  _prevState: { ok: boolean; error?: string },
  formData: FormData,
): Promise<PerkError> {
  const state = await requireUser();

  const fields: PerkFields = {};
  for (const name of FIELDS) {
    const v = formData.get(name);
    fields[name] = typeof v === "string" ? v : null;
  }
  const validation = validatePerkApplication(fields);
  if (!validation.ok) return validation;

  // Own-row writes behind RLS, like saveStartup.
  const supabase = await createServerSupabaseClient();

  const { error: userError } = await supabase.from("users").update(validation.user).eq("id", state.userId);
  if (userError) {
    logQueryError("perk.updateProfile", userError);
    return { ok: false, error: SAVE_ERROR, field: "server" };
  }

  const { data: prior, error: priorError } = await supabase
    .from("perk_applications")
    .select("id")
    .eq("perk", PERK)
    .eq("user_id", state.userId)
    .maybeSingle();
  if (priorError) logQueryError("perk.prior", priorError);

  const { error } = await supabase
    .from("perk_applications")
    .upsert({ perk: PERK, user_id: state.userId, ...validation.application }, { onConflict: "perk,user_id" });
  if (error) {
    logQueryError("perk.upsert", error);
    return { ok: false, error: SAVE_ERROR, field: "server" };
  }

  // An edit to a sent application must not count as a new one.
  if (!prior) {
    track(state.userId, "perk_applied", { perk: PERK });
    sendRdConversion({
      identifier: "perk_helius",
      email: state.email,
      name: validation.user.full_name,
      whatsapp: validation.user.whatsapp,
      fields: {},
    });
  }

  revalidatePath(HELIUS_PERK_PATH);
  redirect(`${HELIUS_PERK_PATH}?enviado=1`);
}
