import { describe, it, expect } from "vitest";
import {
  cacheKeyFor, normalizeIdea, mapProject, crowdednessLine, agentPrompt,
} from "@/lib/copilot/helpers";
import type { ApiProject } from "@/lib/copilot/types";

const apiProject: ApiProject = {
  slug: "agent-cred", name: "Agent-Cred",
  oneLiner: "Autonomous payment infrastructure on Solana for AI agents.",
  similarity: 0.0635,
  hackathon: { name: "Cypherpunk", slug: "cypherpunk", startDate: "2025-09-25" },
  tracks: [{ name: "DeFi", key: "cypherpunk/defi" }, { name: "Infrastructure", key: "cypherpunk/infrastructure" }],
  links: { github: "https://github.com/x/y", demo: null, presentation: null, technicalDemo: null, twitter: null, colosseum: "https://colosseum.com/projects/explore/agent-cred" },
  evidence: ["one", "two", "three"],
  prize: null, accelerator: null, metrics: { updatesCount: 0 }, team: { count: 2 },
  tags: { problemTags: [], solutionTags: [], primitives: [], techStack: [], targetUsers: [] },
  crowdedness: 325, cluster: { key: "v1-c14", label: "Solana AI Agent Infrastructure" },
};

describe("cacheKeyFor", () => {
  it("normalizes case, whitespace and array order", () => {
    const a = cacheKeyFor({ query: "  Agent Payments ", hackathons: ["radar", "breakout"] });
    const b = cacheKeyFor({ query: "agent payments", hackathons: ["breakout", "radar"] });
    expect(a).toBe(b);
  });
  it("differs when a filter differs", () => {
    expect(cacheKeyFor({ query: "x" })).not.toBe(cacheKeyFor({ query: "x", winnersOnly: true }));
  });
});

describe("normalizeIdea", () => {
  it("accepts 8 to 300 trimmed chars", () => {
    expect(normalizeIdea("  pagamentos para agentes  ")).toBe("pagamentos para agentes");
    expect(normalizeIdea("curto")).toBeNull();
    expect(normalizeIdea("a".repeat(301))).toBeNull();
    expect(normalizeIdea(42)).toBeNull();
  });
});

describe("mapProject", () => {
  it("keeps only what the card renders and derives year and flags", () => {
    const card = mapProject(apiProject);
    expect(card.hackathon.year).toBe(2025);
    expect(card.tracks).toEqual(["DeFi", "Infrastructure"]);
    expect(card.isWinner).toBe(false);
    expect(card.inAccelerator).toBe(false);
    expect(card.evidence).toEqual(["one", "two"]);
    expect(card.links).toEqual({ github: "https://github.com/x/y", demo: null, colosseum: "https://colosseum.com/projects/explore/agent-cred" });
    expect(Object.keys(card)).not.toContain("tags");
  });
  it("flags winners and accelerator teams", () => {
    const card = mapProject({ ...apiProject, prize: { placement: 1 }, accelerator: { batch: "x" } });
    expect(card.isWinner).toBe(true);
    expect(card.inAccelerator).toBe(true);
  });
});

describe("crowdednessLine", () => {
  it("writes the pt-BR sentence", () => {
    expect(crowdednessLine({ key: "v1-c14", label: "Solana AI Agent Infrastructure", projectCount: 325, winnerCount: 12 }))
      .toBe("325 projetos já construíram nessa área (Solana AI Agent Infrastructure) e 12 venceram prêmios.");
  });
  it("handles one and zero", () => {
    expect(crowdednessLine({ key: "k", label: "L", projectCount: 1, winnerCount: 0 }))
      .toBe("1 projeto já construiu nessa área (L) e nenhum venceu prêmio.");
    expect(crowdednessLine(null)).toBeNull();
  });
});

describe("agentPrompt", () => {
  it("embeds the idea", () => {
    expect(agentPrompt("um marketplace de energia")).toContain("Quero construir um marketplace de energia.");
  });
});
