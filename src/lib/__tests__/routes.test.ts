import { describe, it, expect } from "vitest";
import { isPublicRoute } from "../routes";

describe("isPublicRoute", () => {
  it("treats the bare edition landing as public", () => {
    expect(isPublicRoute("/h/solana-cursor-passo-fundo-2026")).toBe(true);
  });

  it("gates everything nested under an edition", () => {
    expect(isPublicRoute("/h/solana-cursor-passo-fundo-2026/conteudos")).toBe(false);
    expect(isPublicRoute("/h/solana-cursor-passo-fundo-2026/inscricao")).toBe(false);
    expect(isPublicRoute("/h/solana-cursor-passo-fundo-2026/painel")).toBe(false);
  });

  it("gates deeper edition paths", () => {
    expect(isPublicRoute("/h/a/b")).toBe(false);
  });

  it("keeps auth and cron routes public", () => {
    expect(isPublicRoute("/auth")).toBe(true);
    expect(isPublicRoute("/auth/callback")).toBe(true);
    expect(isPublicRoute("/api/cron/lock-submissions")).toBe(true);
  });

  it("gates everything else", () => {
    expect(isPublicRoute("/")).toBe(true);
    expect(isPublicRoute("/admin")).toBe(false);
    expect(isPublicRoute("/conta")).toBe(false);
  });
});