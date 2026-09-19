import { prisma } from "./prisma";

/** How many days ahead the reminder is meant to nudge you (informational; shown on the reminder). */
export const EXPENSE_REMINDER_DAYS_BEFORE = 7;

/** An expense is "forward dated" when its date is still in the future. */
export function isForwardDatedExpense(direction: string, date: Date, now: Date = new Date()): boolean {
  return direction === "EXPENSE" && date.getTime() > now.getTime();
}

export function expenseReminderTitle(description: string): string {
  return `${description.trim()} due`;
}

/**
 * Keep the reminder for one transaction in step with the transaction itself:
 * a forward-dated expense gets exactly one reminder (due on the expense's date),
 * and if the entry stops being a forward-dated expense (date moved to the past,
 * changed to income…) the reminder is removed. Deleting the transaction removes
 * its reminder automatically (foreign key cascade).
 */
export async function syncExpenseReminder(tx: { id: string; householdId: string; description: string; direction: string; date: Date }): Promise<void> {
  const existing = await prisma.reminder.findFirst({ where: { transactionId: tx.id } });

  if (!isForwardDatedExpense(tx.direction, tx.date)) {
    if (existing) await prisma.reminder.deleteMany({ where: { transactionId: tx.id } });
    return;
  }

  const title = expenseReminderTitle(tx.description);
  if (existing) {
    const dateChanged = existing.dueDate.getTime() !== tx.date.getTime();
    await prisma.reminder.update({
      where: { id: existing.id },
      // A changed date means the earlier "done"/"snoozed" no longer applies.
      data: { title, dueDate: tx.date, ...(dateChanged ? { status: "PENDING" } : {}) },
    });
    return;
  }

  await prisma.reminder.create({
    data: { householdId: tx.householdId, transactionId: tx.id, title, dueDate: tx.date, daysBefore: EXPENSE_REMINDER_DAYS_BEFORE, status: "PENDING" },
  });
}

/**
 * Forward-dated expenses recorded before this feature existed have no reminder
 * yet. Create the missing ones (dismissed reminders still exist, so they are
 * not brought back).
 */
export async function backfillExpenseReminders(householdId: string): Promise<void> {
  const missing = await prisma.transaction.findMany({
    where: { householdId, direction: "EXPENSE", date: { gt: new Date() }, reminders: { none: {} } },
    select: { id: true, description: true, date: true },
    take: 200,
  });
  if (missing.length === 0) return;
  await prisma.reminder.createMany({
    data: missing.map((t: { id: string; description: string; date: Date }) => ({
      householdId,
      transactionId: t.id,
      title: expenseReminderTitle(t.description),
      dueDate: t.date,
      daysBefore: EXPENSE_REMINDER_DAYS_BEFORE,
      status: "PENDING",
    })),
  });
}
