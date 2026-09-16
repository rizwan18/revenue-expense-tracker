import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { asyncHandler, FriendlyError } from "../middleware/errorHandler";
import { ACCOUNT_TYPES } from "../lib/constants";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const accounts = await prisma.account.findMany({ where: { householdId: req.householdId ?? undefined }, orderBy: { name: "asc" } });
    res.json(accounts);
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!req.householdId) throw new FriendlyError("Please finish setting up your household first.", 400);
    const { name, type } = req.body as { name: string; type: string };
    if (!name) throw new FriendlyError("Please give this account a name.");
    if (type && !ACCOUNT_TYPES.includes(type as (typeof ACCOUNT_TYPES)[number])) {
      throw new FriendlyError("Please choose a valid account type.");
    }
    const account = await prisma.account.create({ data: { name, type: type || "BANK", householdId: req.householdId } });
    res.status(201).json(account);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const existing = await prisma.account.findFirst({ where: { id: req.params.id, householdId: req.householdId ?? undefined } });
    if (!existing) throw new FriendlyError("We couldn't find this account.", 404);
    await prisma.account.delete({ where: { id: existing.id } });
    res.json({ message: "Account removed." });
  })
);

export default router;
