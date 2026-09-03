"use server";

import { revalidatePath } from "next/cache";
import { getHackathonBySlug, isRegistrationOpen, requiresLumaConfirmation } from "@/lib/hackathon";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/user-state";
import { logQueryError } from "@/lib/supabase/unwrap";
import { track } from "@/lib/analytics-server";

export async function registerForHackathon(
  slug: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const state = await requireUser();

  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon || !isRegistrationOpen(hackathon)) {
    return { error: "Inscrições encerradas." };
  }

  const needsLuma = requiresLumaConfirmation(hackathon);
  const lumaConfirmed = formData.get("luma_confirmed") === "on";
  const termsAccepted = formData.get("terms_accepted") === "on";

  if (!termsAccepted || (needsLuma && !lumaConfirmed)) {
    return {
      error: needsLuma
        ? "Confirme a inscrição no Luma e aceite as regras para continuar."
        : "Aceite as regras para continuar.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const now = new Date().toISOString();

  // Re-submitting the form must not count as a second registration in the funnel.
  const { data: existing, error: existingError } = await supabase
    .from("hackathon_registrations")
    .select("terms_accepted_at, luma_confirmed_at")
    .eq("hackathon_id", hackathon.id)
    .eq("user_id", state.userId)
    .maybeSingle();
  if (existingError) logQueryError("register.existingRegistration", existingError);
  const alreadyComplete =
    !!existing?.terms_accepted_at && (!needsLuma || !!existing?.luma_confirmed_at);

  const { error } = await supabase.from("hackathon_registrations").upsert(
    {
      hackathon_id: hackathon.id,
      user_id: state.userId,
      luma_confirmed_at: now,
      terms_accepted_at: now,
    },
    { onConflict: "hackathon_id,user_id" },
  );

  if (error) return { error: "Não foi possível concluir a inscrição. Tente novamente." };

  if (!alreadyComplete) track(state.userId, "registration_completed", { edition: slug });
  revalidatePath(`/h/${slug}/dashboard`);
  return {};
}