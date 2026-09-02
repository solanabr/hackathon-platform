export type CsvCell = string | number | boolean | null | undefined;

/** Excel evaluates cells starting with = + - @ as formulas; a leading quote
 * keeps user-supplied text inert. */
function escapeCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  let text = typeof value === "string" ? value : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

/** RFC 4180 CSV with CRLF line ends and a UTF-8 BOM so Excel reads accents. */
export function toCsv(header: string[], rows: CsvCell[][]): string {
  const lines = [header, ...rows].map((row) => row.map(escapeCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}
