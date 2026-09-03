"use server";

import { revalidatePath } from "next/cache";
import { getHackathonBySlug } from "@/lib/hackathon";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/supabase/unwrap";
import { requireUser } from "@/lib/user-state";
import { sanitizeText } from "@/lib/security";
import { track } from "@/lib/analytics-server";
import { COLOSSEUM_SLUG, isRoleOption } from "./constants";


export type RegistrationField = "full_name" | "whatsapp" | "role" | "terms" | "server";

export async function preRegister(
  _prevState: { ok: boolean; error?: string },
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string; field: RegistrationField }> {
  const state = await requireUser();

  const fullName = sanitizeText(String(formData.get("full_name") ?? ""));
  const whatsapp = sanitizeText(String(formData.get("whatsapp") ?? ""));
  const role = String(formData.get("role") ?? "");
  const termsAccepted = formData.get("terms_accepted") === "on";

  if (!fullName) return { ok: false, error: "Informe seu nome completo.", field: "full_name" };
  if (!whatsapp) return { ok: false, error: "Informe seu WhatsApp.", field: "whatsapp" };
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
    .update({ full_name: fullName, whatsapp, ...(role !== "Outro" && { headline: role }) })
    .eq("id", state.userId);
  if (profileError) {
    logQueryError("preRegistro.updateProfile", profileError);
    return { ok: false, error: "Não foi possível concluir o cadastro. Tente novamente.", field: "server" };
  }

  const { error: regError } = await supabase.from("hackathon_registrations").upsert(
    {
      hackathon_id: hackathon.id,
      user_id: state.userId,
      terms_accepted_at: new Date().toISOString(),
    },
    { onConflict: "hackathon_id,user_id" },
  );
  if (regError) {
    logQueryError("preRegistro.upsertRegistration", regError);
    return { ok: false, error: "Não foi possível concluir o cadastro. Tente novamente.", field: "server" };
  }

  track(state.userId, "registration_completed", { edition: COLOSSEUM_SLUG, role });
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
    .select("user_id");
  if (error) {
    logQueryError("preRegistro.confirmColosseum", error);
    return;
  }
  // No registration row, no attestation: keeps the funnel event honest even
  // though the action endpoint is reachable by any signed-in user.
  if (!data?.length) return;

  track(state.userId, "colosseum_registration_confirmed", { edition: COLOSSEUM_SLUG });
  revalidatePath("/pre-registro");
}
