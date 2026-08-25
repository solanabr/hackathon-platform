"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireEditionAdminBySlug } from "@/lib/roles";
import { sanitizeText } from "@/lib/security";

export type SectionActionResult = { ok: true } | { ok: false; error: string };

function revalidate(slug: string) {
  revalidatePath(`/admin/h/${slug}/sections`);
  revalidatePath(`/h/${slug}`);
}

// Every mutation here filters on the gated hackathon's id as well as the row
// id: the gate authorizes the slug, and without the second filter a scoped
// admin of edition A could pass edition B's section id and write to B.

export async function updateSection(input: {
  slug: string;
  sectionId: string;
  title: string;
  subtitle: string;
  bodyMd: string;
  configJson: string | null;
}): Promise<SectionActionResult> {
  const gate = await requireEditionAdminBySlug(input.slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const patch: Record<string, unknown> = {
    title: sanitizeText(input.title) || null,
    subtitle: sanitizeText(input.subtitle) || null,
    body_md: input.bodyMd.trim() || null,
    updated_at: new Date().toISOString(),
  };

  // null means the editor did not expose the config field; leaving it out of
  // the patch keeps whatever the row already holds.
  if (input.configJson !== null) {
    const raw = input.configJson.trim();
    if (!raw) {
      patch.config = {};
    } else {
      let config: unknown;
      try {
        config = JSON.parse(raw);
      } catch {
        return { ok: false, error: "O JSON de configuração é inválido." };
      }
      if (typeof config !== "object" || config === null || Array.isArray(config)) {
        return { ok: false, error: "A configuração precisa ser um objeto JSON." };
      }
      patch.config = config;
    }
  }

  const supabase = await createServiceRoleClient();
  const { error } = await supabase
    .from("hackathon_sections")
    .update(patch)
    .eq("id", input.sectionId)
    .eq("hackathon_id", gate.hackathon.id);

  if (error) return { ok: false, error: "Não foi possível salvar a seção." };
  revalidate(input.slug);
  return { ok: true };
}

export async function setSectionVisible(input: {
  slug: string;
  sectionId: string;
  visible: boolean;
}): Promise<SectionActionResult> {
  const gate = await requireEditionAdminBySlug(input.slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const supabase = await createServiceRoleClient();
  const { error } = await supabase
    .from("hackathon_sections")
    .update({ visible: input.visible, updated_at: new Date().toISOString() })
    .eq("id", input.sectionId)
    .eq("hackathon_id", gate.hackathon.id);

  if (error) return { ok: false, error: "Não foi possível atualizar a seção." };
  revalidate(input.slug);
  return { ok: true };
}

export async function moveSection(input: {
  slug: string;
  sectionId: string;
  direction: "up" | "down";
}): Promise<SectionActionResult> {
  const gate = await requireEditionAdminBySlug(input.slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const supabase = await createServiceRoleClient();
  const { data } = await supabase
    .from("hackathon_sections")
    .select("id, position")
    .eq("hackathon_id", gate.hackathon.id)
    .is("deleted_at", null)
    .order("position", { ascending: true });

  const siblings = (data as Array<{ id: string; position: number }> | null) ?? [];
  const idx = siblings.findIndex((r) => r.id === input.sectionId);
  if (idx === -1) return { ok: false, error: "Seção não encontrada." };
  const other = input.direction === "up" ? siblings[idx - 1] : siblings[idx + 1];
  if (!other) return { ok: true };

  const me = siblings[idx];
  // Renumber both rows explicitly (distinct values even when positions tied).
  const [lowPos, highPos] =
    me.position === other.position ? [me.position, me.position + 1] : [me.position, other.position];
  const [first, second] =
    input.direction === "up" ? [
      { id: me.id, position: Math.min(lowPos, highPos) },
      { id: other.id, position: Math.max(lowPos, highPos) },
    ] : [
      { id: me.id, position: Math.max(lowPos, highPos) },
      { id: other.id, position: Math.min(lowPos, highPos) },
    ];

  const [a, b] = await Promise.all([
    supabase
      .from("hackathon_sections")
      .update({ position: first.position })
      .eq("id", first.id)
      .eq("hackathon_id", gate.hackathon.id),
    supabase
      .from("hackathon_sections")
      .update({ position: second.position })
      .eq("id", second.id)
      .eq("hackathon_id", gate.hackathon.id),
  ]);
  if (a.error || b.error) return { ok: false, error: "Não foi possível reordenar." };

  revalidate(input.slug);
  return { ok: true };
}

export async function createMarkdownSection(input: {
  slug: string;
}): Promise<SectionActionResult> {
  const gate = await requireEditionAdminBySlug(input.slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const supabase = await createServiceRoleClient();
  const { data: last } = await supabase
    .from("hackathon_sections")
    .select("position")
    .eq("hackathon_id", gate.hackathon.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = ((last as { position: number } | null)?.position ?? 0) + 1;
  const { error } = await supabase.from("hackathon_sections").insert({
    hackathon_id: gate.hackathon.id,
    position,
    kind: "markdown",
    title: "Nova seção",
    visible: false,
  });

  if (error) return { ok: false, error: "Não foi possível criar a seção." };
  revalidate(input.slug);
  return { ok: true };
}

export async function deleteSection(input: {
  slug: string;
  sectionId: string;
}): Promise<SectionActionResult> {
  const gate = await requireEditionAdminBySlug(input.slug);
  if (!gate.ok) return { ok: false, error: "Sem permissão." };

  const supabase = await createServiceRoleClient();
  const { error } = await supabase
    .from("hackathon_sections")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", input.sectionId)
    .eq("hackathon_id", gate.hackathon.id)
    .eq("kind", "markdown");

  if (error) return { ok: false, error: "Não foi possível remover a seção." };
  revalidate(input.slug);
  return { ok: true };
}
