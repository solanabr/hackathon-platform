import { describe, it, expect } from "vitest";
import { isProfileComplete, isRegistrationComplete } from "../registration";
import type { User, HackathonRegistration } from "@/types/db";

describe("completion checks", () => {
  it("needs a full name for the profile to count as complete", () => {
    expect(isProfileComplete({ full_name: null } as User)).toBe(false);
    expect(isProfileComplete({ full_name: "  " } as User)).toBe(false);
    expect(isProfileComplete({ full_name: "Gabriel Thom" } as User)).toBe(true);
  });

  it("treats a missing profile as incomplete", () => {
    expect(isProfileComplete(null)).toBe(false);
  });

  it("needs both Luma confirmation and accepted terms", () => {
    const reg = {
      luma_confirmed_at: "2026-08-20T00:00:00Z",
      terms_accepted_at: null,
    } as HackathonRegistration;
    expect(isRegistrationComplete(reg)).toBe(false);
    expect(
      isRegistrationComplete({ ...reg, terms_accepted_at: "2026-08-20T00:00:00Z" }),
    ).toBe(true);
  });

  it("treats a missing registration as incomplete", () => {
    expect(isRegistrationComplete(null)).toBe(false);
  });
});