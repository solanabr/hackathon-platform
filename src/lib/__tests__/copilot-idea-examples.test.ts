import { describe, expect, it } from "vitest";
import { IDEA_EXAMPLES, ideaAgentPrompt } from "@/lib/copilot/idea-examples";

describe("copilot idea examples", () => {
  it("has unique ids", () => {
    expect(new Set(IDEA_EXAMPLES.map((i) => i.id)).size).toBe(IDEA_EXAMPLES.length);
  });

  it("fills the pitch, the differential and the risk on every card", () => {
    for (const idea of IDEA_EXAMPLES) {
      expect(idea.pitch.trim(), idea.id).not.toBe("");
      expect(idea.edge.trim(), idea.id).not.toBe("");
      expect(idea.risk.trim(), idea.id).not.toBe("");
    }
  });

  it("leaves effort and inspiration empty only for house ideas", () => {
    for (const idea of IDEA_EXAMPLES) {
      expect(idea.effort === null, idea.id).toBe(idea.status === "house");
      expect(idea.inspiration === null, idea.id).toBe(idea.status === "house");
    }
  });

  it("builds an agent prompt around the pitch", () => {
    const prompt = ideaAgentPrompt(IDEA_EXAMPLES[0]);
    expect(prompt).toContain(IDEA_EXAMPLES[0].pitch);
    expect(prompt).toContain("avaliação honesta");
    expect(prompt.startsWith("Use o Colosseum Copilot")).toBe(true);
  });
});
