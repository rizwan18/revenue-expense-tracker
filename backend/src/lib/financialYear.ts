/**
 * Australian financial year engine.
 *
 * The Australian financial year runs 1 July to 30 June, e.g.
 *   FY2026-27 = 1 Jul 2026 (inclusive) -> 30 Jun 2027 (inclusive)
 *
 * All functions here work in a fixed IANA timezone (default
 * Australia/Melbourne, configurable per household/user) so that a
 * transaction dated "30 June 23:59" and one dated "1 July 00:05" always
 * land in different financial years regardless of the server's local
 * timezone or the UTC offset stored in the database.
 *
 * A financial year is represented as a string "YYYY-YY", e.g. "2026-27",
 * where YYYY is the calendar year the FY *starts* in (1 July).
 */

const DEFAULT_TIMEZONE = "Australia/Melbourne";

export interface FinancialYear {
  /** e.g. "2026-27" */
  id: string;
  /** e.g. "FY2026–27" */
  label: string;
  /** calendar year the FY starts in, e.g. 2026 */
  startYear: number;
  /** start of FY, 1 Jul startYear, 00:00:00 local time */
  startDate: Date;
  /** end of FY, 30 Jun startYear+1, 23:59:59.999 local time */
  endDate: Date;
}

/** Extracts the Y/M/D of `date` as seen in `timeZone`, ignoring the server's local zone. */
function getLocalParts(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/**
 * Given any Date, returns the financial-year start calendar year.
 * If the local calendar date is on/after 1 July, the FY started this
 * calendar year; if it's before 1 July (i.e. Jan-Jun), the FY started
 * the previous calendar year.
 */
export function getFinancialYearStartYear(date: Date, timeZone: string = DEFAULT_TIMEZONE): number {
  const { year, month } = getLocalParts(date, timeZone);
  // month is 1-12. July = 7.
  return month >= 7 ? year : year - 1;
}

/** Formats a start year as the "YYYY-YY" id, e.g. 2026 -> "2026-27". */
export function formatFinancialYearId(startYear: number): string {
  const endYearShort = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endYearShort}`;
}

/** Formats a start year as the display label, e.g. 2026 -> "FY2026–27". */
export function formatFinancialYearLabel(startYear: number): string {
  const endYearShort = String((startYear + 1) % 100).padStart(2, "0");
  return `FY${startYear}\u2013${endYearShort}`; // en dash
}

/** Parses a "YYYY-YY" id back into its start year. Throws on malformed input. */
export function parseFinancialYearId(id: string): number {
  const match = /^(\d{4})-(\d{2})$/.exec(id);
  if (!match) throw new Error(`Invalid financial year id: "${id}"`);
  const startYear = Number(match[1]);
  const expectedEndShort = String((startYear + 1) % 100).padStart(2, "0");
  if (match[2] !== expectedEndShort) {
    throw new Error(`Invalid financial year id (year mismatch): "${id}"`);
  }
  return startYear;
}

/**
 * Builds the full FinancialYear descriptor (id, label, start/end dates) for
 * a given start calendar year. Correctly handles leap years because the end
 * date is always 30 June, which is never a leap-day boundary issue — but we
 * compute it from the Date constructor rather than hardcoding day counts so
 * that any future change here stays correct.
 */
export function getFinancialYearByStartYear(startYear: number): FinancialYear {
  // Construct using UTC noon to avoid any DST-related off-by-one when the
  // Date is later formatted back into a local calendar date.
  const startDate = new Date(Date.UTC(startYear, 6, 1, 0, 0, 0)); // 1 Jul, month index 6
  const endDate = new Date(Date.UTC(startYear + 1, 5, 30, 23, 59, 59, 999)); // 30 Jun next year
  return {
    id: formatFinancialYearId(startYear),
    label: formatFinancialYearLabel(startYear),
    startYear,
    startDate,
    endDate,
  };
}

/** Returns the FinancialYear that `date` falls into. */
export function getFinancialYearForDate(date: Date, timeZone: string = DEFAULT_TIMEZONE): FinancialYear {
  const startYear = getFinancialYearStartYear(date, timeZone);
  return getFinancialYearByStartYear(startYear);
}

/** Convenience: just the "YYYY-YY" id for a date. This is what gets stored on each record. */
export function getFinancialYearId(date: Date, timeZone: string = DEFAULT_TIMEZONE): string {
  return formatFinancialYearId(getFinancialYearStartYear(date, timeZone));
}

/** True if `date` falls within the financial year identified by `fyId`. */
export function isDateInFinancialYear(date: Date, fyId: string, timeZone: string = DEFAULT_TIMEZONE): boolean {
  return getFinancialYearId(date, timeZone) === fyId;
}

/**
 * Lists financial years from `count` years ago through to the current one
 * (inclusive), newest first — handy for a "select financial year" dropdown.
 */
export function listRecentFinancialYears(count = 6, now: Date = new Date(), timeZone: string = DEFAULT_TIMEZONE): FinancialYear[] {
  const currentStartYear = getFinancialYearStartYear(now, timeZone);
  const years: FinancialYear[] = [];
  for (let i = 0; i < count; i++) {
    years.push(getFinancialYearByStartYear(currentStartYear - i));
  }
  return years;
}

/** The financial year that "today" (in the given timezone) falls into. */
export function getCurrentFinancialYear(timeZone: string = DEFAULT_TIMEZONE): FinancialYear {
  return getFinancialYearForDate(new Date(), timeZone);
}

/** Whole days remaining until this financial year ends, from `now`. Never negative. */
export function daysRemainingInFinancialYear(fy: FinancialYear, now: Date = new Date()): number {
  const ms = fy.endDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
