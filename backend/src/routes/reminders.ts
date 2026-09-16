import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { asyncHandler, FriendlyError } from "../middleware/errorHandler";

const router = Router();
router.use(requireAuth);

function householdOf(req: AuthedRequest): string {
  if (!req.householdId) throw new FriendlyError("Please finish setting up your household first.", 400);
  return req.householdId;
}

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const { status } = req.query as Record<string, string>;
    const reminders = await prisma.reminder.findMany({
      where: { householdId, status: status ? status : { not: "DISABLED" } },
      orderBy: { dueDate: "asc" },
      include: { bill: { include: { property: true } } },
    });
    res.json(reminders);
  })
);

router.post(
  "/:id/snooze",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const existing = await prisma.reminder.findFirst({ where: { id: req.params.id, householdId } });
    if (!existing) throw new FriendlyError("We couldn't find this reminder.", 404);
    const { days = 3 } = req.body as { days?: number };
    const newDate = new Date(existing.dueDate);
    newDate.setDate(newDate.getDate() + days);
    const reminder = await prisma.reminder.update({ where: { id: existing.id }, data: { dueDate: newDate, status: "SNOOZED" } });
    res.json(reminder);
  })
);

router.post(
  "/:id/complete",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const existing = await prisma.reminder.findFirst({ where: { id: req.params.id, householdId } });
    if (!existing) throw new FriendlyError("We couldn't find this reminder.", 404);
    const reminder = await prisma.reminder.update({ where: { id: existing.id }, data: { status: "COMPLETE" } });
    res.json(reminder);
  })
);

router.post(
  "/:id/disable",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const existing = await prisma.reminder.findFirst({ where: { id: req.params.id, householdId } });
    if (!existing) throw new FriendlyError("We couldn't find this reminder.", 404);
    const reminder = await prisma.reminder.update({ where: { id: existing.id }, data: { status: "DISABLED" } });
    res.json(reminder);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const existing = await prisma.reminder.findFirst({ where: { id: req.params.id, householdId } });
    if (!existing) throw new FriendlyError("We couldn't find this reminder.", 404);
    const { dueDate } = req.body as { dueDate?: string };
    const reminder = await prisma.reminder.update({
      where: { id: existing.id },
      data: { ...(dueDate ? { dueDate: new Date(dueDate) } : {}) },
    });
    res.json(reminder);
  })
);

export default router;
