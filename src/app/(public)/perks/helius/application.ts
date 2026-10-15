import { sanitizeText } from "@/lib/security";
import { normalizeWhatsapp } from "@/lib/phone";

export type PerkField = "full_name" | "whatsapp" | "project_name" | "project_summary" | "usage_plan" | "server";

export type PerkFields = Partial<Record<Exclude<PerkField, "server">, string | null>>;

export const PERK_LIMITS = {
  full_name: 120,
  project_name: 120,
  project_summary: 1000,
  usage_plan: 1000,
} as const;

export type PerkValidation =
  | {
      ok: true;
      user: { full_name: string; whatsapp: string };
      application: { project_name: string; project_summary: string; usage_plan: string };
    }
  | { ok: false; error: string; field: PerkField };

/** Every field is required: the team vets each application by hand. */
export function validatePerkApplication(fields: PerkFields): PerkValidation {
  const fullName = sanitizeText(fields.full_name, PERK_LIMITS.full_name);
  if (!fullName) return { ok: false, error: "Informe seu nome.", field: "full_name" };

  const whatsappText = sanitizeText(fields.whatsapp, 40);
  if (!whatsappText) return { ok: false, error: "Informe seu WhatsApp.", field: "whatsapp" };
  // Same loose shape check as the startup form: formats vary, but text must
  // not pass as a number.
  const digits = whatsappText.replace(/\D/g, "");
  const whatsapp = digits.length >= 10 && digits.length <= 14 ? normalizeWhatsapp(whatsappText) : null;
  if (!whatsapp) return { ok: false, error: "Informe um WhatsApp válido, com DDD.", field: "whatsapp" };

  const projectName = sanitizeText(fields.project_name, PERK_LIMITS.project_name);
  if (!projectName) return { ok: false, error: "Informe o nome do projeto.", field: "project_name" };

  const summary = sanitizeText(fields.project_summary, PERK_LIMITS.project_summary);
  if (!summary) return { ok: false, error: "Conte em poucas linhas o que o projeto faz.", field: "project_summary" };

  const usage = sanitizeText(fields.usage_plan, PERK_LIMITS.usage_plan);
  if (!usage) return { ok: false, error: "Conte onde e por que você usaria a Helius.", field: "usage_plan" };

  return {
    ok: true,
    user: { full_name: fullName, whatsapp },
    application: { project_name: projectName, project_summary: summary, usage_plan: usage },
  };
}
