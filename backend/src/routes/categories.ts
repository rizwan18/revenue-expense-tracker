import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { asyncHandler, FriendlyError } from "../middleware/errorHandler";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const categories = await prisma.category.findMany({
      where: { householdId: req.householdId ?? undefined },
      orderBy: [{ direction: "asc" }, { name: "asc" }],
    });
    res.json(categories);
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!req.householdId) throw new FriendlyError("Please finish setting up your household first.", 400);
    const { name, direction } = req.body as { name: string; direction: "INCOME" | "EXPENSE" };
    if (!name || !direction) throw new FriendlyError("Please provide a category name and type.");
    const category = await prisma.category.create({
      data: { name, direction, isCustom: true, householdId: req.householdId },
    });
    res.status(201).json(category);
  })
);

export default router;
