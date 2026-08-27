import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EditionPageDoc, type DocContext } from "@/components/edition/page-doc";

const ctx: DocContext = {
  sponsors: { realizacao: [], apoiador: [] },
  finalists: [],
  finalistsVisible: false,
  startsAt: "2026-08-31T09:00:00-03:00",
};

const render = (doc: string) =>
  renderToStaticMarkup(React.createElement(EditionPageDoc, { doc, ctx }));

/** The document as it stands in production (migration 00044), verbatim. */
const LIVE = `## Como o hackathon acontece

Duas fases. A primeira online, a segunda presencial em Passo Fundo, RS.

| Fase | Quando | O que acontece |
| --- | --- | --- |
| Fase 1 · capacitação | 31/08 a 04/09 | Minicursos e conteúdos preparatórios. |
| Desenvolvimento e submissão | 05/09 a 09/09, 12h | Mentoria no dia 5. |
| Seleção | 10/09 | As equipes classificadas são anunciadas por e-mail. |
| Fase 2 · presencial | 12/09 | Pitch Day: apresentação para a banca. |

## Programação

As gravações ficam disponíveis na plataforma depois de cada encontro.

| Data | Encontro |
| --- | --- |
| 31/08, 19h | Abertura do hackathon |
| 05/09 | Mentorias 1:1 |

## O que seu time entrega

Até 9 de setembro às 12:00.

| Entregável | Limite | Observação |
| --- | --- | --- |
| Pitch deck | 10 slides | Quem passar do limite é desclassificado. |

## Premiação

| Colocação | Prêmio |
| --- | --- |
| 1º Lugar | US$1500 |
| 2º Lugar | US$900 |
`;

describe("EditionPageDoc against the live document", () => {
  const html = render(LIVE);

  it("renders every section of the document that is in production today", () => {
    for (const heading of [
      "Como o hackathon acontece",
      "Programação",
      "O que seu time entrega",
      "Premiação",
    ]) {
      expect(html).toContain(heading);
    }
  });

  it("keeps every cell of it — no content is dropped by a layout", () => {
    for (const cell of [
      "Fase 1 · capacitação",
      "As equipes classificadas são anunciadas por e-mail.",
      "Abertura do hackathon",
      "Mentorias 1:1",
      "Pitch deck",
      "10 slides",
      "1º Lugar",
      "US$1500",
      "Até 9 de setembro às 12:00.",
    ]) {
      expect(html).toContain(cell);
    }
  });
});

describe("EditionPageDoc — inline markdown inside cells", () => {
  const table = (cell: string) =>
    render(`## T\n\n| Colocação | Prêmio |\n| --- | --- |\n| 1º Lugar | ${cell} |\n| 2º Lugar | x |`);

  it("still renders bold, links and code written in a cell", () => {
    expect(table("**mil e quinhentos**")).toContain("<strong>mil e quinhentos</strong>");
    expect(table("[regulamento](https://exemplo.com)")).toContain('href="https://exemplo.com"');
    expect(table("`npm run build`")).toContain("<code>npm run build</code>");
  });

  it("passes plain text through untouched — the fast path must not mangle it", () => {
    const html = table("US$ 1.500 + Kit Solana & Cursor");
    expect(html).toContain("US$ 1.500 + Kit Solana &amp; Cursor");
  });
});

describe("EditionPageDoc — degrades instead of breaking", () => {
  it("survives an empty document", () => {
    expect(() => render("")).not.toThrow();
  });

  it("survives a table being typed one character at a time", () => {
    const partial = "## Programação\n\n| Data | Tipo | Encontro | Quem | Descrição |\n| --- | --- | --- | --- | --- |\n| 31/08 19:00 | Aula | Abertura | Draau | Regras. |";
    for (let i = 0; i <= partial.length; i++) {
      expect(() => render(partial.slice(0, i))).not.toThrow();
    }
  });

  it("renders an unrecognised table as a table rather than dropping it", () => {
    const html = render("## X\n\n| a | b | c | d |\n| --- | --- | --- | --- |\n| 1 | 2 | 3 | 4 |");
    expect(html).toContain("<table");
    expect(html).toContain("<th");
    for (const cell of ["1", "2", "3", "4"]) expect(html).toContain(cell);
  });
});
