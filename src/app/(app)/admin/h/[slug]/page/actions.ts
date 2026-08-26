"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { HACKATHONS_TAG, hackathonTag } from "@/lib/cache-tags";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireEditionAdminBySlug } from "@/lib/roles";

export type SavePageResult = { ok: true } | { ok: false; error: string };

const MAX_BYTES = 100 * 1024;

export async function savePageMd(input: {
  slug: string;
  pageMd: string;
}): Promise<SavePageResult> {
  const gate = await requireEditionAdminBySlug(input.slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  if (new TextEncoder().encode(input.pageMd).length > MAX_BYTES) {
    return { ok: false, error: "Documento muito grande (máx. 100 KB)." };
  }

  // An emptied document stays "" — a deliberately blank body. null is
  // reserved for editions the conversion never touched (legacy rendering).
  const supabase = await createServiceRoleClient();
  const { error } = await supabase
    .from("hackathons")
    .update({ page_md: input.pageMd })
    .eq("id", gate.hackathon.id);
  if (error) return { ok: false, error: "Não foi possível salvar." };

  revalidateTag(hackathonTag(input.slug), "max");
  revalidateTag(HACKATHONS_TAG, "max");
  revalidatePath(`/h/${input.slug}`);
  revalidatePath(`/admin/h/${input.slug}/page`);
  return { ok: true };
}
