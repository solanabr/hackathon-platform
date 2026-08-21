"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/roles";
import { sanitizeUrl, sanitizeText } from "@/lib/security";
import { EDITION_FIELDS, fromLocalInput } from "@/lib/edition-fields";

export type EditionSaveResult = { ok: true; slug: string } | { ok: false; error: string };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function updateEdition(
  hackathonId: string,
  currentSlug: string,
  formData: FormData,
): Promise<EditionSaveResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const patch: Record<string, unknown> = {};

  for (const field of EDITION_FIELDS) {
    const raw = formData.get(field.key as string);
    if (raw === null) continue;
    const value = String(raw);

    switch (field.kind) {
      case "datetime":
        patch[field.key as string] = fromLocalInput(value);
        break;
      case "number": {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0) return { ok: false, error: `${field.label} inválido.` };
        patch[field.key as string] = Math.trunc(n);
        break;
      }
      case "url":
        patch[field.key as string] = value.trim() ? sanitizeUrl(value) : null;
        break;
      case "textarea":
        patch[field.key as string] = sanitizeText(value, 4000);
        break;
      default:
        patch[field.key as string] = sanitizeText(value, 300);
    }
  }

  const name = patch.name as string | null;
  if (!name) return { ok: false, error: "O nome é obrigatório." };

  const slug = (patch.slug as string | null)?.trim().toLowerCase() ?? "";
  if (!SLUG_RE.test(slug)) {
    return { ok: false, error: "Slug inválido. Use apenas letras minúsculas, números e hífens." };
  }
  patch.slug = slug;

  if (!patch.starts_at) return { ok: false, error: "Informe a data de início." };
  if (!patch.submission_deadline_at) {
    return { ok: false, error: "Informe o prazo de submissão." };
  }
  if (new Date(patch.submission_deadline_at as string) <= new Date(patch.starts_at as string)) {
    return { ok: false, error: "O prazo de submissão precisa ser depois do início." };
  }

  const supabase = await createServiceRoleClient();
  const { error } = await supabase.from("hackathons").update(patch).eq("id", hackathonId);

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Já existe uma edição com esse slug." };
    return { ok: false, error: "Não foi possível salvar." };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/h/${slug}`);
  revalidatePath(`/h/${slug}`);
  if (slug !== currentSlug) revalidatePath(`/h/${currentSlug}`);
  revalidatePath("/");

  return { ok: true, slug };
}

export async function uploadEditionCover(
  hackathonId: string,
  slug: string,
  formData: FormData,
): Promise<EditionSaveResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const file = formData.get("cover");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Escolha uma imagem." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${hackathonId}/cover-${Date.now()}.${ext}`;

  const supabase = await createServiceRoleClient();
  const { error: uploadError } = await supabase.storage
    .from("hackathon-covers")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) return { ok: false, error: "Não foi possível enviar a imagem." };

  const { error } = await supabase
    .from("hackathons")
    .update({ cover_image_path: path })
    .eq("id", hackathonId);

  if (error) return { ok: false, error: "Imagem enviada, mas não foi possível salvar." };

  revalidatePath(`/admin/h/${slug}`);
  revalidatePath(`/h/${slug}`);
  revalidatePath("/");
  return { ok: true, slug };
}
