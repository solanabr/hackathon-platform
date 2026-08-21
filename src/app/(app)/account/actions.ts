"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/user-state";
import { sanitizeUrl, sanitizeText, sanitizeRedirect } from "@/lib/security";

export async function updateProfile(
  _prevState: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const state = await requireUser();

  const fullName = sanitizeText(String(formData.get("full_name") ?? ""));
  if (!fullName) return { error: "Informe seu nome completo." };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("users")
    .update({
      full_name: fullName,
      github_url: sanitizeUrl(String(formData.get("github_url") ?? "")),
      twitter_url: sanitizeUrl(String(formData.get("twitter_url") ?? "")),
      linkedin_url: sanitizeUrl(String(formData.get("linkedin_url") ?? "")),
      telegram_handle: sanitizeText(String(formData.get("telegram_handle") ?? "")),
    })
    .eq("id", state.userId);

  if (error) return { error: "Não foi possível salvar. Tente novamente." };

  revalidatePath("/account");
  const next = sanitizeRedirect(String(formData.get("next") ?? ""));
  if (next) redirect(next);
  return {};
}