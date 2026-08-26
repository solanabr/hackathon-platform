import { describe, expect, it } from "vitest";
import {
  parsePageDoc,
  extractOutline,
  parseBlockBody,
  slugifyHeading,
} from "../page-doc";

describe("slugifyHeading", () => {
  it("strips accents and punctuation", () => {
    expect(slugifyHeading("Como o hackathon acontece")).toBe("como-o-hackathon-acontece");
    expect(slugifyHeading("Programação da Fase 1")).toBe("programacao-da-fase-1");
    expect(slugifyHeading("Premiação")).toBe("premiacao");
    expect(slugifyHeading("  O que seu time entrega!  ")).toBe("o-que-seu-time-entrega");
  });
});

describe("parsePageDoc", () => {
  it("splits prose and blocks preserving order", () => {
    const doc = [
      "## Como acontece",
      "Duas fases.",
      "",
      "```phases```",
      "",
      "## Premiação",
      "```prizes```",
    ].join("\n");
    expect(parsePageDoc(doc)).toEqual([
      { type: "prose", md: "## Como acontece\nDuas fases." },
      { type: "block", name: "phases", body: "" },
      { type: "prose", md: "## Premiação" },
      { type: "block", name: "prizes", body: "" },
    ]);
  });

  it("keeps JSON body of a multi-line block", () => {
    const doc = ["```deliverables", '[{"value":"10"}]', "```"].join("\n");
    expect(parsePageDoc(doc)).toEqual([
      { type: "block", name: "deliverables", body: '[{"value":"10"}]' },
    ]);
  });

  it("accepts multi-line fences with empty body", () => {
    const doc = ["```schedule", "```"].join("\n");
    expect(parsePageDoc(doc)).toEqual([{ type: "block", name: "schedule", body: "" }]);
  });

  it("leaves unknown fences inside prose", () => {
    const doc = ["Texto.", "```js", "const x = 1;", "```"].join("\n");
    expect(parsePageDoc(doc)).toEqual([
      { type: "prose", md: "Texto.\n```js\nconst x = 1;\n```" },
    ]);
  });

  it("an unclosed block swallows the rest of the document", () => {
    const doc = ["```deliverables", '[{"a":1}]'].join("\n");
    expect(parsePageDoc(doc)).toEqual([
      { type: "block", name: "deliverables", body: '[{"a":1}]' },
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
});

describe("parseBlockBody", () => {
  it("parses valid JSON and rejects the rest", () => {
    expect(parseBlockBody('[{"a":1}]')).toEqual([{ a: 1 }]);
    expect(parseBlockBody("")).toBeNull();
    expect(parseBlockBody("not json")).toBeNull();
  });
});
