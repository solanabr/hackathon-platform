import { describe, expect, it } from "vitest";
import { extractOutline, slugifyHeading } from "../page-doc";

describe("slugifyHeading", () => {
  it("strips accents and punctuation", () => {
    expect(slugifyHeading("Como o hackathon acontece")).toBe("como-o-hackathon-acontece");
    expect(slugifyHeading("Programação da Fase 1")).toBe("programacao-da-fase-1");
    expect(slugifyHeading("Premiação")).toBe("premiacao");
    expect(slugifyHeading("  O que seu time entrega!  ")).toBe("o-que-seu-time-entrega");
  });
});

describe("extractOutline", () => {
  it("collects ## headings in order with slug ids", () => {
    const doc = [
      "# Título grande",
      "## Programação da Fase 1",
      "corpo",
      "## Premiação",
      "### sub",
    ].join("\n");
    expect(extractOutline(doc)).toEqual([
      { id: "programacao-da-fase-1", text: "Programação da Fase 1" },
      { id: "premiacao", text: "Premiação" },
    ]);
  });

  it("ignores headings inside fenced code blocks", () => {
    const doc = ["## Real", "```", "## não conta", "```", "## Também real"].join("\n");
    expect(extractOutline(doc)).toEqual([
      { id: "real", text: "Real" },
      { id: "tambem-real", text: "Também real" },
    ]);
  });

  it("a one-line fence toggles nothing", () => {
    const doc = ["## Antes", "```txt```", "## Depois"].join("\n");
    expect(extractOutline(doc)).toEqual([
      { id: "antes", text: "Antes" },
      { id: "depois", text: "Depois" },
    ]);
  });

  it("empty document yields no entries", () => {
    expect(extractOutline("")).toEqual([]);
  });
});
