export const MARKER_NAMES = ["phases", "schedule"] as const;

export type MarkerName = (typeof MARKER_NAMES)[number];

export type DocSegment =
  | { type: "prose"; md: string }
  | { type: "marker"; name: MarkerName };

export type OutlineEntry = { id: string; text: string };

function isMarkerName(s: string): s is MarkerName {
  return (MARKER_NAMES as readonly string[]).includes(s);
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
 * Splits the document into prose runs and section markers. A marker line
 * reads ```phases``` (a bare ```phases fence also counts; its body is
 * ignored — markers carry no content, the data comes from the edition).
 * Any other fence is ordinary markdown and stays in the prose.
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

    const inline = line.match(/^```(\w+)```\s*$/);
    if (inline && isMarkerName(inline[1])) {
      flushProse();
      segments.push({ type: "marker", name: inline[1] });
      i += 1;
      continue;
    }

    const fence = line.match(/^```(\w+)\s*$/);
    if (fence && isMarkerName(fence[1])) {
      let j = i + 1;
      while (j < lines.length && !/^```\s*$/.test(lines[j])) j += 1;
      flushProse();
      segments.push({ type: "marker", name: fence[1] });
      i = j + 1;
      continue;
    }

    prose.push(line);
    i += 1;
  }
  flushProse();
  return segments;
}

/** The ## headings of the document, in order, for the outline sidebar.
 *  Lines inside fenced code blocks don't count. */
export function extractOutline(md: string): OutlineEntry[] {
  const entries: OutlineEntry[] = [];
  let inFence = false;
  for (const line of md.split("\n")) {
    // A single-line marker (```phases```) opens and closes on the same line.
    if (/^```\w+```\s*$/.test(line)) continue;
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
