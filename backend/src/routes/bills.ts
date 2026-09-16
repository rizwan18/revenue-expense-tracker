import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { asyncHandler, FriendlyError } from "../middleware/errorHandler";
import { billSchema } from "../lib/validation";
import { nextDueDateAfter } from "../lib/billRecurrence";
import { BillFrequency } from "../lib/constants";

const router = Router();
router.use(requireAuth);

function householdOf(req: AuthedRequest): string {
  if (!req.householdId) throw new FriendlyError("Please finish setting up your household first.", 400);
  return req.householdId;
}

/** Advances a due date forward by one billing cycle. CUSTOM bills are not auto-advanced. */


async function createReminderForBill(householdId: string, billId: string, title: string, dueDate: Date, daysBefore: number) {
  const reminderDate = new Date(dueDate);
  reminderDate.setDate(reminderDate.getDate() - daysBefore);
  await prisma.reminder.create({
    data: { householdId, billId, title, dueDate: reminderDate, daysBefore, status: "PENDING" },
  });
}

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const { status } = req.query as Record<string, string>;
    const now = new Date();

    // Refresh OVERDUE status on read so lists stay accurate without a cron job.
    await prisma.bill.updateMany({
      where: { householdId, status: "UPCOMING", nextDueDate: { lt: now } },
      data: { status: "OVERDUE" },
    });

    const bills = await prisma.bill.findMany({
      where: { householdId, ...(status ? { status } : {}) },
      orderBy: { nextDueDate: "asc" },
      include: { property: true, category: true, account: true },
    });
    res.json(bills);
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const data = billSchema.parse(req.body);
    const bill = await prisma.bill.create({
      data: {
        householdId,
        ...data,
        autoRenew: data.autoRenew ?? false,
        reminderDaysBefore: data.reminderDaysBefore ?? 7,
      },
    });
    await createReminderForBill(householdId, bill.id, `${bill.name} due`, bill.nextDueDate, bill.reminderDaysBefore);
    res.status(201).json(bill);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const existing = await prisma.bill.findFirst({ where: { id: req.params.id, householdId } });
    if (!existing) throw new FriendlyError("We couldn't find this bill.", 404);
    const data = billSchema.partial().parse(req.body);
    const bill = await prisma.bill.update({ where: { id: existing.id }, data });
    res.json(bill);
  })
);

router.post(
  "/:id/mark-paid",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const existing = await prisma.bill.findFirst({ where: { id: req.params.id, householdId } });
    if (!existing) throw new FriendlyError("We couldn't find this bill.", 404);

    if (existing.frequency === "CUSTOM") {
      const bill = await prisma.bill.update({ where: { id: existing.id }, data: { status: "PAID" } });
      return res.json(bill);
    }

    const nextDue = nextDueDateAfter(existing.nextDueDate, existing.frequency as BillFrequency);
    const bill = await prisma.bill.update({
      where: { id: existing.id },
      data: { status: "UPCOMING", nextDueDate: nextDue },
    });
    await createReminderForBill(householdId, bill.id, `${bill.name} due`, nextDue, bill.reminderDaysBefore);
    res.json(bill);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const existing = await prisma.bill.findFirst({ where: { id: req.params.id, householdId } });
    if (!existing) throw new FriendlyError("We couldn't find this bill.", 404);
    await prisma.bill.delete({ where: { id: existing.id } });
    res.json({ message: "Bill removed." });
  })
);

export default router;
