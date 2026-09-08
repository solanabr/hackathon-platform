import { describe, it, expect } from "vitest";
import { validateInterest } from "@/app/(public)/pre-registro/interest";

describe("validateInterest — complete", () => {
  it("requires has_project and looking_for_team", () => {
    expect(validateInterest({}, "complete")).toMatchObject({ ok: false, field: "has_project" });
    expect(validateInterest({ has_project: "no_want_team" }, "complete")).toMatchObject({
      ok: false,
      field: "looking_for_team",
    });
  });

  it("requires project name and one-liner only when has_project is yes", () => {
    expect(validateInterest({ has_project: "yes", looking_for_team: "yes" }, "complete")).toMatchObject({
      ok: false,
      field: "project_name",
    });
    expect(
      validateInterest({ has_project: "yes", looking_for_team: "yes", project_name: "Foo" }, "complete"),
    ).toMatchObject({ ok: false, field: "one_liner" });
    expect(validateInterest({ has_project: "idea_no_team", looking_for_team: "no" }, "complete")).toMatchObject({
      ok: true,
      values: { has_project: "idea_no_team", looking_for_team: false, project_name: null },
    });
  });

  it("returns sanitised values", () => {
    const result = validateInterest(
      {
        has_project: "yes",
        looking_for_team: "yes",
        project_name: "  Foo  ",
        one_liner: " does bar ",
        stage: "mvp",
        team_size: "3",
        project_url: "github.com/foo/bar",
        project_socials: "@foo",
        notes: " hi ",
      },
      "complete",
    );
    expect(result).toEqual({
      ok: true,
      values: {
        has_project: "yes",
        looking_for_team: true,
        project_name: "Foo",
        one_liner: "does bar",
        stage: "mvp",
        team_size: 3,
        project_url: "https://github.com/foo/bar",
        project_socials: "@foo",
        notes: "hi",
      },
    });
  });
});

describe("validateInterest — later", () => {
  it("accepts an empty form", () => {
    expect(validateInterest({}, "later")).toEqual({
      ok: true,
      values: {
        has_project: null,
        looking_for_team: null,
        project_name: null,
        one_liner: null,
        stage: null,
        team_size: null,
        project_url: null,
        project_socials: null,
        notes: null,
      },
    });
  });

  it("keeps partial answers", () => {
    expect(validateInterest({ has_project: "yes", project_name: "Foo" }, "later")).toMatchObject({
      ok: true,
      values: { has_project: "yes", looking_for_team: null, project_name: "Foo", one_liner: null },
    });
  });

  it("drops project fields when has_project is not yes", () => {
    expect(validateInterest({ has_project: "no_want_team", project_name: "Foo", stage: "mvp" }, "later")).toMatchObject({
      ok: true,
      values: { project_name: null, stage: null },
    });
  });
});

describe("validateInterest — shape checks in both intents", () => {
  it.each(["complete", "later"] as const)("rejects unknown enum values (%s)", (intent) => {
    expect(validateInterest({ has_project: "maybe" }, intent)).toMatchObject({ ok: false, field: "has_project" });
    expect(validateInterest({ has_project: "yes", stage: "unicorn" }, intent)).toMatchObject({
      ok: false,
      field: "stage",
    });
  });

  it.each(["complete", "later"] as const)("rejects a team size outside 1–20 (%s)", (intent) => {
    expect(validateInterest({ has_project: "yes", team_size: "0" }, intent)).toMatchObject({ ok: false, field: "team_size" });
    expect(validateInterest({ has_project: "yes", team_size: "21" }, intent)).toMatchObject({ ok: false, field: "team_size" });
    expect(validateInterest({ has_project: "yes", team_size: "2.5" }, intent)).toMatchObject({ ok: false, field: "team_size" });
  });

  it.each(["complete", "later"] as const)("rejects an unsafe project url (%s)", (intent) => {
    expect(validateInterest({ has_project: "yes", project_url: "javascript:alert(1)" }, intent)).toMatchObject({
      ok: false,
      field: "project_url",
    });
  });
});
