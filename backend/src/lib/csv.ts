/**
 * Small RFC 4180-style CSV reader/writer (quoted cells, doubled quotes,
 * embedded commas and line breaks, CRLF or LF, optional UTF-8 BOM), plus
 * spreadsheet formula-injection protection for text cells.
 */

export function parseCsv(input: string): string[][] {
  const s = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"' && cell === "") {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || (c === "\r" && s[i + 1] !== "\n")) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") {
      cell += c;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) || /^\s|\s$/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

// A text cell that starts with = + - @ (or a tab/CR) can run as a formula when the
// file is opened in Excel/Sheets. Prefix such text with a single quote; the
// importer removes it again, so values round-trip exactly. Numbers are never
// passed through this (a negative amount legitimately starts with "-").
const NEEDS_ESCAPE = /^'?[=+\-@\t\r]/;
const IS_ESCAPED = /^'('?[=+\-@\t\r])/;

export function escapeFormula(value: string): string {
  return NEEDS_ESCAPE.test(value) ? `'${value}` : value;
}

export function unescapeFormula(value: string): string {
  const m = IS_ESCAPED.exec(value);
  return m ? value.slice(1) : value;
}
