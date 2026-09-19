import { unescapeFormula } from "../../lib/csv";
import { SECTION_LABELS, type SectionName } from "./sections";
import type { ParsedRow } from "./parseExport";

/** Accepts ISO dates/times and the day/month/year form spreadsheets like to rewrite dates into. */
export function parseDateCell(value: string): Date | null {
  const s = value.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}([T ].*)?$/.test(s)) {
    const dt = new Date(s.includes(" ") && !s.includes("T") ? s.replace(" ", "T") : s);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    const dt = new Date(Date.UTC(year, month - 1, day));
    return dt.getUTCFullYear() === year && dt.getUTCMonth() === month - 1 && dt.getUTCDate() === day ? dt : null;
  }
  return null;
}

export function parseNumberCell(value: string): number | null {
  const s = value.replace(/[$,\s]/g, "");
  if (s === "") return null;
  const num = Number(s);
  return Number.isFinite(num) ? num : null;
}

/** Every cell except the id, joined — gives an id-less row a stable identity. */
export function contentKeyOf(cells: Record<string, string>): string {
  return Object.entries(cells)
    .filter(([k]) => k !== "id")
    .map(([, v]) => v)
    .join("\u001f");
}

/**
 * Typed access to one row. Problems (a bad number, a missing required value…)
 * are recorded and mark the row as failed, so the row is skipped and reported
 * instead of being imported wrongly.
 */
export class RowReader {
  failed = false;

  constructor(
    readonly section: SectionName,
    private readonly parsed: ParsedRow,
    private readonly errors: string[]
  ) {}

  get rowNo(): number {
    return this.parsed.row;
  }

  raw(name: string): string {
    return this.parsed.cells[name] ?? "";
  }

  contentKey(): string {
    return contentKeyOf(this.parsed.cells);
  }

  fail(message: string): void {
    this.failed = true;
    this.errors.push(`${SECTION_LABELS[this.section]}, row ${this.rowNo}: ${message}`);
  }

  str(name: string, max = 2000): string | null {
    const v = unescapeFormula(this.raw(name)).trim();
    if (v === "") return null;
    if (v.length > max) {
      this.fail(`“${name}” is too long (over ${max} characters).`);
      return null;
    }
    return v;
  }

  requiredStr(name: string, max = 500): string | null {
    const v = this.str(name, max);
    if (v === null && !this.failed) this.fail(`“${name}” is required.`);
    return v;
  }

  num(name: string, opts: { required?: boolean; min?: number; max?: number } = {}): number | null {
    const v = this.raw(name).trim();
    if (v === "") {
      if (opts.required) this.fail(`“${name}” is required.`);
      return null;
    }
    const num = parseNumberCell(v);
    if (num === null) {
      this.fail(`“${name}” should be a number, but is “${v}”.`);
      return null;
    }
    if (opts.min !== undefined && num < opts.min) this.fail(`“${name}” must be at least ${opts.min}.`);
    if (opts.max !== undefined && num > opts.max) this.fail(`“${name}” must be at most ${opts.max}.`);
    return num;
  }

  int(name: string, opts: { required?: boolean; min?: number; max?: number } = {}): number | null {
    const num = this.num(name, opts);
    if (num !== null && !Number.isInteger(num)) {
      this.fail(`“${name}” should be a whole number, but is “${this.raw(name).trim()}”.`);
      return null;
    }
    return num;
  }

  bool(name: string, fallback = false): boolean {
    const v = this.raw(name).trim().toLowerCase();
    if (v === "") return fallback;
    if (["true", "yes", "y", "1"].includes(v)) return true;
    if (["false", "no", "n", "0"].includes(v)) return false;
    this.fail(`“${name}” should be true or false, but is “${this.raw(name).trim()}”.`);
    return fallback;
  }

  date(name: string, required = false): Date | null {
    const v = this.raw(name).trim();
    if (v === "") {
      if (required) this.fail(`“${name}” is required.`);
      return null;
    }
    const dt = parseDateCell(v);
    if (!dt) this.fail(`“${name}” isn't a date I can read (“${v}”). Use a form like 2026-09-19 or 19/09/2026.`);
    return dt;
  }

  oneOf<T extends string>(name: string, allowed: readonly T[], opts: { required?: boolean; fallback?: T } = {}): T | null {
    const v = this.raw(name).trim().toUpperCase().replace(/[\s-]+/g, "_");
    if (v === "") {
      if (opts.required && opts.fallback === undefined) this.fail(`“${name}” is required.`);
      return opts.fallback ?? null;
    }
    const match = allowed.find((a) => a === v);
    if (!match) {
      this.fail(`“${name}” must be one of ${allowed.join(", ")}, but is “${this.raw(name).trim()}”.`);
      return null;
    }
    return match;
  }
}
