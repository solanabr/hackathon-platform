export type OutlineEntry = { id: string; text: string };

export function slugifyHeading(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The ## headings of the document, in order, for the outline sidebar.
 *  Lines inside fenced code blocks don't count. */
export function extractOutline(md: string): OutlineEntry[] {
  const entries: OutlineEntry[] = [];
  let inFence = false;
  for (const line of md.split("\n")) {
    // A fence that opens and closes on one line toggles nothing.
    if (/^```.*```\s*$/.test(line)) continue;
    if (/^```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence && /^##\s+/.test(line)) {
      const text = line.replace(/^##\s+/, "").trim();
      entries.push({ id: slugifyHeading(text), text });
    }
  }
  return entries;
}

export type TableBlock = { kind: "table"; headers: string[]; rows: string[][] };
export type MarkdownBlock = { kind: "markdown"; md: string };
/** A blockquote — the document's way of saying "this line matters most". */
export type CalloutBlock = { kind: "callout"; md: string };
export type DocBlock = TableBlock | MarkdownBlock | CalloutBlock;
export type DocSection = { id: string; heading: string | null; blocks: DocBlock[] };

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

const isRow = (line: string) => line.trim().startsWith("|");

const isDelimiter = (line: string) => {
  if (!isRow(line)) return false;
  const cells = splitRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
};

/**
 * The document as the renderer needs it: one entry per `##`, its prose kept as
 * markdown and its tables lifted out as data. Tables become data because the
 * layout that suits them is decided from their shape, which needs the cells —
 * everything else stays markdown and is rendered as markdown.
 */
export function splitSections(md: string): DocSection[] {
  const sections: DocSection[] = [];
  let current: DocSection = { id: "", heading: null, blocks: [] };
  let buffer: string[] = [];
  let inFence = false;

  const flushProse = () => {
    const text = buffer.join("\n").trim();
    if (text !== "") current.blocks.push({ kind: "markdown", md: text });
    buffer = [];
  };
  const flushSection = () => {
    flushProse();
    if (current.heading !== null || current.blocks.length > 0) sections.push(current);
  };

  const lines = md.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^```.*```\s*$/.test(line)) {
      buffer.push(line);
      continue;
    }
    if (/^```/.test(line)) {
      inFence = !inFence;
      buffer.push(line);
      continue;
    }

    if (!inFence && /^##\s+/.test(line)) {
      flushSection();
      const heading = line.replace(/^##\s+/, "").trim();
      current = { id: slugifyHeading(heading), heading, blocks: [] };
      continue;
    }

    if (!inFence && /^>\s?/.test(line)) {
      flushProse();
      const quoted: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoted.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      i--;
      const md = quoted.join("\n").trim();
      if (md !== "") current.blocks.push({ kind: "callout", md });
      continue;
    }

    if (!inFence && isRow(line) && i + 1 < lines.length && isDelimiter(lines[i + 1])) {
      flushProse();
      const headers = splitRow(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && isRow(lines[i]) && !isDelimiter(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      i--;
      current.blocks.push({ kind: "table", headers, rows });
      continue;
    }

    buffer.push(line);
  }

  flushSection();
  return sections;
}

export type TableLayout =
  | "podium"
  | "timeline"
  | "agenda"
  | "schedule"
  | "cards"
  | "table";

const RANK = /^\d+\s*[º°o]?(\s|$)|^men[çc][ãa]o/i;
const DATE = /^\d{1,2}\s*\/\s*\d{1,2}/;

const ratio = (cells: string[], re: RegExp) =>
  cells.length === 0 ? 0 : cells.filter((c) => re.test(c.trim())).length / cells.length;

/**
 * Layout is chosen from the table's shape, never from its wording, so renaming
 * a heading or a column never changes the design. Anything unrecognised falls
 * back to "table", which must stay a good-looking default: a future edition
 * writing a table nobody anticipated has to render well, not break.
 */
export function classifyTable(table: TableBlock): TableLayout {
  const cols = table.headers.length;
  const rows = table.rows.filter((r) => r.some((c) => c !== ""));
  if (rows.length === 0) return "table";
  const column = (i: number) => rows.map((r) => r[i] ?? "");

  if (cols >= 4 && ratio(column(0), DATE) >= 0.5) return "schedule";
  if (cols === 2) {
    if (ratio(column(0), RANK) >= 0.75) return "podium";
    if (ratio(column(0), DATE) >= 0.5) return "agenda";
  }
  if (cols === 3) {
    return ratio(column(1), DATE) >= 0.5 ? "timeline" : "cards";
  }
  return "table";
}

/**
 * A cell like "31/08 19:00" resolved against the edition it belongs to. The
 * document writes no year — the anchor supplies it, and a month far behind the
 * anchor's belongs to the next year so an edition crossing New Year still
 * lands. Built at -03:00, the offset Brazil has kept since DST ended, so the
 * weekday a reader sees is the weekday the organizer typed.
 */
export function resolveDocDate(cell: string, anchorIso: string): Date | null {
  const date = cell.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (!date) return null;
  const day = Number(date[1]);
  const month = Number(date[2]);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  const anchor = new Date(anchorIso);
  if (Number.isNaN(anchor.getTime())) return null;

  const rest = cell.slice((date.index ?? 0) + date[0].length);
  const time = rest.match(/(\d{1,2})\s*[:h]\s*(\d{2})?/);
  const hour = time ? Number(time[1]) : 12;
  const minute = time && time[2] ? Number(time[2]) : 0;
  if (hour > 23 || minute > 59) return null;

  const anchorMonth = Number(
    new Intl.DateTimeFormat("en", { month: "numeric", timeZone: "America/Sao_Paulo" }).format(anchor),
  );
  const anchorYear = Number(
    new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "America/Sao_Paulo" }).format(anchor),
  );
  const year = month < anchorMonth - 6 ? anchorYear + 1 : anchorYear;

  const pad = (n: number) => String(n).padStart(2, "0");
  const resolved = new Date(
    `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00-03:00`,
  );
  return Number.isNaN(resolved.getTime()) ? null : resolved;
}

/**
 * Whether the cell named a time at all. resolveDocDate has to pick something
 * for a bare "05/09", so layouts ask this before printing an hour they would
 * otherwise be inventing.
 */
export function docCellHasTime(cell: string): boolean {
  const date = cell.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (!date) return false;
  return /(\d{1,2})\s*[:h]/.test(cell.slice((date.index ?? 0) + date[0].length));
}

/**
 * Index of the row a reader should be looking at: the first one still ahead.
 * Null when nothing parses or the whole thing is past, which the layouts read
 * as "mark nothing" rather than guessing.
 */
export function nextDateIndex(
  cells: string[],
  anchorIso: string,
  now: Date = new Date(),
): number | null {
  const index = cells.findIndex((cell) => {
    const at = resolveDocDate(cell, anchorIso);
    return at !== null && at.getTime() > now.getTime();
  });
  return index === -1 ? null : index;
}
