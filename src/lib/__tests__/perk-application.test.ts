import { describe, it, expect } from "vitest";
import { PERK_LIMITS, validatePerkApplication } from "@/app/(public)/perks/helius/application";

const valid = {
  full_name: "  Ana Souza ",
  whatsapp: "(11) 91234-5678",
  project_name: "Pix Bridge",
  project_summary: "Ponte entre Pix e USDC na Solana.",
  usage_plan: "Webhooks para confirmar depósitos e RPC para o app.",
};

describe("validatePerkApplication", () => {
  it("accepts a complete application and normalizes the WhatsApp", () => {
    const result = validatePerkApplication(valid);
    expect(result).toEqual({
      ok: true,
      user: { full_name: "Ana Souza", whatsapp: "+5511912345678" },
      application: {
        project_name: "Pix Bridge",
        project_summary: "Ponte entre Pix e USDC na Solana.",
        usage_plan: "Webhooks para confirmar depósitos e RPC para o app.",
      },
    });
  });

  it.each(["full_name", "whatsapp", "project_name", "project_summary", "usage_plan"] as const)(
    "refuses a blank %s and points at it",
    (field) => {
      const result = validatePerkApplication({ ...valid, [field]: "   " });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.field).toBe(field);
    },
  );

  it("refuses text where the WhatsApp number goes", () => {
    const result = validatePerkApplication({ ...valid, whatsapp: "meu zap" });
    expect(result).toMatchObject({ ok: false, field: "whatsapp" });
  });

  it("keeps a foreign number with its country code", () => {
    const result = validatePerkApplication({ ...valid, whatsapp: "+1 415 555 0100" });
    expect(result).toMatchObject({ ok: true, user: { whatsapp: "+14155550100" } });
  });

  it("cuts long answers at the column limit", () => {
    const result = validatePerkApplication({ ...valid, usage_plan: "a".repeat(PERK_LIMITS.usage_plan + 50) });
    expect(result.ok && result.application.usage_plan.length).toBe(PERK_LIMITS.usage_plan);
  });
});
