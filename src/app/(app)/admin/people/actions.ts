"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/supabase/unwrap";
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

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (userError) logQueryError("people.grantRole.user", userError);

  if (!user) {
    return { error: "Ninguém com esse e-mail entrou na plataforma ainda. Peça para fazer login uma vez." };
  }

  // A NULL hackathon_id makes an admin global; with an id the role is scoped
  // to that edition (organizer). Judges are always scoped. The two key shapes
  // mean an upsert cannot target both, so check-then-insert.
  const scope = role === "judge" ? hackathonId : hackathonId || null;
  let existingQuery = supabase
    .from("platform_roles")
    .select("id")
    .eq("user_id", (user as { id: string }).id)
    .eq("role", role);
  existingQuery =
    scope === null ? existingQuery.is("hackathon_id", null) : existingQuery.eq("hackathon_id", scope);

  const { data: existing, error: existingError } = await existingQuery.maybeSingle();
  if (existingError) {
    logQueryError("people.grantRole.existing", existingError);
    return { error: "Não foi possível verificar os papéis. Tente novamente." };
  }
  if (existing) {
    return { error: "Essa pessoa já tem esse papel." };
  }

  const { error } = await supabase.from("platform_roles").insert({
    user_id: (user as { id: string }).id,
    role,
    hackathon_id: scope,
    granted_by: gate.state.userId,
  });

  if (error) return { error: "Não foi possível salvar o papel." };

  revalidatePath("/admin/people");
  return {};
}

export async function revokeRole(roleId: string): Promise<{ error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: "Sem permissão." };

  const supabase = await createServiceRoleClient();
  const { error } = await supabase.from("platform_roles").delete().eq("id", roleId);
  if (error) return { error: "Não foi possível remover o papel." };

  revalidatePath("/admin/people");
  return {};
}