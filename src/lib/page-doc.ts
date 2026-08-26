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
