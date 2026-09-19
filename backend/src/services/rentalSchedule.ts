/**
 * Rental income & expenses schedule for one property and one financial year.
 *
 * Pure functions only (no database access) so the arithmetic is easy to test.
 * Every transaction recorded against the property counts towards the totals —
 * lines the user has removed from their list still show up (as "not on your
 * list") while they hold entries, so the schedule always agrees with the
 * dashboard and reports.
 */

export type ScheduleDirection = "INCOME" | "EXPENSE";

export interface ScheduleLineDef {
  id: string;
  categoryId: string;
  name: string;
  direction: ScheduleDirection;
  isManual: boolean;
  sortOrder: number;
}

/** Transactions for the property + year, grouped by category and direction. */
export interface ScheduleTotalsRow {
  categoryId: string | null;
  direction: ScheduleDirection;
  total: number;
  count: number;
}

export interface ScheduleLine {
  /** null for categories that have entries but aren't on the user's list. */
  lineId: string | null;
  categoryId: string | null;
  name: string;
  isManual: boolean;
  amount: number;
  entryCount: number;
  listed: boolean;
}

export interface RentalSchedule {
  income: { lines: ScheduleLine[]; total: number };
  expenses: { lines: ScheduleLine[]; total: number };
  netRent: number;
  ownershipPercentage: number;
  /** Net rent multiplied by the ownership percentage (informational). */
  yourShare: number;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function section(
  direction: ScheduleDirection,
  lines: ScheduleLineDef[],
  rows: ScheduleTotalsRow[],
  categoryNames: Map<string, string>
): { lines: ScheduleLine[]; total: number } {
  const dirRows = rows.filter((r) => r.direction === direction);
  const listedCategoryIds = new Set(lines.filter((l) => l.direction === direction).map((l) => l.categoryId));

  const listed: ScheduleLine[] = lines
    .filter((l) => l.direction === direction)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((l) => {
      const match = dirRows.filter((r) => r.categoryId === l.categoryId);
      return {
        lineId: l.id,
        categoryId: l.categoryId,
        name: l.name,
        isManual: l.isManual,
        amount: round2(match.reduce((sum, r) => sum + r.total, 0)),
        entryCount: match.reduce((sum, r) => sum + r.count, 0),
        listed: true,
      };
    });

  const unlisted: ScheduleLine[] = dirRows
    .filter((r) => r.categoryId === null || !listedCategoryIds.has(r.categoryId))
    .map((r) => ({
      lineId: null,
      categoryId: r.categoryId,
      name: r.categoryId ? categoryNames.get(r.categoryId) ?? "Other" : "Uncategorised",
      isManual: false,
      amount: round2(r.total),
      entryCount: r.count,
      listed: false,
    }))
    .sort((a, b) => b.amount - a.amount);

  const total = round2([...listed, ...unlisted].reduce((sum, l) => sum + l.amount, 0));
  return { lines: [...listed, ...unlisted], total };
}

export function buildRentalSchedule(
  lines: ScheduleLineDef[],
  rows: ScheduleTotalsRow[],
  categoryNames: Map<string, string>,
  ownershipPercentage: number
): RentalSchedule {
  const income = section("INCOME", lines, rows, categoryNames);
  const expenses = section("EXPENSE", lines, rows, categoryNames);
  const netRent = round2(income.total - expenses.total);
  return {
    income,
    expenses,
    netRent,
    ownershipPercentage,
    yourShare: round2((netRent * ownershipPercentage) / 100),
  };
}
