"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/user-state";

export async function registerForHackathon(
  hackathonId: string,
  slug: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const state = await requireUser();

  const lumaConfirmed = formData.get("luma_confirmed") === "on";
  const termsAccepted = formData.get("terms_accepted") === "on";

  if (!lumaConfirmed || !termsAccepted) {
    return { error: "Confirme a inscrição no Luma e aceite as regras para continuar." };
  }

  const supabase = await createServerSupabaseClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from("hackathon_registrations").upsert(
    {
      hackathon_id: hackathonId,
      user_id: state.userId,
      luma_confirmed_at: now,
      terms_accepted_at: now,
    },
    { onConflict: "hackathon_id,user_id" },
  );

  if (error) return { error: "Não foi possível concluir a inscrição. Tente novamente." };

  revalidatePath(`/h/${slug}/painel`);
  return {};
}