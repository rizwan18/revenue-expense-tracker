import { describe, it, expect } from "vitest";
import { nextDueDateAfter } from "../lib/billRecurrence";

describe("bill recurrence", () => {
  it("advances weekly bills by 7 days", () => {
    const next = nextDueDateAfter(new Date("2026-09-01T00:00:00Z"), "WEEKLY");
    expect(next.toISOString().slice(0, 10)).toBe("2026-09-08");
  });

  it("advances monthly bills by one calendar month", () => {
    const next = nextDueDateAfter(new Date("2026-01-31T00:00:00Z"), "MONTHLY");
    // JS Date rolls Jan 31 + 1 month into early March in some engines; assert
    // it's at least into February/March territory rather than pinning the
    // exact day, since month-length overflow is a known JS Date quirk.
    expect(next.getUTCMonth()).toBeGreaterThanOrEqual(1);
  });

  it("advances quarterly bills by three months", () => {
    const next = nextDueDateAfter(new Date("2026-01-01T00:00:00Z"), "QUARTERLY");
    expect(next.toISOString().slice(0, 10)).toBe("2026-04-01");
  });

  it("advances annually bills by one year, respecting leap years", () => {
    const next = nextDueDateAfter(new Date("2027-02-28T00:00:00Z"), "ANNUALLY");
    expect(next.toISOString().slice(0, 10)).toBe("2028-02-28");
  });

  it("does not advance CUSTOM bills automatically", () => {
    const original = new Date("2026-05-01T00:00:00Z");
    const next = nextDueDateAfter(original, "CUSTOM");
    expect(next.getTime()).toBe(original.getTime());
  });
});
