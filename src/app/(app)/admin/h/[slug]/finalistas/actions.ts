"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireEditionAdminBySlug } from "@/lib/roles";
import { notifyFinalists as notifyFinalistsByEmail } from "@/lib/email";

export type FinalistActionResult = { ok: true } | { ok: false; error: string };

export type NotifyResult =
  | { ok: true; sent: number; failed: number }
  | { ok: false; error: string };

// Every write filters on the gated hackathon as well as the row id, so a
// scoped admin of one edition can never touch another's teams.

async function updateTeam(
  slug: string,
  teamId: string,
  patch: { is_finalist: boolean } | { placement: number },
): Promise<FinalistActionResult> {
  const gate = await requireEditionAdminBySlug(slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const supabase = await createServiceRoleClient();
  const { data, error } = await supabase
    .from("teams")
    .update(patch)
    .eq("id", teamId)
    .eq("hackathon_id", gate.hackathon.id)
    .select("id");

  if (error) return { ok: false, error: "Não foi possível salvar." };
  if (!data || data.length === 0) {
    return { ok: false, error: "Time não encontrado nesta edição." };
  }

  revalidatePath(`/admin/h/${slug}/finalistas`);
  revalidatePath(`/h/${slug}`);
  return { ok: true };
}

export async function setFinalist(input: {
  slug: string;
  teamId: string;
  isFinalist: boolean;
}): Promise<FinalistActionResult> {
  return updateTeam(input.slug, input.teamId, { is_finalist: input.isFinalist });
}

export async function setPlacement(input: {
  slug: string;
  teamId: string;
  placement: number;
}): Promise<FinalistActionResult> {
  if (!Number.isInteger(input.placement) || input.placement < 1) {
    return { ok: false, error: "Colocação inválida." };
  }
  return updateTeam(input.slug, input.teamId, { placement: input.placement });
}

export async function notifyFinalists(input: {
  slug: string;
  hackathonId: string;
}): Promise<NotifyResult> {
  const gate = await requireEditionAdminBySlug(input.slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  // The slug decides the edition; the client-supplied id only has to agree.
  if (gate.hackathon.id !== input.hackathonId) {
    return { ok: false, error: "Edição não confere." };
  }

  const result = await notifyFinalistsByEmail(gate.hackathon.id);
  if (!result.ok) return result;

  revalidatePath(`/admin/h/${input.slug}/finalistas`);
  revalidatePath(`/h/${input.slug}`);
  return result;
}
