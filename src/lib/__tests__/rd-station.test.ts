import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { pending } = vi.hoisted(() => ({ pending: [] as Promise<unknown>[] }));
vi.mock("next/server", () => ({
  after: (fn: () => Promise<void>) => {
    pending.push(fn());
  },
}));

import { buildRdPayload, sendRdConversion } from "../rd-station";
import { formatBrt } from "../dates";

const ISO = "2026-09-11T15:13:22.209Z";

describe("formatBrt", () => {
  it("renders YYYY-MM-DD HH:mm:ss in America/Sao_Paulo", () => {
    expect(formatBrt(ISO)).toBe("2026-09-11 12:13:22");
  });

  it("keeps midnight two-digit and null-safes", () => {
    expect(formatBrt("2026-01-01T03:00:00Z")).toBe("2026-01-01 00:00:00");
    expect(formatBrt(null)).toBeNull();
    expect(formatBrt("not a date")).toBeNull();
  });
});

describe("buildRdPayload", () => {
  it("cadastro carries name, phone, date and utms", () => {
    expect(
      buildRdPayload({
        identifier: "cadastro",
        email: "ana@example.com",
        name: "Ana Souza",
        whatsapp: "+5511999999999",
        fields: {
          cf_global_data_do_cadastro_brt: formatBrt(ISO),
          cf_global_utm_source: "instagram",
          cf_global_utm_medium: "social",
          cf_global_utm_campaign: "hackathon_colosseum_2026",
          cf_global_utm_content: null,
        },
      }),
    ).toEqual({
      event_type: "CONVERSION",
      event_family: "CDP",
      payload: {
        conversion_identifier: "global_2026_cadastro_plataforma",
        email: "ana@example.com",
        name: "Ana Souza",
        mobile_phone: "+5511999999999",
        tags: ["global_2026_cadastro_plataforma"],
        cf_global_data_do_cadastro_brt: "2026-09-11 12:13:22",
        cf_global_utm_source: "instagram",
        cf_global_utm_medium: "social",
        cf_global_utm_campaign: "hackathon_colosseum_2026",
      },
    });
  });

  it("confirmacao drops empty name and phone", () => {
    expect(
      buildRdPayload({
        identifier: "confirmacao",
        email: "ana@example.com",
        name: null,
        whatsapp: "",
        fields: { cf_global_data_da_confirmacao_colosseum_brt: "2026-09-11 12:13:22" },
      }),
    ).toEqual({
      event_type: "CONVERSION",
      event_family: "CDP",
      payload: {
        conversion_identifier: "global_2026_confirmacao_colosseum",
        email: "ana@example.com",
        tags: ["global_2026_cadastro_plataforma"],
        cf_global_data_da_confirmacao_colosseum_brt: "2026-09-11 12:13:22",
      },
    });
  });

  it("formulario uses the interest identifier", () => {
    expect(
      buildRdPayload({
        identifier: "formulario",
        email: "ana@example.com",
        fields: { cf_data_da_confirmacao_colosseum_brt: "2026-09-11 12:13:22" },
      }),
    ).toEqual({
      event_type: "CONVERSION",
      event_family: "CDP",
      payload: {
        conversion_identifier: "global_2026_formulario_sobre_voce",
        email: "ana@example.com",
        tags: ["global_2026_cadastro_plataforma"],
        cf_data_da_confirmacao_colosseum_brt: "2026-09-11 12:13:22",
      },
    });
  });
});

describe("sendRdConversion", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    pending.length = 0;
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("is a no-op without the key", async () => {
    vi.stubEnv("RD_STATION_API_KEY", "");
    sendRdConversion({ identifier: "cadastro", email: "ana@example.com", fields: {} });
    await Promise.all(pending);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts once with the key", async () => {
    vi.stubEnv("RD_STATION_API_KEY", "secret");
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => "" });
    sendRdConversion({
      identifier: "confirmacao",
      email: "ana@example.com",
      fields: { cf_global_data_da_confirmacao_colosseum_brt: "2026-09-11 12:13:22" },
    });
    await Promise.all(pending);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.rd.services/platform/conversions?api_key=secret");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body as string).payload.conversion_identifier).toBe(
      "global_2026_confirmacao_colosseum",
    );
  });

  it("logs a failed status with RD's body and never throws", async () => {
    vi.stubEnv("RD_STATION_API_KEY", "secret");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => '{"errors":[]}' });
    sendRdConversion({ identifier: "formulario", email: "ana@example.com", fields: {} });
    await Promise.all(pending);
    expect(error).toHaveBeenCalledWith("rd-station", "formulario", "failed:", 400, '{"errors":[]}');
  });
});
