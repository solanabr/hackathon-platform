"use server";

import { revalidatePath } from "next/cache";
import { getHackathonBySlug } from "@/lib/hackathon";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/supabase/unwrap";
import { requireUser } from "@/lib/user-state";
import { sanitizeText } from "@/lib/security";
import { track } from "@/lib/analytics-server";

const COLOSSEUM_SLUG = "colosseum-2026";

export async function preRegister(
  _prevState: { ok: boolean; error?: string },
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const state = await requireUser();

  const fullName = sanitizeText(String(formData.get("full_name") ?? ""));
  const whatsapp = sanitizeText(String(formData.get("whatsapp") ?? ""));
  const termsAccepted = formData.get("terms_accepted") === "on";

  if (!fullName) return { ok: false, error: "Informe seu nome completo." };
  if (!whatsapp) return { ok: false, error: "Informe seu WhatsApp." };
  if (!termsAccepted) {
    return { ok: false, error: "Você precisa aceitar os Termos de Uso e a Política de Privacidade." };
  }

  const hackathon = await getHackathonBySlug(COLOSSEUM_SLUG);
  if (!hackathon) return { ok: false, error: "Não foi possível concluir o pré-cadastro. Tente novamente." };

  const supabase = await createServiceRoleClient();

  const { error: profileError } = await supabase
    .from("users")
    .update({ full_name: fullName, whatsapp })
    .eq("id", state.userId);
  if (profileError) {
    logQueryError("preRegistro.updateProfile", profileError);
    return { ok: false, error: "Não foi possível concluir o pré-cadastro. Tente novamente." };
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
    return { ok: false, error: "Não foi possível concluir o pré-cadastro. Tente novamente." };
  }

  track(state.userId, "registration_completed", { edition: COLOSSEUM_SLUG });
  revalidatePath("/pre-registro");
  return { ok: true };
}
