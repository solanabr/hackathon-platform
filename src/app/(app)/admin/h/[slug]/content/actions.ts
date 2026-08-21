"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/roles";
import { extractYouTubeId } from "@/lib/content";

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
