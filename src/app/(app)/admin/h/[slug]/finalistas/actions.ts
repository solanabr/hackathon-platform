"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/roles";
import { notifyFinalists as notifyFinalistsByEmail } from "@/lib/email";

export type FinalistActionResult = { ok: true } | { ok: false; error: string };

export type NotifyResult =
  | { ok: true; sent: number; failed: number }
  | { ok: false; error: string };

export async function setFinalist(input: {
  slug: string;
  teamId: string;
  isFinalist: boolean;
}): Promise<FinalistActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const supabase = await createServiceRoleClient();
  const { error } = await supabase
    .from("teams")
    .update({ is_finalist: input.isFinalist })
    .eq("id", input.teamId);

  if (error) return { ok: false, error: "Não foi possível salvar." };

  revalidatePath(`/admin/h/${input.slug}/finalistas`);
  revalidatePath(`/h/${input.slug}`);
  return { ok: true };
}

export async function notifyFinalists(input: {
  slug: string;
  hackathonId: string;
}): Promise<NotifyResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const result = await notifyFinalistsByEmail(input.hackathonId);
  if (!result.ok) return result;

  revalidatePath(`/admin/h/${input.slug}/finalistas`);
  revalidatePath(`/h/${input.slug}`);
  return result;
}
