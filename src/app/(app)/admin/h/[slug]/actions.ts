"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { HACKATHONS_TAG, hackathonTag } from "@/lib/cache-tags";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireEditionAdmin, requireEditionAdminBySlug } from "@/lib/roles";
import { sanitizeUrl, sanitizeText } from "@/lib/security";
import { EDITION_FIELDS, fromLocalInput } from "@/lib/edition-fields";
import type { HackathonStatus } from "@/types/db";

export type EditionSaveResult =
  | { ok: true; slug: string }
  | { ok: false; error: string; fields?: Record<string, string> };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Inscrições/submissões/julgamento follow the configured dates on their own.
// The status column only carries the manual switches: publish, announce the
// finalists (judging) and close — in either direction, one hop at a time.
const MANUAL_TRANSITIONS: Array<[HackathonStatus, HackathonStatus]> = [
  ["draft", "published"],
  ["published", "draft"],
  ["published", "judging"],
  ["judging", "published"],
  ["judging", "closed"],
  ["closed", "judging"],
  // Legacy value from the manual machine; lets an old row rejoin the flow.
  ["submissions_open", "published"],
];

export async function updateEditionStatus(input: {
  slug: string;
  status: HackathonStatus;
}): Promise<EditionSaveResult> {
  const gate = await requireEditionAdminBySlug(input.slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const allowed = MANUAL_TRANSITIONS.some(
    ([from, to]) => from === gate.hackathon.status && to === input.status,
  );
  if (!allowed) {
    return { ok: false, error: "Transição de status inválida." };
  }

  const supabase = await createServiceRoleClient();
  const { error } = await supabase
    .from("hackathons")
    .update({ status: input.status })
    .eq("id", gate.hackathon.id);
  if (error) return { ok: false, error: "Não foi possível mudar o status." };

  revalidateTag(hackathonTag(input.slug), "max");
  revalidateTag(HACKATHONS_TAG, "max");
  revalidatePath("/admin");
  revalidatePath(`/admin/h/${input.slug}`);
  revalidatePath(`/h/${input.slug}`);
  revalidatePath("/");
  return { ok: true, slug: input.slug };
}

export async function updateEdition(
  hackathonId: string,
  currentSlug: string,
  formData: FormData,
): Promise<EditionSaveResult> {
  const gate = await requireEditionAdmin(hackathonId);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const patch: Record<string, unknown> = {};
  const fields: Record<string, string> = {};

  for (const field of EDITION_FIELDS) {
    const key = field.key as string;
    const raw = formData.get(key);
    if (field.kind === "boolean") {
      patch[key] = raw === "on";
      continue;
    }
    if (raw === null) continue;
    const value = String(raw);

    switch (field.kind) {
      case "datetime":
        patch[key] = fromLocalInput(value);
        break;
      case "number": {
        if (!value.trim()) {
          patch[key] = null;
          break;
        }
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0) {
          fields[key] = "Use um número inteiro maior ou igual a zero.";
          break;
        }
        patch[key] = Math.trunc(n);
        break;
      }
      case "url": {
        if (!value.trim()) {
          patch[key] = null;
          break;
        }
        const url = sanitizeUrl(value);
        if (!url) {
          fields[key] = "URL inválida. Use um endereço https://... completo.";
          break;
        }
        patch[key] = url;
        break;
      }
      case "textarea":
        patch[key] = sanitizeText(value, 4000);
        break;
      case "select": {
        if (!field.options?.some((o) => o.value === value)) {
          fields[key] = "Opção inválida.";
          break;
        }
        patch[key] = value;
        break;
      }
      default:
        patch[key] = sanitizeText(value, 300);
    }
  }

  if (!patch.name) fields.name = "O nome é obrigatório.";

  const slug = (patch.slug as string | null)?.trim().toLowerCase() ?? "";
  if (!SLUG_RE.test(slug)) {
    fields.slug = "Use apenas letras minúsculas, números e hífens.";
  }
  patch.slug = slug;

  if (!fields.team_size_min && !fields.team_size_max) {
    const min = patch.team_size_min as number | null;
    const max = patch.team_size_max as number | null;
    if (min === null || min < 1) {
      fields.team_size_min = "Informe um mínimo de pelo menos 1 integrante.";
    } else if (max === null || max < 1) {
      fields.team_size_max = "Informe um máximo de pelo menos 1 integrante.";
    } else if (max < min) {
      fields.team_size_max = "O máximo precisa ser maior ou igual ao mínimo.";
    }
  }

  if (!patch.starts_at) fields.starts_at = "Informe a data de início.";
  if (!patch.submission_deadline_at) {
    fields.submission_deadline_at = "Informe o prazo de submissão.";
  } else if (
    patch.starts_at &&
    new Date(patch.submission_deadline_at as string) <= new Date(patch.starts_at as string)
  ) {
    fields.submission_deadline_at = "O prazo de submissão precisa ser depois do início.";
  }

  if (Object.keys(fields).length > 0) {
    return { ok: false, error: "Corrija os campos destacados.", fields };
  }

  const supabase = await createServiceRoleClient();
  const { error } = await supabase.from("hackathons").update(patch).eq("id", hackathonId);

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Já existe uma edição com esse slug." };
    return { ok: false, error: "Não foi possível salvar." };
  }

  revalidateTag(hackathonTag(slug), "max");
  if (slug !== currentSlug) revalidateTag(hackathonTag(currentSlug), "max");
  revalidateTag(HACKATHONS_TAG, "max");
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
  const gate = await requireEditionAdmin(hackathonId);
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

  revalidateTag(hackathonTag(slug), "max");
  revalidateTag(HACKATHONS_TAG, "max");
  revalidatePath(`/admin/h/${slug}`);
  revalidatePath(`/h/${slug}`);
  revalidatePath("/");
  return { ok: true, slug };
}
