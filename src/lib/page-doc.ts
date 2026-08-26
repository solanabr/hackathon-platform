export const BLOCK_NAMES = [
  "phases",
  "schedule",
  "deliverables",
  "prizes",
  "finalists",
  "partners",
] as const;

export type BlockName = (typeof BLOCK_NAMES)[number];

export type DocSegment =
  | { type: "prose"; md: string }
  | { type: "block"; name: BlockName; body: string };

export type OutlineEntry = { id: string; text: string };

function isBlockName(s: string): s is BlockName {
  return (BLOCK_NAMES as readonly string[]).includes(s);
}

export function slugifyHeading(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Splits an edition document into prose runs and known fenced blocks.
 * Only fences whose info string is a block name are blocks — any other
 * fence (```js, ```txt) stays inside the surrounding prose untouched.
 * An unclosed block fence swallows the rest of the document as its body.
 */
export function parsePageDoc(md: string): DocSegment[] {
  const lines = md.split("\n");
  const segments: DocSegment[] = [];
  let prose: string[] = [];

  function flushProse() {
    const text = prose.join("\n").trim();
    if (text) segments.push({ type: "prose", md: text });
    prose = [];
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Single-line form: ```phases``` opens and closes on one line.
    const inline = line.match(/^```(\w+)```\s*$/);
    if (inline && isBlockName(inline[1])) {
      flushProse();
      segments.push({ type: "block", name: inline[1], body: "" });
      i += 1;
      continue;
    }

    const fence = line.match(/^```(\w+)\s*$/);
    if (fence && isBlockName(fence[1])) {
      const body: string[] = [];
      let j = i + 1;
      while (j < lines.length && !/^```\s*$/.test(lines[j])) {
        body.push(lines[j]);
        j += 1;
      }
      flushProse();
      segments.push({ type: "block", name: fence[1], body: body.join("\n").trim() });
      i = j + 1;
      continue;
    }

    prose.push(line);
    i += 1;
  }
  flushProse();
  return segments;
}

/** The ## headings of the document, in order, for the outline sidebar. */
export function extractOutline(md: string): OutlineEntry[] {
  return parsePageDoc(md)
    .filter((s): s is Extract<DocSegment, { type: "prose" }> => s.type === "prose")
    .flatMap((s) =>
      s.md
        .split("\n")
        .filter((l) => /^##\s+/.test(l))
        .map((l) => {
          const text = l.replace(/^##\s+/, "").trim();
          return { id: slugifyHeading(text), text };
        }),
    );
}

/** Parses a block's optional JSON body; null when absent or invalid. */
export function parseBlockBody<T>(body: string): T | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}
