import { sanitizeText, sanitizeUrl } from "@/lib/security";
import { normalizeWhatsapp } from "@/lib/phone";
import type { Startup, User } from "@/types/db";
import {
  HIRING_OPTIONS,
  STAGE_OPTIONS,
  TARGET_CUSTOMERS_OPTIONS,
  TECH_TEAM_OPTIONS,
  TOKEN_LAUNCH_OPTIONS,
  VERTICAL_OPTIONS,
  WORK_TYPE_OPTIONS,
  type StartupStep,
} from "./constants";

export type StartupIntent = "continue" | "complete" | "later";

export type StartupField =
  | "full_name"
  | "whatsapp"
  | "location"
  | "telegram_handle"
  | "linkedin_url"
  | "job_title"
  | "work_type"
  | "name"
  | "one_liner"
  | "vertical"
  | "stage"
  | "website"
  | "pitch_deck_url"
  | "twitter"
  | "logo_url"
  | "hiring"
  | "target_customers"
  | "token_launch"
  | "tech_team"
  | "heard_from"
  | "help_needed"
  | "server";

export type StartupFields = Partial<Record<Exclude<StartupField, "server">, string | null>>;

export type UserPatch = Partial<
  Pick<User, "full_name" | "whatsapp" | "location" | "telegram_handle" | "linkedin_url" | "job_title" | "work_type">
>;
export type StartupPatch = Partial<
  Pick<
    Startup,
    | "name"
    | "one_liner"
    | "vertical"
    | "stage"
    | "website"
    | "pitch_deck_url"
    | "twitter"
    | "logo_url"
    | "hiring"
    | "target_customers"
    | "token_launch"
    | "tech_team"
    | "heard_from"
    | "help_needed"
  >
>;

export type StartupValidation =
  | { ok: true; user?: UserPatch; startup?: StartupPatch }
  | { ok: false; error: string; field: StartupField };

const INVALID_OPTION = "Escolha uma opção válida.";

function pickOption<T extends string>(
  options: readonly { value: T }[],
  raw: string | null | undefined,
): T | null | undefined {
  if (!raw) return null;
  return options.some((o) => o.value === raw) ? (raw as T) : undefined;
}

type UrlPick = { url: string | null } | { keep: true } | { invalid: true };

/**
 * A URL that does not parse is refused when the person is moving forward and
 * left untouched (not written) when they are only parking the form, so a
 * half-typed link never blocks a save nor clobbers a good one.
 */
function pickUrl(raw: string | null | undefined, strict: boolean): UrlPick {
  const text = sanitizeText(raw, 500);
  if (!text) return { url: null };
  const url = sanitizeUrl(text);
  if (url) return { url };
  return strict ? { invalid: true } : { keep: true };
}

/**
 * `continue` and `complete` enforce what the step asks for; `later` keeps
 * whatever is usable and only refuses values the table itself would refuse.
 * Fields the step does not show are never written, so a step 3 save cannot
 * blank step 2. Cross-step requirements for `complete` (a startup name, the
 * step 1 contact fields) are checked by the action against the stored rows.
 */
export function validateStartup(step: StartupStep, fields: StartupFields, intent: StartupIntent): StartupValidation {
  const strict = intent !== "later";

  if (step === 1) {
    const workType = pickOption(WORK_TYPE_OPTIONS, fields.work_type);
    if (workType === undefined) return { ok: false, error: INVALID_OPTION, field: "work_type" };

    const fullName = sanitizeText(fields.full_name, 120);
    if (strict && !fullName) return { ok: false, error: "Informe seu nome completo.", field: "full_name" };

    const whatsappText = sanitizeText(fields.whatsapp, 40);
    // Loose shape check only, as in preRegister: formats vary, but pure text
    // must not pass as a number.
    const digits = whatsappText?.replace(/\D/g, "") ?? "";
    const whatsappValid = digits.length >= 10 && digits.length <= 14;
    if (strict && !whatsappText) return { ok: false, error: "Informe seu WhatsApp.", field: "whatsapp" };
    if (strict && !whatsappValid) {
      return { ok: false, error: "Informe um WhatsApp válido, com DDD.", field: "whatsapp" };
    }

    const location = sanitizeText(fields.location, 120);
    if (strict && !location) return { ok: false, error: "Informe sua cidade e estado.", field: "location" };

    const linkedin = pickUrl(fields.linkedin_url, strict);
    if ("invalid" in linkedin) {
      return { ok: false, error: "Informe um link válido do LinkedIn.", field: "linkedin_url" };
    }

    const telegram = sanitizeText(fields.telegram_handle, 60)?.replace(/^@/, "") ?? null;
    return {
      ok: true,
      user: {
        ...(fullName && { full_name: fullName }),
        ...(whatsappText && whatsappValid && { whatsapp: normalizeWhatsapp(whatsappText) }),
        ...(location && { location }),
        telegram_handle: telegram,
        ...("url" in linkedin && { linkedin_url: linkedin.url }),
        job_title: sanitizeText(fields.job_title, 80),
        work_type: workType,
      },
    };
  }

  if (step === 2) {
    const vertical = pickOption(VERTICAL_OPTIONS, fields.vertical);
    if (vertical === undefined) return { ok: false, error: INVALID_OPTION, field: "vertical" };
    const stage = pickOption(STAGE_OPTIONS, fields.stage);
    if (stage === undefined) return { ok: false, error: INVALID_OPTION, field: "stage" };

    const name = sanitizeText(fields.name, 120);
    if (strict && !name) return { ok: false, error: "Informe o nome da startup.", field: "name" };

    const website = pickUrl(fields.website, strict);
    if ("invalid" in website) return { ok: false, error: "Informe um site válido.", field: "website" };
    const pitchDeck = pickUrl(fields.pitch_deck_url, strict);
    if ("invalid" in pitchDeck) {
      return { ok: false, error: "Informe um link válido para o pitch deck.", field: "pitch_deck_url" };
    }
    const logo = pickUrl(fields.logo_url, strict);
    if ("invalid" in logo) return { ok: false, error: "Informe um link válido para o logo.", field: "logo_url" };

    return {
      ok: true,
      startup: {
        ...(name && { name }),
        one_liner: sanitizeText(fields.one_liner, 280),
        vertical,
        stage,
        ...("url" in website && { website: website.url }),
        ...("url" in pitchDeck && { pitch_deck_url: pitchDeck.url }),
        twitter: sanitizeText(fields.twitter, 60)?.replace(/^@/, "") ?? null,
        ...("url" in logo && { logo_url: logo.url }),
      },
    };
  }

  const hiring = pickOption(HIRING_OPTIONS, fields.hiring);
  if (hiring === undefined) return { ok: false, error: INVALID_OPTION, field: "hiring" };
  const targetCustomers = pickOption(TARGET_CUSTOMERS_OPTIONS, fields.target_customers);
  if (targetCustomers === undefined) return { ok: false, error: INVALID_OPTION, field: "target_customers" };
  const tokenLaunch = pickOption(TOKEN_LAUNCH_OPTIONS, fields.token_launch);
  if (tokenLaunch === undefined) return { ok: false, error: INVALID_OPTION, field: "token_launch" };
  const techTeam = pickOption(TECH_TEAM_OPTIONS, fields.tech_team);
  if (techTeam === undefined) return { ok: false, error: INVALID_OPTION, field: "tech_team" };

  return {
    ok: true,
    startup: {
      hiring,
      target_customers: targetCustomers,
      token_launch: tokenLaunch,
      tech_team: techTeam,
      heard_from: sanitizeText(fields.heard_from, 200),
      help_needed: sanitizeText(fields.help_needed, 1000),
    },
  };
}
