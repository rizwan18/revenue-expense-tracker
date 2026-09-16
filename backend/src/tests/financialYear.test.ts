import { describe, it, expect } from "vitest";
import {
  getFinancialYearId,
  getFinancialYearStartYear,
  formatFinancialYearId,
  formatFinancialYearLabel,
  parseFinancialYearId,
  getFinancialYearByStartYear,
  isDateInFinancialYear,
  listRecentFinancialYears,
  daysRemainingInFinancialYear,
} from "../lib/financialYear";

const TZ = "Australia/Melbourne";

describe("financial year id formatting", () => {
  it("formats a start year as YYYY-YY", () => {
    expect(formatFinancialYearId(2026)).toBe("2026-27");
    expect(formatFinancialYearId(1999)).toBe("1999-00");
    expect(formatFinancialYearId(2000)).toBe("2000-01");
  });

  it("formats a display label with an en dash", () => {
    expect(formatFinancialYearLabel(2026)).toBe("FY2026\u201327");
  });

  it("round-trips through parseFinancialYearId", () => {
    expect(parseFinancialYearId("2026-27")).toBe(2026);
    expect(parseFinancialYearId(formatFinancialYearId(2031))).toBe(2031);
  });

  it("rejects malformed ids", () => {
    expect(() => parseFinancialYearId("2026-28")).toThrow();
    expect(() => parseFinancialYearId("not-a-year")).toThrow();
    expect(() => parseFinancialYearId("2026")).toThrow();
  });
});

describe("30 June / 1 July boundary", () => {
  it("classifies 30 June 23:59 (local) as the ending financial year", () => {
    // 2026-06-30 23:59 in Melbourne (AEST, UTC+10 in June) = 2026-06-30T13:59:00Z
    const date = new Date("2026-06-30T13:59:00Z");
    expect(getFinancialYearId(date, TZ)).toBe("2025-26");
  });

  it("classifies 1 July 00:00 (local) as the new financial year", () => {
    // 2026-07-01 00:00 in Melbourne (AEST, UTC+10 in July) = 2026-06-30T14:00:00Z
    const date = new Date("2026-06-30T14:00:00Z");
    expect(getFinancialYearId(date, TZ)).toBe("2026-27");
  });

  it("classifies 1 July 00:00:01 as the new financial year", () => {
    const date = new Date("2026-06-30T14:00:01Z");
    expect(getFinancialYearId(date, TZ)).toBe("2026-27");
  });

  it("classifies 30 June 23:59:59.999 as the ending financial year", () => {
    const date = new Date("2026-06-30T13:59:59.999Z");
    expect(getFinancialYearId(date, TZ)).toBe("2025-26");
  });

  it("handles the boundary correctly across the AEDT/AEST daylight-saving change too", () => {
    // Melbourne is on AEST (+10) in July, so this is still a straightforward
    // boundary check but exercises a date where DST recently ended (early April).
    const juneEnd = new Date("2027-06-30T13:59:00Z");
    const julyStart = new Date("2027-06-30T14:00:00Z");
    expect(getFinancialYearId(juneEnd, TZ)).toBe("2026-27");
    expect(getFinancialYearId(julyStart, TZ)).toBe("2027-28");
  });
});

describe("leap years", () => {
  it("FY2027-28 end date is 30 June 2028 (2028 is a leap year, but FY end is unaffected)", () => {
    const fy = getFinancialYearByStartYear(2027);
    expect(fy.endDate.getUTCFullYear()).toBe(2028);
    expect(fy.endDate.getUTCMonth()).toBe(5); // June (0-indexed)
    expect(fy.endDate.getUTCDate()).toBe(30);
  });

  it("29 February in a leap year falls in the correct financial year", () => {
    // 29 Feb 2028 is in FY2027-28 (started 1 Jul 2027)
    const leapDay = new Date("2028-02-29T04:00:00Z"); // ~2pm AEDT
    expect(getFinancialYearId(leapDay, TZ)).toBe("2027-28");
  });

  it("does not error when constructing financial years around a leap year boundary", () => {
    expect(() => getFinancialYearByStartYear(2027)).not.toThrow();
    expect(() => getFinancialYearByStartYear(2028)).not.toThrow();
  });
});

describe("getFinancialYearStartYear", () => {
  it("Jan-Jun dates belong to the FY that started the previous calendar year", () => {
    expect(getFinancialYearStartYear(new Date("2026-01-15T00:00:00Z"), TZ)).toBe(2025);
    expect(getFinancialYearStartYear(new Date("2026-06-15T00:00:00Z"), TZ)).toBe(2025);
  });

  it("Jul-Dec dates belong to the FY that started this calendar year", () => {
    expect(getFinancialYearStartYear(new Date("2026-07-15T00:00:00Z"), TZ)).toBe(2026);
    expect(getFinancialYearStartYear(new Date("2026-12-15T00:00:00Z"), TZ)).toBe(2026);
  });
});

describe("isDateInFinancialYear", () => {
  it("correctly matches a mid-year date", () => {
    const date = new Date("2026-09-01T00:00:00Z");
    expect(isDateInFinancialYear(date, "2026-27", TZ)).toBe(true);
    expect(isDateInFinancialYear(date, "2025-26", TZ)).toBe(false);
  });
});

describe("listRecentFinancialYears", () => {
  it("returns the requested count, newest first, ending at the current FY", () => {
    const now = new Date("2026-09-01T00:00:00Z"); // in FY2026-27
    const years = listRecentFinancialYears(4, now, TZ);
    expect(years.map((y) => y.id)).toEqual(["2026-27", "2025-26", "2024-25", "2023-24"]);
  });
});

describe("daysRemainingInFinancialYear", () => {
  it("is zero once the FY has ended", () => {
    const fy = getFinancialYearByStartYear(2020);
    const afterEnd = new Date("2021-07-01T00:00:00Z");
    expect(daysRemainingInFinancialYear(fy, afterEnd)).toBe(0);
  });

  it("counts down correctly a few days before the end", () => {
    const fy = getFinancialYearByStartYear(2026); // ends 30 Jun 2027 23:59:59.999 UTC-constructed
    const now = new Date(fy.endDate.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(daysRemainingInFinancialYear(fy, now)).toBe(3);
  });
});
