"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getHackathonBySlug } from "@/lib/hackathon";
import { requireAdmin } from "@/lib/roles";
import { notifyFinalists as notifyFinalistsByEmail } from "@/lib/email";

export type FinalistActionResult = { ok: true } | { ok: false; error: string };

export type NotifyResult =
  | { ok: true; sent: number; failed: number }
  | { ok: false; error: string };

/**
 * Confirms the team belongs to the edition the slug names before letting an
 * admin action touch it, so a stray teamId can never mutate another edition.
 */
async function requireTeamInEdition(
  slug: string,
  teamId: string,
): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createServiceRoleClient>> }
  | { ok: false; error: string }
> {
  const supabase = await createServiceRoleClient();
  const { data: team } = await supabase
    .from("teams")
    .select("hackathon_id")
    .eq("id", teamId)
    .maybeSingle();

  if (!team) return { ok: false, error: "Time não encontrado." };

  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon) return { ok: false, error: "Edição não encontrada." };
  if (team.hackathon_id !== hackathon.id) {
    return { ok: false, error: "Time fora desta edição." };
  }

  return { ok: true, supabase };
}

export async function setFinalist(input: {
  slug: string;
  teamId: string;
  isFinalist: boolean;
}): Promise<FinalistActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const edition = await requireTeamInEdition(input.slug, input.teamId);
  if (!edition.ok) return edition;

  const { error } = await edition.supabase
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
