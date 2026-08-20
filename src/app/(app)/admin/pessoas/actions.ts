"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/roles";

export async function grantRole(
  email: string,
  role: "admin" | "judge",
  hackathonId: string | null,
): Promise<{ error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: "Sem permissão." };

  if (role === "judge" && !hackathonId) {
    return { error: "Escolha o hackathon para o jurado." };
  }

  const supabase = await createServiceRoleClient();

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (!user) {
    return { error: "Ninguém com esse e-mail entrou na plataforma ainda. Peça para fazer login uma vez." };
  }

  const { error } = await supabase.from("platform_roles").upsert(
    {
      user_id: (user as { id: string }).id,
      role,
      hackathon_id: role === "admin" ? null : hackathonId,
      granted_by: gate.state.userId,
    },
    { onConflict: "user_id,role,hackathon_id" },
  );

  if (error) return { error: "Não foi possível salvar o papel." };

  revalidatePath("/admin/pessoas");
  return {};
}

export async function revokeRole(roleId: string): Promise<{ error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: "Sem permissão." };

  const supabase = await createServiceRoleClient();
  const { error } = await supabase.from("platform_roles").delete().eq("id", roleId);
  if (error) return { error: "Não foi possível remover o papel." };

  revalidatePath("/admin/pessoas");
  return {};
}