import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { asyncHandler, FriendlyError } from "../middleware/errorHandler";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!req.householdId) throw new FriendlyError("Please finish setting up your household first.", 400);
    const householdId = req.householdId;
    const q = ((req.query.q as string) || "").trim();
    if (q.length < 2) return res.json({ transactions: [], properties: [], investments: [], bills: [], documents: [] });

    const [transactions, properties, investments, bills, documents] = await Promise.all([
      prisma.transaction.findMany({ where: { householdId, description: { contains: q } }, take: 10, orderBy: { date: "desc" } }),
      prisma.property.findMany({ where: { householdId, OR: [{ name: { contains: q } }, { address: { contains: q } }] }, take: 10 }),
      prisma.investment.findMany({ where: { householdId, OR: [{ name: { contains: q } }, { ticker: { contains: q } }] }, take: 10 }),
      prisma.bill.findMany({ where: { householdId, OR: [{ name: { contains: q } }, { provider: { contains: q } }] }, take: 10 }),
      prisma.document.findMany({ where: { householdId, fileName: { contains: q } }, take: 10 }),
    ]);

    res.json({ transactions, properties, investments, bills, documents });
  })
);

export default router;
