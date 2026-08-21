"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/roles";
import { extractYouTubeId } from "@/lib/content";

export type ContentActionResult = { ok: true } | { ok: false; error: string };

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

  if (input.published && !youtubeId) {
    return { ok: false, error: "Adicione o link do vídeo antes de publicar." };
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
