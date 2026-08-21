import { describe, it, expect } from "vitest";
import {
  isProfileComplete,
  isRegistrationComplete,
  membersPendingRegistration,
} from "../registration";
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
describe("membersPendingRegistration", () => {
  const confirmed = new Set(["leader"]);

  it("mirrors submit_team: only accepted members block the submission", () => {
    const members = [
      { user_id: "leader", status: "accepted" },
      { user_id: "teammate", status: "accepted" },
      { user_id: "invitee", status: "pending" },
    ];
    expect(membersPendingRegistration(members, confirmed).map((m) => m.user_id)).toEqual([
      "teammate",
    ]);
  });

  it("counts a member with no registration row at all", () => {
    const members = [{ user_id: "added-by-email", status: "accepted" }];
    expect(membersPendingRegistration(members, new Set())).toHaveLength(1);
  });

  it("ignores ghost rows waiting for their first sign-in", () => {
    const members = [{ user_id: null, status: "pending" }];
    expect(membersPendingRegistration(members, confirmed)).toHaveLength(0);
  });

  it("is empty when every accepted member confirmed", () => {
    const members = [{ user_id: "leader", status: "accepted" }];
    expect(membersPendingRegistration(members, confirmed)).toHaveLength(0);
  });
});
