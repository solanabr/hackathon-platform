import { describe, it, expect } from "vitest";
import { validateStartup } from "@/app/(public)/startup-registration/startup";

const CONTACT = { full_name: "Ana", whatsapp: "11912345678", location: "São Paulo/SP" };

describe("validateStartup — step 1", () => {
  it("continue requires name, whatsapp and location", () => {
    expect(validateStartup(1, {}, "continue")).toMatchObject({ ok: false, field: "full_name" });
    expect(validateStartup(1, { full_name: "Ana" }, "continue")).toMatchObject({ ok: false, field: "whatsapp" });
    expect(validateStartup(1, { full_name: "Ana", whatsapp: "abc" }, "continue")).toMatchObject({
      ok: false,
      field: "whatsapp",
    });
    expect(validateStartup(1, { full_name: "Ana", whatsapp: "11912345678" }, "continue")).toMatchObject({
      ok: false,
      field: "location",
    });
  });

  it("continue returns normalised profile fields", () => {
    expect(
      validateStartup(
        1,
        { ...CONTACT, telegram_handle: "@ana", linkedin_url: "linkedin.com/in/ana", job_title: " CEO ", work_type: "business" },
        "continue",
      ),
    ).toEqual({
      ok: true,
      user: {
        full_name: "Ana",
        whatsapp: "+5511912345678",
        location: "São Paulo/SP",
        telegram_handle: "ana",
        linkedin_url: "https://linkedin.com/in/ana",
        job_title: "CEO",
        work_type: "business",
      },
    });
  });

  it("later keeps the required fields out of the write when empty or invalid", () => {
    expect(validateStartup(1, { whatsapp: "abc", linkedin_url: "not a url" }, "later")).toEqual({
      ok: true,
      user: { telegram_handle: null, job_title: null, work_type: null },
    });
  });

  it("refuses an unusable LinkedIn only on continue", () => {
    expect(validateStartup(1, { ...CONTACT, linkedin_url: "javascript:alert(1)" }, "continue")).toMatchObject({
      ok: false,
      field: "linkedin_url",
    });
    expect(validateStartup(1, { linkedin_url: "" }, "later")).toMatchObject({ ok: true, user: { linkedin_url: null } });
  });

  it.each(["continue", "later"] as const)("rejects an unknown work type (%s)", (intent) => {
    expect(validateStartup(1, { ...CONTACT, work_type: "wizard" }, intent)).toMatchObject({ ok: false, field: "work_type" });
  });
});

describe("validateStartup — step 2", () => {
  it("continue requires the startup name; later does not", () => {
    expect(validateStartup(2, {}, "continue")).toMatchObject({ ok: false, field: "name" });
    expect(validateStartup(2, {}, "later")).toMatchObject({ ok: true, startup: { one_liner: null, vertical: null } });
  });

  it("returns sanitised values", () => {
    expect(
      validateStartup(
        2,
        {
          name: " Foo ",
          one_liner: "pays people",
          vertical: "payments",
          stage: "raising_seed",
          website: "foo.xyz",
          pitch_deck_url: "https://docs.google.com/x",
          twitter: "@foo",
          logo_url: "",
        },
        "continue",
      ),
    ).toEqual({
      ok: true,
      startup: {
        name: "Foo",
        one_liner: "pays people",
        vertical: "payments",
        stage: "raising_seed",
        website: "https://foo.xyz/",
        pitch_deck_url: "https://docs.google.com/x",
        twitter: "foo",
        logo_url: null,
      },
    });
  });

  it.each(["continue", "later"] as const)("rejects unknown vertical and stage codes (%s)", (intent) => {
    expect(validateStartup(2, { name: "Foo", vertical: "memes" }, intent)).toMatchObject({ ok: false, field: "vertical" });
    expect(validateStartup(2, { name: "Foo", stage: "unicorn" }, intent)).toMatchObject({ ok: false, field: "stage" });
  });

  it("enforces URLs on continue and skips them on later", () => {
    for (const field of ["website", "pitch_deck_url", "logo_url"] as const) {
      expect(validateStartup(2, { name: "Foo", [field]: "javascript:alert(1)" }, "continue")).toMatchObject({
        ok: false,
        field,
      });
      const later = validateStartup(2, { name: "Foo", [field]: "meu site" }, "later");
      expect(later).toMatchObject({ ok: true, startup: { name: "Foo" } });
      expect(later.ok && later.startup && field in later.startup).toBe(false);
    }
  });
});

describe("validateStartup — step 3", () => {
  it("accepts an empty form on complete", () => {
    expect(validateStartup(3, {}, "complete")).toEqual({
      ok: true,
      startup: {
        hiring: null,
        target_customers: null,
        token_launch: null,
        tech_team: null,
        heard_from: null,
        help_needed: null,
      },
    });
  });

  it.each(["complete", "later"] as const)("rejects unknown codes (%s)", (intent) => {
    expect(validateStartup(3, { hiring: "maybe" }, intent)).toMatchObject({ ok: false, field: "hiring" });
    expect(validateStartup(3, { target_customers: "aliens" }, intent)).toMatchObject({ ok: false, field: "target_customers" });
    expect(validateStartup(3, { token_launch: "soon" }, intent)).toMatchObject({ ok: false, field: "token_launch" });
    expect(validateStartup(3, { tech_team: "robots" }, intent)).toMatchObject({ ok: false, field: "tech_team" });
  });

  it("truncates free text to the column limits", () => {
    const result = validateStartup(3, { heard_from: "x".repeat(300), help_needed: "y".repeat(1200) }, "complete");
    expect(result.ok && result.startup?.heard_from?.length).toBe(200);
    expect(result.ok && result.startup?.help_needed?.length).toBe(1000);
  });
});
