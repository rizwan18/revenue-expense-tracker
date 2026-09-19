import { describe, it, expect } from "vitest";
import { parseCsv, toCsv, escapeFormula, unescapeFormula } from "../lib/csv";

describe("csv", () => {
  it("round-trips commas, quotes, line breaks and edge whitespace", () => {
    const rows = [
      ["plain", "with,comma", 'with "quotes"', "line\nbreak", " padded ", ""],
      ["ünïcode ✓", "a\r\nb", "", "", "", "end"],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  it("reads CRLF and LF files and ignores a UTF-8 BOM", () => {
    expect(parseCsv("\uFEFFa,b\r\nc,d\r\n")).toEqual([["a", "b"], ["c", "d"]]);
    expect(parseCsv("a,b\nc,d")).toEqual([["a", "b"], ["c", "d"]]);
  });

  it("keeps empty cells and blank lines", () => {
    expect(parseCsv("a,,c\n\nd,e,\n")).toEqual([["a", "", "c"], [""], ["d", "e", ""]]);
  });

  it("handles a quote in the middle of an unquoted cell", () => {
    expect(parseCsv('5" pipe,ok')).toEqual([['5" pipe', "ok"]]);
  });
});

describe("formula protection", () => {
  it("prefixes text that a spreadsheet would run as a formula, and undoes it exactly", () => {
    for (const v of ["=SUM(A1:A9)", "+1", "-Refund", "@cmd", "\tx", "'=already quoted", "normal", "'plain", "", "a=b"]) {
      expect(unescapeFormula(escapeFormula(v))).toBe(v);
    }
    expect(escapeFormula("=1+1")).toBe("'=1+1");
    expect(escapeFormula("normal")).toBe("normal");
  });
});
