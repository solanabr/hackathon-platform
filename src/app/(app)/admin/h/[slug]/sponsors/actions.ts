"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireEditionAdminBySlug } from "@/lib/roles";
import { sanitizeText, sanitizeUrl } from "@/lib/security";
import type { SponsorTier } from "@/types/db";

export type SponsorActionResult = { ok: true } | { ok: false; error: string };

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

function revalidate(slug: string) {
  revalidatePath(`/admin/h/${slug}`);
  revalidatePath(`/h/${slug}`);
}

// Every write filters on the gated hackathon as well as the row id, so a
// scoped admin of one edition can never touch another's logos.

export async function uploadSponsor(input: {
  slug: string;
  tier: SponsorTier;
  formData: FormData;
}): Promise<SponsorActionResult> {
  const gate = await requireEditionAdminBySlug(input.slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const file = input.formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Escolha uma imagem." };
  }
  if (!ALLOWED.includes(file.type)) {
    return { ok: false, error: "Use PNG, JPG ou WebP." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Imagem muito grande (máx. 5 MB)." };
  }

  const name = sanitizeText(String(input.formData.get("name") ?? ""), 120);
  const url = sanitizeUrl(String(input.formData.get("url") ?? ""));

  const supabase = await createServiceRoleClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${gate.hackathon.id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("sponsor-logos")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return { ok: false, error: "Não foi possível enviar a imagem." };

  const { data: last } = await supabase
    .from("hackathon_sponsors")
    .select("position")
    .eq("hackathon_id", gate.hackathon.id)
    .eq("tier", input.tier)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = ((last as { position: number } | null)?.position ?? -1) + 1;

  const { error } = await supabase.from("hackathon_sponsors").insert({
    hackathon_id: gate.hackathon.id,
    tier: input.tier,
    name,
    url,
    image_path: path,
    position,
  });
  if (error) return { ok: false, error: "Imagem enviada, mas não foi possível salvar." };

  revalidate(input.slug);
  return { ok: true };
}

export async function deleteSponsor(input: {
  slug: string;
  sponsorId: string;
}): Promise<SponsorActionResult> {
  const gate = await requireEditionAdminBySlug(input.slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const supabase = await createServiceRoleClient();
  const { data: row } = await supabase
    .from("hackathon_sponsors")
    .select("image_path")
    .eq("id", input.sponsorId)
    .eq("hackathon_id", gate.hackathon.id)
    .maybeSingle();

  const { error } = await supabase
    .from("hackathon_sponsors")
    .delete()
    .eq("id", input.sponsorId)
    .eq("hackathon_id", gate.hackathon.id);
  if (error) return { ok: false, error: "Não foi possível remover." };

  // Seeded logos live in /public and are shared, so only uploaded files go.
  const path = (row as { image_path: string } | null)?.image_path;
  if (path && !path.startsWith("/")) {
    await supabase.storage.from("sponsor-logos").remove([path]);
  }

  revalidate(input.slug);
  return { ok: true };
}

export async function moveSponsor(input: {
  slug: string;
  sponsorId: string;
  direction: "up" | "down";
}): Promise<SponsorActionResult> {
  const gate = await requireEditionAdminBySlug(input.slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const supabase = await createServiceRoleClient();
  const { data: me } = await supabase
    .from("hackathon_sponsors")
    .select("id, tier, position")
    .eq("id", input.sponsorId)
    .eq("hackathon_id", gate.hackathon.id)
    .maybeSingle();
  if (!me) return { ok: false, error: "Logo não encontrado." };

  const row = me as { id: string; tier: string; position: number };
  const { data } = await supabase
    .from("hackathon_sponsors")
    .select("id, position")
    .eq("hackathon_id", gate.hackathon.id)
    .eq("tier", row.tier)
    .order("position", { ascending: true });

  const siblings = (data as Array<{ id: string; position: number }> | null) ?? [];
  const idx = siblings.findIndex((s) => s.id === row.id);
  const other = input.direction === "up" ? siblings[idx - 1] : siblings[idx + 1];
  if (!other) return { ok: true };

  // Explicit renumber so tied positions still separate.
  const lower = Math.min(row.position, other.position);
  const higher = lower === row.position ? lower + 1 : Math.max(row.position, other.position);
  const mine = input.direction === "up" ? lower : higher;
  const theirs = input.direction === "up" ? higher : lower;

  const [a, b] = await Promise.all([
    supabase
      .from("hackathon_sponsors")
      .update({ position: mine })
      .eq("id", row.id)
      .eq("hackathon_id", gate.hackathon.id),
    supabase
      .from("hackathon_sponsors")
      .update({ position: theirs })
      .eq("id", other.id)
      .eq("hackathon_id", gate.hackathon.id),
  ]);
  if (a.error || b.error) return { ok: false, error: "Não foi possível reordenar." };

  revalidate(input.slug);
  return { ok: true };
}
