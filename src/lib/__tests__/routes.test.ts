import { describe, it, expect } from "vitest";
import { isPublicRoute } from "../routes";

describe("isPublicRoute", () => {
  it("treats the bare edition landing as public", () => {
    expect(isPublicRoute("/h/solana-cursor-passo-fundo-2026")).toBe(true);
  });

  it("gates everything nested under an edition", () => {
    expect(isPublicRoute("/h/solana-cursor-passo-fundo-2026/content")).toBe(false);
    expect(isPublicRoute("/h/solana-cursor-passo-fundo-2026/register")).toBe(false);
    expect(isPublicRoute("/h/solana-cursor-passo-fundo-2026/dashboard")).toBe(false);
  });

  it("gates deeper edition paths", () => {
    expect(isPublicRoute("/h/a/b")).toBe(false);
  });

  it("keeps auth and cron routes public", () => {
    expect(isPublicRoute("/auth")).toBe(true);
    expect(isPublicRoute("/auth/callback")).toBe(true);
  });

  it("keeps the legal pages public", () => {
    expect(isPublicRoute("/privacidade")).toBe(true);
    expect(isPublicRoute("/termos")).toBe(true);
  });

  it("gates the team-up board", () => {
    expect(isPublicRoute("/h/solana-cursor-passo-fundo-2026/team-up")).toBe(false);
  });

  it("gates everything else", () => {
    expect(isPublicRoute("/")).toBe(true);
    expect(isPublicRoute("/admin")).toBe(false);
    expect(isPublicRoute("/account")).toBe(false);
  });
});
describe("judge routes are gated", () => {
  it("keeps the judge surface behind auth", () => {
    expect(isPublicRoute("/judge")).toBe(false);
    expect(isPublicRoute("/judge/h/solana-cursor-passo-fundo-2026")).toBe(false);
  });
});
describe("public project gallery is public", () => {
  it("lets anon into the gallery and one detail level", () => {
    expect(isPublicRoute("/h/solana-cursor-passo-fundo-2026/projetos")).toBe(true);
    expect(isPublicRoute("/h/solana-cursor-passo-fundo-2026/projetos/abc-123")).toBe(true);
  });

  it("still gates deeper project paths and sibling edition routes", () => {
    expect(isPublicRoute("/h/solana-cursor-passo-fundo-2026/projetos/a/b")).toBe(false);
    expect(isPublicRoute("/h/solana-cursor-passo-fundo-2026/content")).toBe(false);
  });
});
describe("builder profiles are public", () => {
  it("lets anon into a profile by id", () => {
    expect(isPublicRoute("/u/123e4567-e89b-12d3-a456-426614174000")).toBe(true);
  });

  it("gates deeper profile paths", () => {
    expect(isPublicRoute("/u/123/projetos")).toBe(false);
  });
});
