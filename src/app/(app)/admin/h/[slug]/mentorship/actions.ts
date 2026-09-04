"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { HACKATHONS_TAG, hackathonTag } from "@/lib/cache-tags";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/supabase/unwrap";
import { requireEditionAdminBySlug } from "@/lib/roles";
import { sanitizeText, sanitizeUrl } from "@/lib/security";
import type { MentorTrack } from "@/types/db";

export type MentorActionResult = { ok: true } | { ok: false; error: string };

export type MentorInput = { name: string; specialty: string; bookingUrl: string };

type ParsedMentor =
  | { ok: false; error: string }
  | { ok: true; row: { name: string; specialty: string | null; booking_url: string } };

function toRow(input: MentorInput): ParsedMentor {
  const name = sanitizeText(input.name, 120);
  if (!name) return { ok: false, error: "O nome do mentor é obrigatório." };

  const url = sanitizeUrl(input.bookingUrl);
  if (!url) return { ok: false, error: "Link inválido. Use um endereço https://... completo." };
  // The column rejects anything but https, so catch it here with a message
  // instead of letting the insert fail with a check violation.
  if (!url.startsWith("https://")) {
    return { ok: false, error: "O link de agendamento precisa ser https://." };
  }

  return { ok: true, row: { name, specialty: sanitizeText(input.specialty, 160), booking_url: url } };
}

/**
 * Every write filters on the gated hackathon as well as the row id, so a
 * scoped admin of one edition can never touch another's mentors.
 */
function revalidate(slug: string) {
  revalidatePath(`/admin/h/${slug}/mentorship`);
}

export async function createMentors(input: {
  slug: string;
  track: MentorTrack;
  mentors: MentorInput[];
}): Promise<MentorActionResult> {
  const gate = await requireEditionAdminBySlug(input.slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  if (input.mentors.length === 0) return { ok: false, error: "Nenhum mentor para adicionar." };

  const rows = [];
  for (const [i, mentor] of input.mentors.entries()) {
    const parsed = toRow(mentor);
    if (!parsed.ok) {
      const where = input.mentors.length > 1 ? ` (linha ${i + 1})` : "";
      return { ok: false, error: `${parsed.error}${where}` };
    }
    rows.push({ ...parsed.row, hackathon_id: gate.hackathon.id, track: input.track });
  }

  const supabase = await createServiceRoleClient();
  const { error } = await supabase.from("hackathon_mentors").insert(rows);
  if (error) {
    logQueryError("admin.mentorship.create", error);
    return { ok: false, error: "Não foi possível adicionar. Tente novamente." };
  }

  revalidate(input.slug);
  return { ok: true };
}

export async function updateMentor(input: {
  slug: string;
  mentorId: string;
  mentor: MentorInput;
}): Promise<MentorActionResult> {
  const gate = await requireEditionAdminBySlug(input.slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const parsed = toRow(input.mentor);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const supabase = await createServiceRoleClient();
  const { data, error } = await supabase
    .from("hackathon_mentors")
    .update(parsed.row)
    .eq("id", input.mentorId)
    .eq("hackathon_id", gate.hackathon.id)
    .select("id");

  if (error) {
    logQueryError("admin.mentorship.update", error);
    return { ok: false, error: "Não foi possível salvar." };
  }
  if (!data || data.length === 0) return { ok: false, error: "Mentor não encontrado nesta edição." };

  revalidate(input.slug);
  return { ok: true };
}

export async function setMentorAvailable(input: {
  slug: string;
  mentorId: string;
  available: boolean;
}): Promise<MentorActionResult> {
  const gate = await requireEditionAdminBySlug(input.slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const supabase = await createServiceRoleClient();
  const { data, error } = await supabase
    .from("hackathon_mentors")
    .update({ available: input.available })
    .eq("id", input.mentorId)
    .eq("hackathon_id", gate.hackathon.id)
    .select("id");

  if (error) {
    logQueryError("admin.mentorship.available", error);
    return { ok: false, error: "Não foi possível salvar." };
  }
  if (!data || data.length === 0) return { ok: false, error: "Mentor não encontrado nesta edição." };

  revalidate(input.slug);
  return { ok: true };
}

/**
 * Soft delete: a mentor someone already chose still has to resolve on that
 * team's page, and the booking row holds a restricting reference anyway.
 */
export async function deleteMentor(input: {
  slug: string;
  mentorId: string;
}): Promise<MentorActionResult> {
  const gate = await requireEditionAdminBySlug(input.slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const supabase = await createServiceRoleClient();
  const { data, error } = await supabase
    .from("hackathon_mentors")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", input.mentorId)
    .eq("hackathon_id", gate.hackathon.id)
    .is("deleted_at", null)
    .select("id");

  if (error) {
    logQueryError("admin.mentorship.delete", error);
    return { ok: false, error: "Não foi possível remover." };
  }
  if (!data || data.length === 0) return { ok: false, error: "Mentor não encontrado nesta edição." };

  revalidate(input.slug);
  return { ok: true };
}

export async function releaseBooking(input: {
  slug: string;
  bookingId: string;
}): Promise<MentorActionResult> {
  const gate = await requireEditionAdminBySlug(input.slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const supabase = await createServiceRoleClient();
  const { data, error } = await supabase
    .from("mentorship_bookings")
    .update({ released_at: new Date().toISOString(), released_by: gate.state.userId })
    .eq("id", input.bookingId)
    .eq("hackathon_id", gate.hackathon.id)
    .is("released_at", null)
    .select("id");

  if (error) {
    logQueryError("admin.mentorship.release", error);
    return { ok: false, error: "Não foi possível liberar." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Agendamento não encontrado nesta edição." };
  }

  revalidate(input.slug);
  return { ok: true };
}

export async function setMentorshipEnabled(input: {
  slug: string;
  enabled: boolean;
}): Promise<MentorActionResult> {
  const gate = await requireEditionAdminBySlug(input.slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const supabase = await createServiceRoleClient();
  const { error } = await supabase
    .from("hackathons")
    .update({ mentorship_enabled: input.enabled })
    .eq("id", gate.hackathon.id);

  if (error) {
    logQueryError("admin.mentorship.enabled", error);
    return { ok: false, error: "Não foi possível salvar." };
  }

  revalidateTag(hackathonTag(input.slug), "max");
  revalidateTag(HACKATHONS_TAG, "max");
  revalidate(input.slug);
  revalidatePath(`/admin/h/${input.slug}`);
  revalidatePath(`/h/${input.slug}/dashboard`);
  return { ok: true };
}
