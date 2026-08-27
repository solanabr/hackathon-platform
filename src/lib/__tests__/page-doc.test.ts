import { WEEKDAY_SHORT } from "../dates";
import { describe, expect, it } from "vitest";
import {
  classifyTable,
  docCellHasTime,
  extractOutline,
  slugifyHeading,
  nextDateIndex,
  resolveDocDate,
  splitSections,
  type TableBlock,
} from "../page-doc";

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

describe("splitSections", () => {
  it("groups prose and tables under their heading", () => {
    const doc = [
      "## Premiação",
      "",
      "Quem ganha o quê.",
      "",
      "| Colocação | Prêmio |",
      "| --- | --- |",
      "| 1º Lugar | US$ 1.500 |",
      "| 2º Lugar | US$ 900 |",
    ].join("\n");

    expect(splitSections(doc)).toEqual([
      {
        id: "premiacao",
        heading: "Premiação",
        blocks: [
          { kind: "markdown", md: "Quem ganha o quê." },
          {
            kind: "table",
            headers: ["Colocação", "Prêmio"],
            rows: [
              ["1º Lugar", "US$ 1.500"],
              ["2º Lugar", "US$ 900"],
            ],
          },
        ],
      },
    ]);
  });

  it("keeps prose before the first heading", () => {
    const sections = splitSections("Intro solta.\n\n## Depois\n\ncorpo");
    expect(sections).toHaveLength(2);
    expect(sections[0].heading).toBeNull();
    expect(sections[0].blocks).toEqual([{ kind: "markdown", md: "Intro solta." }]);
  });

  it("leaves pipes inside fenced code alone", () => {
    const doc = ["## Código", "", "```", "| não | é | tabela |", "| --- | --- | --- |", "```"].join("\n");
    const blocks = splitSections(doc)[0].blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("markdown");
  });

  it("handles an escaped pipe inside a cell", () => {
    const doc = ["| A | B |", "| --- | --- |", "| um \\| dois | tres |"].join("\n");
    const table = splitSections(doc)[0].blocks[0];
    expect(table).toEqual({
      kind: "table",
      headers: ["A", "B"],
      rows: [["um | dois", "tres"]],
    });
  });
});

describe("classifyTable", () => {
  const table = (headers: string[], rows: string[][]): TableBlock => ({
    kind: "table",
    headers,
    rows,
  });

  it("reads the four tables of the live edition", () => {
    expect(
      classifyTable(
        table(
          ["Fase", "Quando", "O que acontece"],
          [
            ["Fase 1 · capacitação", "31/08 a 04/09", "Minicursos."],
            ["Desenvolvimento e submissão", "05/09 a 09/09, 12h", "Mentoria no dia 5."],
            ["Seleção", "10/09", "Anúncio por e-mail."],
            ["Fase 2 · presencial", "12/09", "Pitch Day."],
          ],
        ),
      ),
    ).toBe("timeline");

    expect(
      classifyTable(
        table(
          ["Data", "Encontro"],
          [
            ["31/08, 19h", "Abertura do hackathon"],
            ["05/09", "Mentorias 1:1"],
          ],
        ),
      ),
    ).toBe("agenda");

    expect(
      classifyTable(
        table(
          ["Entregável", "Limite", "Observação"],
          [
            ["Pitch deck", "10 slides", "Passou do limite, desclassifica."],
            ["Vídeo demo", "3 minutos", "Mostre funcionando."],
            ["Código no GitHub", "1 repositório", "Pode ser privado."],
          ],
        ),
      ),
    ).toBe("cards");

    expect(
      classifyTable(
        table(
          ["Colocação", "Prêmio"],
          [
            ["1º Lugar", "US$1500"],
            ["2º Lugar", "US$900"],
            ["3º Lugar", "US$450"],
            ["Menção Honrosa", "US$150"],
          ],
        ),
      ),
    ).toBe("podium");
  });

  it("ignores the wording — only the shape decides", () => {
    expect(
      classifyTable(
        table(
          ["Posição", "O que leva"],
          [
            ["1º", "Muito"],
            ["2º", "Menos"],
          ],
        ),
      ),
    ).toBe("podium");
  });

  it("falls back to a plain table for anything unrecognised", () => {
    expect(classifyTable(table(["A", "B", "C", "D"], [["1", "2", "3", "4"]]))).toBe("table");
    expect(classifyTable(table(["Só uma"], [["coluna"]]))).toBe("table");
    expect(classifyTable(table(["A", "B"], []))).toBe("table");
  });

  it("a numbered FAQ is not a podium — the ordinal marker is what makes a rank", () => {
    expect(
      classifyTable(
        table(
          ["#", "Pergunta"],
          [
            ["1", "Qual é o prazo?"],
            ["2", "É presencial?"],
            ["3", "Quantas pessoas por time?"],
          ],
        ),
      ),
    ).toBe("table");
    expect(
      classifyTable(
        table(
          ["Colocação", "Prêmio"],
          [
            ["1º Lugar", "US$ 1.500"],
            ["2º Lugar", "US$ 900"],
            ["Menção Honrosa", "US$ 150"],
          ],
        ),
      ),
    ).toBe("podium");
  });
});

describe("resolveDocDate", () => {
  const anchor = "2026-08-31T09:00:00-03:00";

  it("borrows the year from the edition and keeps the typed weekday", () => {
    const at = resolveDocDate("31/08 19:00", anchor);
    expect(at?.toISOString()).toBe("2026-08-31T22:00:00.000Z");
    expect(WEEKDAY_SHORT.format(at!)).toMatch(/seg/i);
  });

  it("accepts 19h as well as 19:00, and defaults to midday", () => {
    expect(resolveDocDate("05/09 19h", anchor)?.toISOString()).toBe("2026-09-05T22:00:00.000Z");
    expect(resolveDocDate("05/09", anchor)?.toISOString()).toBe("2026-09-05T15:00:00.000Z");
  });

  it("rolls into the next year for an edition that crosses New Year", () => {
    const dez = "2026-12-20T09:00:00-03:00";
    expect(resolveDocDate("10/01", dez)?.toISOString()).toBe("2027-01-10T15:00:00.000Z");
    expect(resolveDocDate("28/12", dez)?.toISOString()).toBe("2026-12-28T15:00:00.000Z");
  });

  it("returns null instead of guessing", () => {
    expect(resolveDocDate("em breve", anchor)).toBeNull();
    expect(resolveDocDate("45/13", anchor)).toBeNull();
    expect(resolveDocDate("31/08", "nao é data")).toBeNull();
  });

  it("rejects an impossible day instead of letting the engine roll it over", () => {
    expect(resolveDocDate("31/02", anchor)).toBeNull();
    expect(resolveDocDate("31/09", anchor)).toBeNull();
    expect(resolveDocDate("29/02", "2027-01-10T09:00:00-03:00")).toBeNull();
  });
});

describe("nextDateIndex", () => {
  const anchor = "2026-08-31T09:00:00-03:00";
  const cells = ["31/08 a 04/09", "05/09 a 09/09, 12h", "10/09", "12/09"];

  it("points at the first milestone still ahead", () => {
    expect(nextDateIndex(cells, anchor, new Date("2026-08-27T12:00:00-03:00"))).toBe(0);
    expect(nextDateIndex(cells, anchor, new Date("2026-09-06T12:00:00-03:00"))).toBe(2);
  });

  it("marks nothing once it is all past, or when nothing parses", () => {
    expect(nextDateIndex(cells, anchor, new Date("2026-10-01T12:00:00-03:00"))).toBeNull();
    expect(nextDateIndex(["a definir"], anchor)).toBeNull();
  });
});

describe("classifyTable — schedule", () => {
  const schedule: TableBlock = {
    kind: "table",
    headers: ["Data", "Tipo", "Encontro", "Quem", "Descrição"],
    rows: [
      ["31/08 19:00", "Aula", "Abertura do hackathon", "Matheus Draau", "Regras."],
      ["02/09 19:00", "Aula", "Tema a definir", "Solange", ""],
    ],
  };

  it("reads five dated columns as schedule cards", () => {
    expect(classifyTable(schedule)).toBe("schedule");
  });

  it("still reads two dated columns as the simple agenda", () => {
    expect(
      classifyTable({
        kind: "table",
        headers: ["Data", "Encontro"],
        rows: [["31/08", "Abertura"]],
      }),
    ).toBe("agenda");
  });

  it("leaves four undated columns as a plain table", () => {
    expect(
      classifyTable({
        kind: "table",
        headers: ["A", "B", "C", "D"],
        rows: [["um", "dois", "tres", "quatro"]],
      }),
    ).toBe("table");
  });
});

describe("splitSections — callout", () => {
  it("lifts a blockquote out as its own block", () => {
    const doc = [
      "## O que seu time entrega",
      "",
      "> Entrega até 9 de setembro às 12:00.",
      "",
      "| Entregável | Limite | Observação |",
      "| --- | --- | --- |",
      "| Pitch deck | 10 slides | Curto. |",
    ].join("\n");

    const blocks = splitSections(doc)[0].blocks;
    expect(blocks[0]).toEqual({
      kind: "callout",
      md: "Entrega até 9 de setembro às 12:00.",
    });
    expect(blocks[1].kind).toBe("table");
  });

  it("joins consecutive quoted lines into one callout", () => {
    const blocks = splitSections("> uma linha\n> outra linha").flatMap((s) => s.blocks);
    expect(blocks).toEqual([{ kind: "callout", md: "uma linha\noutra linha" }]);
  });

  it("leaves a quote inside fenced code alone", () => {
    const doc = ["```", "> não é citação", "```"].join("\n");
    const blocks = splitSections(doc).flatMap((s) => s.blocks);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("markdown");
  });

  it("an empty quote produces nothing", () => {
    expect(splitSections(">").flatMap((s) => s.blocks)).toEqual([]);
  });
});

describe("docCellHasTime", () => {
  it("tells a written hour from an assumed one", () => {
    expect(docCellHasTime("31/08 19:00")).toBe(true);
    expect(docCellHasTime("31/08 19h")).toBe(true);
    expect(docCellHasTime("05/09")).toBe(false);
    expect(docCellHasTime("05/09 a 09/09")).toBe(false);
    expect(docCellHasTime("em breve")).toBe(false);
  });
});
