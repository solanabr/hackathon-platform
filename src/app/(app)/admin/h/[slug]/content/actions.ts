"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/roles";
import { extractYouTubeId } from "@/lib/content";
import { sanitizeText } from "@/lib/security";
import { CONTENT_KINDS } from "@/lib/content-fields";
import { fromLocalInput } from "@/lib/edition-fields";

export type ContentActionResult = { ok: true } | { ok: false; error: string };

export async function uploadContentFile(input: {
  contentId: string;
  slug: string;
  formData: FormData;
}): Promise<ContentActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const file = input.formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Escolha um arquivo." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 60);
  const path = `${input.contentId}/${Date.now()}-${safe || `arquivo.${ext}`}`;

  const supabase = await createServiceRoleClient();
  const { error: uploadError } = await supabase.storage
    .from("hackathon-files")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) return { ok: false, error: "Não foi possível enviar o arquivo." };

  const { data } = supabase.storage.from("hackathon-files").getPublicUrl(path);

  const { error } = await supabase
    .from("hackathon_contents")
    .update({ external_url: data.publicUrl })
    .eq("id", input.contentId);

  if (error) return { ok: false, error: "Arquivo enviado, mas não foi possível salvar." };

  revalidatePath(`/admin/h/${input.slug}/content`);
  revalidatePath(`/h/${input.slug}/content`);
  return { ok: true };
}

export async function updateContent(input: {
  contentId: string;
  slug: string;
  videoUrl: string;
  published: boolean;
}): Promise<ContentActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const raw = input.videoUrl.trim();
  const youtubeId = raw ? extractYouTubeId(raw) : null;

  if (raw && !youtubeId) {
    return { ok: false, error: "Link do YouTube inválido." };
  }

  const supabaseCheck = await createServiceRoleClient();
  const { data: existing } = await supabaseCheck
    .from("hackathon_contents")
    .select("external_url")
    .eq("id", input.contentId)
    .maybeSingle();

  const hasFile = Boolean((existing as { external_url: string | null } | null)?.external_url);

  if (input.published && !youtubeId && !hasFile) {
    return { ok: false, error: "Adicione um vídeo ou um arquivo antes de publicar." };
  }

  const supabase = await createServiceRoleClient();
  const { error } = await supabase
    .from("hackathon_contents")
    .update({ youtube_id: youtubeId, published: input.published })
    .eq("id", input.contentId);

  if (error) return { ok: false, error: "Não foi possível salvar." };

  revalidatePath(`/admin/h/${input.slug}/content`);
  revalidatePath(`/h/${input.slug}/content`);
  return { ok: true };
}

type DetailsInput = {
  kind: string;
  title: string;
  speaker: string;
  scheduled_at: string;
  duration_minutes: string;
  location: string;
  description: string;
};

type ContentRowValues = {
  kind: string;
  title: string;
  speaker: string | null;
  scheduled_at: string | null;
  duration_minutes: number | null;
  location: string | null;
  description: string | null;
};

type ParsedRow = { ok: false; error: string } | { ok: true; row: ContentRowValues };

function toRow(input: DetailsInput): ParsedRow {
  const title = sanitizeText(input.title, 160);
  if (!title) return { ok: false, error: "O título é obrigatório." };

  if (!CONTENT_KINDS.some((k) => k.value === input.kind)) {
    return { ok: false, error: "Tipo inválido." };
  }

  const duration = input.duration_minutes.trim()
    ? Number.parseInt(input.duration_minutes, 10)
    : null;
  if (duration !== null && (Number.isNaN(duration) || duration < 0)) {
    return { ok: false, error: "Duração inválida." };
  }

  return {
    ok: true,
    row: {
      kind: input.kind,
      title,
      speaker: sanitizeText(input.speaker, 120),
      scheduled_at: fromLocalInput(input.scheduled_at),
      duration_minutes: duration,
      location: sanitizeText(input.location, 120),
      description: sanitizeText(input.description, 2000),
    },
  };
}

export async function createContent(input: {
  hackathonId: string;
  slug: string;
  details: DetailsInput;
}): Promise<ContentActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const parsed = toRow(input.details);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const supabase = await createServiceRoleClient();
  const { data: last } = await supabase
    .from("hackathon_contents")
    .select("position")
    .eq("hackathon_id", input.hackathonId)
    .is("deleted_at", null)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPosition = ((last as { position: number } | null)?.position ?? -1) + 1;

  const { error } = await supabase
    .from("hackathon_contents")
    .insert({ ...parsed.row, hackathon_id: input.hackathonId, position: nextPosition });

  if (error) return { ok: false, error: "Não foi possível criar." };

  revalidatePath(`/admin/h/${input.slug}/content`);
  revalidatePath(`/h/${input.slug}/content`);
  return { ok: true };
}

export async function updateContentDetails(input: {
  contentId: string;
  slug: string;
  details: DetailsInput;
}): Promise<ContentActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const parsed = toRow(input.details);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const supabase = await createServiceRoleClient();
  const { error } = await supabase
    .from("hackathon_contents")
    .update(parsed.row)
    .eq("id", input.contentId);

  if (error) return { ok: false, error: "Não foi possível salvar." };

  revalidatePath(`/admin/h/${input.slug}/content`);
  revalidatePath(`/h/${input.slug}/content`);
  return { ok: true };
}

/**
 * Soft delete: an admin removing an item mid-event should not take it away from
 * participants who are part-way through it, and should be able to undo a misclick.
 * The RLS policy and public_schedule both filter on deleted_at.
 */
export async function deleteContent(input: {
  contentId: string;
  slug: string;
}): Promise<ContentActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const supabase = await createServiceRoleClient();
  const { error } = await supabase
    .from("hackathon_contents")
    .update({ deleted_at: new Date().toISOString(), published: false })
    .eq("id", input.contentId);

  if (error) return { ok: false, error: "Não foi possível remover." };

  revalidatePath(`/admin/h/${input.slug}/content`);
  revalidatePath(`/h/${input.slug}/content`);
  return { ok: true };
}

/** Swaps position with the neighbour, so the list stays a stable ordering. */
export async function moveContent(input: {
  contentId: string;
  hackathonId: string;
  slug: string;
  direction: "up" | "down";
}): Promise<ContentActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const supabase = await createServiceRoleClient();
  const { data } = await supabase
    .from("hackathon_contents")
    .select("id, position")
    .eq("hackathon_id", input.hackathonId)
    .is("deleted_at", null)
    .order("position", { ascending: true });

  const rows = (data as Array<{ id: string; position: number }> | null) ?? [];
  const index = rows.findIndex((r) => r.id === input.contentId);
  if (index === -1) return { ok: false, error: "Conteúdo não encontrado." };

  const target = input.direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= rows.length) return { ok: true };

  await supabase
    .from("hackathon_contents")
    .update({ position: rows[target].position })
    .eq("id", rows[index].id);
  await supabase
    .from("hackathon_contents")
    .update({ position: rows[index].position })
    .eq("id", rows[target].id);

  revalidatePath(`/admin/h/${input.slug}/content`);
  revalidatePath(`/h/${input.slug}/content`);
  return { ok: true };
}

export async function restoreContent(input: {
  contentId: string;
  slug: string;
}): Promise<ContentActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const supabase = await createServiceRoleClient();
  const { error } = await supabase
    .from("hackathon_contents")
    .update({ deleted_at: null })
    .eq("id", input.contentId);

  if (error) return { ok: false, error: "Não foi possível restaurar." };

  revalidatePath(`/admin/h/${input.slug}/content`);
  revalidatePath(`/h/${input.slug}/content`);
  return { ok: true };
}
