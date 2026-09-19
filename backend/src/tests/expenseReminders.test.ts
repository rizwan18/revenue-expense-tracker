import { describe, it, expect } from "vitest";
import { isForwardDatedExpense, expenseReminderTitle } from "../lib/expenseReminders";

const now = new Date("2026-09-19T05:00:00Z");

describe("isForwardDatedExpense", () => {
  it("is true for an expense dated after now", () => {
    expect(isForwardDatedExpense("EXPENSE", new Date("2026-10-01T00:00:00Z"), now)).toBe(true);
    expect(isForwardDatedExpense("EXPENSE", new Date("2026-09-20T00:00:00Z"), now)).toBe(true);
  });

  it("is false for an expense dated today or in the past", () => {
    expect(isForwardDatedExpense("EXPENSE", new Date("2026-09-19T00:00:00Z"), now)).toBe(false);
    expect(isForwardDatedExpense("EXPENSE", new Date("2026-06-30T00:00:00Z"), now)).toBe(false);
  });

  it("is false for income, even when dated in the future", () => {
    expect(isForwardDatedExpense("INCOME", new Date("2026-12-01T00:00:00Z"), now)).toBe(false);
  });
});

describe("expenseReminderTitle", () => {
  it("names the reminder after the expense", () => {
    expect(expenseReminderTitle("Council rates ")).toBe("Council rates due");
  });
});
