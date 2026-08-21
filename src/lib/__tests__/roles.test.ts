import { describe, it, expect } from "vitest";
import { resolveRoles } from "../roles";
import type { PlatformRole } from "@/types/db";

function role(partial: Partial<PlatformRole>): PlatformRole {
  return {
    id: "r1",
    user_id: "u1",
    role: "judge",
    hackathon_id: null,
    granted_by: null,
    granted_at: "2026-08-20T00:00:00Z",
    ...partial,
  } as PlatformRole;
}

describe("resolveRoles", () => {
  it("treats a global admin row as admin", () => {
    const out = resolveRoles([role({ role: "admin", hackathon_id: null })], "a@b.com");
    expect(out.isAdmin).toBe(true);
  });

  it("treats a global admin row as admin", () => {
    const out = resolveRoles([role({ role: "admin", hackathon_id: null })], "gabriel@superteam.com.br");
    expect(out.isAdmin).toBe(true);
  });

  it("ignores email casing", () => {
    const out = resolveRoles([role({ role: "admin", hackathon_id: null })], "Gabriel@Superteam.com.br");
    expect(out.isAdmin).toBe(true);
  });

  it("does not make a judge an admin", () => {
    const out = resolveRoles([role({ role: "judge", hackathon_id: "h1" })], "j@b.com");
    expect(out.isAdmin).toBe(false);
    expect(out.judgeFor).toEqual(["h1"]);
  });

  it("collects every edition a judge is assigned to", () => {
    const out = resolveRoles(
      [role({ id: "r1", hackathon_id: "h1" }), role({ id: "r2", hackathon_id: "h2" })],
      "j@b.com",
    );
    expect(out.judgeFor.sort()).toEqual(["h1", "h2"]);
  });

  it("returns nothing for an anonymous caller", () => {
    expect(resolveRoles([], null)).toEqual({
      isAdmin: false,
      judgeFor: [],
    });
  });
});