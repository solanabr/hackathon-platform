"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getHackathonBySlug } from "@/lib/hackathon";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/supabase/unwrap";
import { requireUser } from "@/lib/user-state";
import { sanitizeText } from "@/lib/security";
import { normalizeWhatsapp } from "@/lib/phone";
import { attributionFromFormData } from "@/lib/attribution";
import { track } from "@/lib/analytics-server";
import { COLOSSEUM_SLUG, isRoleOption } from "./constants";
import { validateInterest, type InterestField, type InterestIntent } from "./interest";

export type RegistrationField = "full_name" | "whatsapp" | "location" | "role" | "terms" | "server";

export async function preRegister(
  _prevState: { ok: boolean; error?: string },
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string; field: RegistrationField }> {
  const state = await requireUser();

  const fullName = sanitizeText(String(formData.get("full_name") ?? ""));
  const whatsapp = sanitizeText(String(formData.get("whatsapp") ?? ""));
  const location = sanitizeText(String(formData.get("location") ?? ""), 120);
  const role = String(formData.get("role") ?? "");
  const termsAccepted = formData.get("terms_accepted") === "on";

  if (!fullName) return { ok: false, error: "Informe seu nome completo.", field: "full_name" };
  if (!whatsapp) return { ok: false, error: "Informe seu WhatsApp.", field: "whatsapp" };
  if (!location) return { ok: false, error: "Informe sua cidade e estado.", field: "location" };
  if (!isRoleOption(role)) return { ok: false, error: "Escolha como você se descreve.", field: "role" };
  // Loose shape check only: DDI/DDD formats vary, but the field is the
  // campaign's outreach channel, so pure text must not pass as a number.
  const digits = whatsapp.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 14) {
    return { ok: false, error: "Informe um WhatsApp válido, com DDD.", field: "whatsapp" };
  }
  if (!termsAccepted) {
    return {
      ok: false,
      error: "Você precisa aceitar os Termos de Uso e a Política de Privacidade.",
      field: "terms",
    };
  }

  const hackathon = await getHackathonBySlug(COLOSSEUM_SLUG);
  if (!hackathon)
    return { ok: false, error: "Não foi possível concluir o cadastro. Tente novamente.", field: "server" };

  // Own-row writes: RLS covers both tables, so the user-scoped client keeps
  // it as the backstop (same pattern as updateProfile and registerForHackathon).
  const supabase = await createServerSupabaseClient();

  // The role doubles as the profile's Título; "Outro" says nothing useful
  // there, so it leaves whatever the person already wrote.
  const { error: profileError } = await supabase
    .from("users")
    .update({
      full_name: fullName,
      whatsapp: normalizeWhatsapp(whatsapp),
      location,
      ...(role !== "Outro" && { headline: role }),
    })
    .eq("id", state.userId);
  if (profileError) {
    logQueryError("preRegistro.updateProfile", profileError);
    return { ok: false, error: "Não foi possível concluir o cadastro. Tente novamente.", field: "server" };
  }

  // Re-saving the form must not count as a second registration in the funnel.
  const { data: existing, error: existingError } = await supabase
    .from("hackathon_registrations")
    .select("terms_accepted_at")
    .eq("hackathon_id", hackathon.id)
    .eq("user_id", state.userId)
    .maybeSingle();
  if (existingError) logQueryError("preRegistro.existingRegistration", existingError);
  const alreadyComplete = !!existing?.terms_accepted_at;

  // First touch only: a re-save never overwrites the attribution the row was
  // created with.
  const attribution = attributionFromFormData(formData);
  const { error: regError } = await supabase.from("hackathon_registrations").upsert(
    {
      hackathon_id: hackathon.id,
      user_id: state.userId,
      terms_accepted_at: new Date().toISOString(),
      ...(!existing && attribution),
    },
    { onConflict: "hackathon_id,user_id" },
  );
  if (regError) {
    logQueryError("preRegistro.upsertRegistration", regError);
    return { ok: false, error: "Não foi possível concluir o cadastro. Tente novamente.", field: "server" };
  }

  if (!alreadyComplete) {
    track(state.userId, "registration_completed", {
      edition: COLOSSEUM_SLUG,
      role,
      utm_source: attribution.utm_source,
      utm_campaign: attribution.utm_campaign,
    });
  }
  revalidatePath("/pre-registro");
  return { ok: true };
}

// Self-attestation that the user registered on the Colosseum platform.
// This edition has no Luma gate, so luma_confirmed_at is free to carry the
// external-registration confirmation (same semantics: "confirmed on the
// external platform", same RLS own-row update path).
export async function confirmColosseumRegistration(): Promise<void> {
  const state = await requireUser();

  const hackathon = await getHackathonBySlug(COLOSSEUM_SLUG);
  if (!hackathon) return;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("hackathon_registrations")
    .update({ luma_confirmed_at: new Date().toISOString() })
    .eq("hackathon_id", hackathon.id)
    .eq("user_id", state.userId)
    .is("luma_confirmed_at", null)
    .select("user_id");
  if (error) {
    logQueryError("preRegistro.confirmColosseum", error);
    return;
  }
  // No registration row (or already confirmed), no attestation: keeps the
  // funnel event honest and a double click from firing it twice.
  if (!data?.length) return;

  track(state.userId, "colosseum_registration_confirmed", { edition: COLOSSEUM_SLUG });
  revalidatePath("/pre-registro");
}

const INTEREST_ERROR = "Não foi possível salvar. Tente novamente.";

export async function saveInterest(
  _prevState: { ok: boolean; error?: string },
  formData: FormData,
): Promise<{ ok: false; error: string; field: InterestField }> {
  const state = await requireUser();

  const intentRaw = formData.get("intent");
  const intent: InterestIntent = intentRaw === "later" ? "later" : "complete";
  const field = (name: string) => {
    const v = formData.get(name);
    return typeof v === "string" ? v : null;
  };
  const validation = validateInterest(
    {
      has_project: field("has_project"),
      looking_for_team: field("looking_for_team"),
      project_name: field("project_name"),
      one_liner: field("one_liner"),
      stage: field("stage"),
      team_size: field("team_size"),
      project_url: field("project_url"),
      project_socials: field("project_socials"),
      notes: field("notes"),
    },
    intent,
  );
  if (!validation.ok) return validation;

  const hackathon = await getHackathonBySlug(COLOSSEUM_SLUG);
  if (!hackathon) return { ok: false, error: INTEREST_ERROR, field: "server" };

  // Own-row write behind RLS, like preRegister. A "later" save keeps an
  // earlier completed_at: the row was complete once, and the person only
  // came back to edit.
  const supabase = await createServerSupabaseClient();
  const completed = intent === "complete";
  const { error } = await supabase.from("campaign_interest").upsert(
    {
      hackathon_id: hackathon.id,
      user_id: state.userId,
      ...validation.values,
      ...(completed && { completed_at: new Date().toISOString() }),
    },
    { onConflict: "hackathon_id,user_id" },
  );
  if (error) {
    logQueryError("preRegistro.saveInterest", error);
    return { ok: false, error: INTEREST_ERROR, field: "server" };
  }

  track(state.userId, "interest_form_saved", {
    edition: COLOSSEUM_SLUG,
    completed,
    has_project: validation.values.has_project,
    looking_for_team: validation.values.looking_for_team,
  });
  revalidatePath("/pre-registro");
  redirect("/pre-registro?step=jornada");
}
