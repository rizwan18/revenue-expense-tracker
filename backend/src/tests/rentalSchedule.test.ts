import { describe, it, expect } from "vitest";
import { buildRentalSchedule, type ScheduleLineDef, type ScheduleTotalsRow } from "../services/rentalSchedule";

const line = (id: string, name: string, direction: "INCOME" | "EXPENSE", sortOrder: number, isManual = false): ScheduleLineDef => ({
  id: `line-${id}`,
  categoryId: `cat-${id}`,
  name,
  direction,
  isManual,
  sortOrder,
});

const lines: ScheduleLineDef[] = [
  line("rent", "Rental income", "INCOME", 0),
  line("council", "Council rates", "EXPENSE", 1),
  line("capallow", "Capital allowances", "EXPENSE", 2, true),
  line("insurance", "Insurance", "EXPENSE", 3),
  line("interest", "Interest on loans", "EXPENSE", 4),
  line("landtax", "Land tax", "EXPENSE", 5),
  line("agent", "Agent fees", "EXPENSE", 6),
  line("capworks", "Capital works", "EXPENSE", 7, true),
  line("water", "Water charges", "EXPENSE", 8),
];

const row = (id: string, direction: "INCOME" | "EXPENSE", total: number, count = 1): ScheduleTotalsRow => ({
  categoryId: `cat-${id}`,
  direction,
  total,
  count,
});

// The worked example from the rental property schedule.
const example: ScheduleTotalsRow[] = [
  row("rent", "INCOME", 27894, 12),
  row("council", "EXPENSE", 2224.82),
  row("capallow", "EXPENSE", 26),
  row("insurance", "EXPENSE", 1474.22),
  row("interest", "EXPENSE", 15798),
  row("landtax", "EXPENSE", 2055),
  row("agent", "EXPENSE", 2387),
  row("capworks", "EXPENSE", 2578),
  row("water", "EXPENSE", 704),
];

describe("buildRentalSchedule", () => {
  it("reproduces the worked example: total expenses $27,247.04 and net rent $646.96", () => {
    const s = buildRentalSchedule(lines, example, new Map(), 100);
    expect(s.income.total).toBe(27894);
    expect(s.expenses.total).toBe(27247.04);
    expect(s.netRent).toBe(646.96);
    expect(s.yourShare).toBe(646.96);
  });

  it("keeps the user's line order and flags manually calculated lines", () => {
    const s = buildRentalSchedule(lines, example, new Map(), 100);
    expect(s.expenses.lines.map((l) => l.name)).toEqual([
      "Council rates",
      "Capital allowances",
      "Insurance",
      "Interest on loans",
      "Land tax",
      "Agent fees",
      "Capital works",
      "Water charges",
    ]);
    expect(s.expenses.lines.filter((l) => l.isManual).map((l) => l.name)).toEqual(["Capital allowances", "Capital works"]);
  });

  it("shows listed lines with no entries as zero", () => {
    const s = buildRentalSchedule(lines, [row("rent", "INCOME", 1000)], new Map(), 100);
    const council = s.expenses.lines.find((l) => l.name === "Council rates");
    expect(council).toMatchObject({ amount: 0, entryCount: 0, listed: true });
    expect(s.netRent).toBe(1000);
  });

  it("still counts entries in categories that are not on the list, so totals match the dashboard", () => {
    const rows = [...example, { categoryId: "cat-pest", direction: "EXPENSE" as const, total: 120.5, count: 2 }, { categoryId: null, direction: "EXPENSE" as const, total: 30, count: 1 }];
    const s = buildRentalSchedule(lines, rows, new Map([["cat-pest", "Pest control"]]), 100);
    expect(s.expenses.total).toBe(27397.54);
    const extras = s.expenses.lines.filter((l) => !l.listed);
    expect(extras.map((l) => [l.name, l.amount])).toEqual([
      ["Pest control", 120.5],
      ["Uncategorised", 30],
    ]);
    expect(extras.every((l) => l.lineId === null)).toBe(true);
  });

  it("does not count an entry twice when a category has been removed and re-added", () => {
    const only = [line("council", "Council rates", "EXPENSE", 0)];
    const s = buildRentalSchedule(only, [row("council", "EXPENSE", 500, 2)], new Map(), 100);
    expect(s.expenses.lines).toHaveLength(1);
    expect(s.expenses.total).toBe(500);
  });

  it("supports additional custom income lines", () => {
    const withBond = [...lines, line("bond", "Bond retained", "INCOME", 9)];
    const s = buildRentalSchedule(withBond, [...example, row("bond", "INCOME", 400)], new Map(), 100);
    expect(s.income.total).toBe(28294);
    expect(s.income.lines.map((l) => l.name)).toEqual(["Rental income", "Bond retained"]);
    expect(s.netRent).toBe(1046.96);
  });

  it("rounds to cents and applies the ownership percentage to the net figure", () => {
    const s = buildRentalSchedule(lines, [row("rent", "INCOME", 100.1), row("council", "EXPENSE", 0.2)], new Map(), 50);
    expect(s.netRent).toBe(99.9);
    expect(s.yourShare).toBe(49.95);
    expect(s.ownershipPercentage).toBe(50);
  });

  it("reports a rental loss as a negative net rent", () => {
    const s = buildRentalSchedule(lines, [row("rent", "INCOME", 1000), row("interest", "EXPENSE", 1500)], new Map(), 100);
    expect(s.netRent).toBe(-500);
  });
});
