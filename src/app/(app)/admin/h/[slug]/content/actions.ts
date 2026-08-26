"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/supabase/unwrap";
import { requireEditionAdminBySlug } from "@/lib/roles";
import { extractYouTubeId } from "@/lib/content";
import { sanitizeText, sanitizeUrl } from "@/lib/security";

export type ContentActionResult = { ok: true } | { ok: false; error: string };

export type ContentAttachmentInput = { type: "video" | "link"; url: string };

function attachmentPatch(
  attachment: ContentAttachmentInput,
): { ok: true; patch: { youtube_id: string | null; external_url: string | null } } | { ok: false; error: string } {
  const raw = attachment.url.trim();
  if (!raw) return { ok: true, patch: { youtube_id: null, external_url: null } };

  if (attachment.type === "video") {
    const youtubeId = extractYouTubeId(raw);
    if (!youtubeId) return { ok: false, error: "Link do YouTube inválido." };
    return { ok: true, patch: { youtube_id: youtubeId, external_url: null } };
  }

  const url = sanitizeUrl(raw);
  if (!url) return { ok: false, error: "Link inválido. Use um endereço https://... completo." };
  return { ok: true, patch: { youtube_id: null, external_url: url } };
}

export async function uploadContentFile(input: {
  contentId: string;
  slug: string;
  formData: FormData;
}): Promise<ContentActionResult> {
  const gate = await requireEditionAdminBySlug(input.slug);
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

  // One attachment per item: a file replaces whatever video was there.
  const { error } = await supabase
    .from("hackathon_contents")
    .update({ external_url: data.publicUrl, youtube_id: null })
    .eq("id", input.contentId)
    .eq("hackathon_id", gate.hackathon.id);

  if (error) return { ok: false, error: "Arquivo enviado, mas não foi possível salvar." };

  revalidatePath(`/admin/h/${input.slug}/content`);
  revalidatePath(`/h/${input.slug}/content`);
  return { ok: true };
}

export async function updateContentAttachment(input: {
  contentId: string;
  slug: string;
  attachment: ContentAttachmentInput;
}): Promise<ContentActionResult> {
  const gate = await requireEditionAdminBySlug(input.slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const parsed = attachmentPatch(input.attachment);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  // Removing the only attachment unpublishes: the participant card would
  // otherwise open onto nothing.
  const cleared = !parsed.patch.youtube_id && !parsed.patch.external_url;

  const supabase = await createServiceRoleClient();
  const { error } = await supabase
    .from("hackathon_contents")
    .update(cleared ? { ...parsed.patch, published: false } : parsed.patch)
    .eq("id", input.contentId)
    .eq("hackathon_id", gate.hackathon.id);

  if (error) return { ok: false, error: "Não foi possível salvar." };

  revalidatePath(`/admin/h/${input.slug}/content`);
  revalidatePath(`/h/${input.slug}/content`);
  return { ok: true };
}

export async function setContentPublished(input: {
  contentId: string;
  slug: string;
  published: boolean;
}): Promise<ContentActionResult> {
  const gate = await requireEditionAdminBySlug(input.slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const supabase = await createServiceRoleClient();

  if (input.published) {
    const { data: existing } = await supabase
      .from("hackathon_contents")
      .select("youtube_id, external_url")
      .eq("id", input.contentId)
      .eq("hackathon_id", gate.hackathon.id)
      .maybeSingle();
    const row = existing as { youtube_id: string | null; external_url: string | null } | null;
    if (!row?.youtube_id && !row?.external_url) {
      return { ok: false, error: "Adicione um vídeo, arquivo ou link antes de publicar." };
    }
  }

  const { error } = await supabase
    .from("hackathon_contents")
    .update({ published: input.published })
    .eq("id", input.contentId)
    .eq("hackathon_id", gate.hackathon.id);

  if (error) return { ok: false, error: "Não foi possível salvar." };

  revalidatePath(`/admin/h/${input.slug}/content`);
  revalidatePath(`/h/${input.slug}/content`);
  return { ok: true };
}

type DetailsInput = {
  title: string;
  description: string;
};

type ContentRowValues = {
  title: string;
  description: string | null;
};

type ParsedRow = { ok: false; error: string } | { ok: true; row: ContentRowValues };

function toRow(input: DetailsInput): ParsedRow {
  const title = sanitizeText(input.title, 160);
  if (!title) return { ok: false, error: "O título é obrigatório." };

  return {
    ok: true,
    row: {
      title,
      description: sanitizeText(input.description, 2000),
    },
  };
}

export async function createContent(input: {
  hackathonId: string;
  slug: string;
  details: DetailsInput;
  attachment?: ContentAttachmentInput;
}): Promise<{ ok: true; contentId: string } | { ok: false; error: string }> {
  const gate = await requireEditionAdminBySlug(input.slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const parsed = toRow(input.details);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const attachment = input.attachment
    ? attachmentPatch(input.attachment)
    : ({ ok: true, patch: {} } as const);
  if (!attachment.ok) return { ok: false, error: attachment.error };

  const supabase = await createServiceRoleClient();
  // A dropped error here would yield position 0 colliding with an existing
  // row — and a tie can never be reordered by a plain swap.
  const { data: last, error: lastError } = await supabase
    .from("hackathon_contents")
    .select("position")
    .eq("hackathon_id", gate.hackathon.id)
    .is("deleted_at", null)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) {
    logQueryError("content.create.lastPosition", lastError);
    return { ok: false, error: "Não foi possível criar. Tente novamente." };
  }

  const nextPosition = ((last as { position: number } | null)?.position ?? -1) + 1;

  const { data: created, error } = await supabase
    .from("hackathon_contents")
    .insert({
      ...parsed.row,
      ...attachment.patch,
      kind: "material",
      hackathon_id: gate.hackathon.id,
      position: nextPosition,
    })
    .select("id")
    .single();

  if (error || !created) return { ok: false, error: "Não foi possível criar." };

  revalidatePath(`/admin/h/${input.slug}/content`);
  revalidatePath(`/h/${input.slug}/content`);
  return { ok: true, contentId: (created as { id: string }).id };
}

export async function updateContentDetails(input: {
  contentId: string;
  slug: string;
  details: DetailsInput;
}): Promise<ContentActionResult> {
  const gate = await requireEditionAdminBySlug(input.slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const parsed = toRow(input.details);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const supabase = await createServiceRoleClient();
  const { error } = await supabase
    .from("hackathon_contents")
    .update(parsed.row)
    .eq("id", input.contentId)
    .eq("hackathon_id", gate.hackathon.id);

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
  const gate = await requireEditionAdminBySlug(input.slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const supabase = await createServiceRoleClient();
  const { error } = await supabase
    .from("hackathon_contents")
    .update({ deleted_at: new Date().toISOString(), published: false })
    .eq("id", input.contentId)
    .eq("hackathon_id", gate.hackathon.id);

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
  const gate = await requireEditionAdminBySlug(input.slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const supabase = await createServiceRoleClient();
  const { data, error: listError } = await supabase
    .from("hackathon_contents")
    .select("id, position")
    .eq("hackathon_id", gate.hackathon.id)
    .is("deleted_at", null)
    .order("position", { ascending: true });
  if (listError) {
    logQueryError("content.move.list", listError);
    return { ok: false, error: "Não foi possível reordenar. Tente novamente." };
  }

  const rows = (data as Array<{ id: string; position: number }> | null) ?? [];
  const index = rows.findIndex((r) => r.id === input.contentId);
  if (index === -1) return { ok: false, error: "Conteúdo não encontrado." };

  const target = input.direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= rows.length) return { ok: true };

  // Explicit renumber (moveSponsor's pattern) so tied positions still separate.
  const lower = Math.min(rows[index].position, rows[target].position);
  const higher = lower === rows[index].position ? lower + 1 : Math.max(rows[index].position, rows[target].position);
  const mine = input.direction === "up" ? lower : higher;
  const theirs = input.direction === "up" ? higher : lower;

  const [a, b] = await Promise.all([
    supabase
      .from("hackathon_contents")
      .update({ position: mine })
      .eq("id", rows[index].id)
      .eq("hackathon_id", gate.hackathon.id),
    supabase
      .from("hackathon_contents")
      .update({ position: theirs })
      .eq("id", rows[target].id)
      .eq("hackathon_id", gate.hackathon.id),
  ]);
  if (a.error || b.error) return { ok: false, error: "Não foi possível reordenar." };

  revalidatePath(`/admin/h/${input.slug}/content`);
  revalidatePath(`/h/${input.slug}/content`);
  return { ok: true };
}

