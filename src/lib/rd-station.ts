import { after } from "next/server";

/**
 * RD Station Marketing conversions (docs/TRACKING.md, "RD Station"). Every
 * event is an upsert keyed on e-mail: the first one creates the contact, the
 * later ones only add the fields they carry. Runs in after() like track():
 * nothing on the request path waits for RD, and a failure is only logged.
 */

const ENDPOINT = "https://api.rd.services/platform/conversions";
const TIMEOUT_MS = 5_000;

export const RD_CONVERSION_IDENTIFIERS = {
  cadastro: "global_2026_cadastro_plataforma",
  confirmacao: "global_2026_confirmacao_colosseum",
  formulario: "global_2026_formulario_sobre_voce",
} as const;

export const RD_TAGS = ["global_2026_cadastro_plataforma"] as const;

// Custom field identifiers as created in RD by marketing. Rename here only.
export const RD_FIELD = {
  registered_at: "cf_global_data_do_cadastro_brt",
  colosseum_confirmed_at: "cf_global_data_da_confirmacao_colosseum_brt",
  interest_completed_at: "cf_data_da_confirmacao_colosseum_brt",
  utm_source: "cf_global_utm_source",
  utm_medium: "cf_global_utm_medium",
  utm_campaign: "cf_global_utm_campaign",
  utm_content: "cf_global_utm_content",
} as const;

export type RdIdentifier = keyof typeof RD_CONVERSION_IDENTIFIERS;
export type RdField = (typeof RD_FIELD)[keyof typeof RD_FIELD];

export type RdConversion = {
  identifier: RdIdentifier;
  email: string;
  name?: string | null;
  whatsapp?: string | null;
  fields: Partial<Record<RdField, string | null>>;
};

export type RdPayload = {
  event_type: "CONVERSION";
  event_family: "CDP";
  payload: {
    conversion_identifier: string;
    email: string;
    name?: string;
    mobile_phone?: string;
    tags: string[];
  } & Partial<Record<RdField, string>>;
};

function present(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim() !== "";
}

export function buildRdPayload(input: RdConversion): RdPayload {
  const fields: Partial<Record<RdField, string>> = {};
  for (const [key, value] of Object.entries(input.fields)) {
    if (present(value)) fields[key as RdField] = value;
  }
  return {
    event_type: "CONVERSION",
    event_family: "CDP",
    payload: {
      conversion_identifier: RD_CONVERSION_IDENTIFIERS[input.identifier],
      email: input.email,
      ...(present(input.name) && { name: input.name }),
      ...(present(input.whatsapp) && { mobile_phone: input.whatsapp }),
      tags: [...RD_TAGS],
      ...fields,
    },
  };
}

let loggedMissingKey = false;

export function sendRdConversion(input: RdConversion): void {
  const apiKey = process.env.RD_STATION_API_KEY;
  if (!apiKey) {
    if (!loggedMissingKey) {
      loggedMissingKey = true;
      console.debug("rd-station: RD_STATION_API_KEY unset, conversions disabled");
    }
    return;
  }
  const body = JSON.stringify(buildRdPayload(input));
  after(async () => {
    try {
      const res = await fetch(`${ENDPOINT}?api_key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("rd-station", input.identifier, "failed:", res.status, text);
      }
    } catch (err) {
      console.error("rd-station", input.identifier, "failed:", err);
    }
  });
}
