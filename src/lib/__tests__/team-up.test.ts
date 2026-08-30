import { describe, it, expect } from "vitest";
import {
  TEAM_UP_ROLES,
  roleLabel,
  sanitizeRoles,
  isProfileCompleteForTeamUp,
} from "../team-up";

describe("sanitizeRoles", () => {
  it("accepts valid keys and dedupes", () => {
    expect(sanitizeRoles(["frontend", "frontend", "design"])).toEqual([
      "frontend",
      "design",
    ]);
  });
  it("rejects unknown keys", () => {
    expect(sanitizeRoles(["frontend", "wizard"])).toBeNull();
  });
  it("rejects empty and oversized selections", () => {
    expect(sanitizeRoles([])).toBeNull();
    expect(sanitizeRoles(TEAM_UP_ROLES.map((r) => r.key))).toBeNull(); // 8 > 6
  });
  it("rejects non-arrays", () => {
    expect(sanitizeRoles("frontend")).toBeNull();
    expect(sanitizeRoles(null)).toBeNull();
  });
});

describe("roleLabel", () => {
  it("maps keys to pt-BR labels", () => {
    expect(roleLabel("contracts")).toBe("Smart Contracts / Solana");
  });
  it("falls back to the key for unknown values", () => {
    expect(roleLabel("wizard")).toBe("wizard");
  });
});

describe("isProfileCompleteForTeamUp", () => {
  const base = { full_name: "Ana", headline: "Dev", telegram_handle: "@ana" };
  it("requires name, headline and telegram", () => {
    expect(isProfileCompleteForTeamUp(base)).toBe(true);
    expect(isProfileCompleteForTeamUp({ ...base, headline: null })).toBe(false);
    expect(isProfileCompleteForTeamUp({ ...base, telegram_handle: " " })).toBe(false);
    expect(isProfileCompleteForTeamUp(null)).toBe(false);
  });
});
