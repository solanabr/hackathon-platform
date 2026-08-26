import { describe, expect, it } from "vitest";
import { parsePageDoc, extractOutline, slugifyHeading } from "../page-doc";

describe("slugifyHeading", () => {
  it("strips accents and punctuation", () => {
    expect(slugifyHeading("Como o hackathon acontece")).toBe("como-o-hackathon-acontece");
    expect(slugifyHeading("Programação da Fase 1")).toBe("programacao-da-fase-1");
    expect(slugifyHeading("Premiação")).toBe("premiacao");
    expect(slugifyHeading("  O que seu time entrega!  ")).toBe("o-que-seu-time-entrega");
  });
});

describe("parsePageDoc", () => {
  it("splits prose and markers preserving order", () => {
    const doc = [
      "## Como acontece",
      "Duas fases.",
      "",
      "```phases```",
      "",
      "## Programação",
      "```schedule```",
    ].join("\n");
    expect(parsePageDoc(doc)).toEqual([
      { type: "prose", md: "## Como acontece\nDuas fases." },
      { type: "marker", name: "phases" },
      { type: "prose", md: "## Programação" },
      { type: "marker", name: "schedule" },
    ]);
  });

  it("a bare open fence also counts as a marker, body ignored", () => {
    const doc = ["```phases", "ignored", "```", "depois"].join("\n");
    expect(parsePageDoc(doc)).toEqual([
      { type: "marker", name: "phases" },
      { type: "prose", md: "depois" },
    ]);
  });

  it("unknown fences stay inside prose", () => {
    const doc = ["Texto.", "```js", "const x = 1;", "```"].join("\n");
    expect(parsePageDoc(doc)).toEqual([
      { type: "prose", md: "Texto.\n```js\nconst x = 1;\n```" },
    ]);
  });

  it("empty document yields no segments", () => {
    expect(parsePageDoc("")).toEqual([]);
    expect(parsePageDoc("\n\n")).toEqual([]);
  });
});

describe("extractOutline", () => {
  it("collects ## headings in order with slug ids", () => {
    const doc = [
      "# Título grande",
      "## Programação da Fase 1",
      "corpo",
      "```schedule```",
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
});
