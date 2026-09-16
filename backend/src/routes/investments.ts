import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { asyncHandler, FriendlyError } from "../middleware/errorHandler";
import { investmentSchema, investmentTransactionSchema } from "../lib/validation";

const router = Router();
router.use(requireAuth);

function householdOf(req: AuthedRequest): string {
  if (!req.householdId) throw new FriendlyError("Please finish setting up your household first.", 400);
  return req.householdId;
}

/** Computes quantity held, average cost base, and unrealised gain/loss for one investment. */
function computeHoldingSummary(txs: { type: string; quantity: number; pricePerUnit: number; brokerage: number; date: Date }[], currentValueOverride: number | null) {
  let quantity = 0;
  let costBase = 0;
  let realisedGain = 0;
  let realisedLoss = 0;

  const sorted = [...txs].sort((a, b) => a.date.getTime() - b.date.getTime());
  for (const tx of sorted) {
    if (tx.type === "BUY") {
      quantity += tx.quantity;
      costBase += tx.quantity * tx.pricePerUnit + tx.brokerage;
    } else {
      const avgCost = quantity > 0 ? costBase / quantity : 0;
      const costOfSold = avgCost * tx.quantity;
      const proceeds = tx.quantity * tx.pricePerUnit - tx.brokerage;
      const gainLoss = proceeds - costOfSold;
      if (gainLoss >= 0) realisedGain += gainLoss;
      else realisedLoss += -gainLoss;
      quantity -= tx.quantity;
      costBase -= costOfSold;
    }
  }

  const lastPrice = sorted[sorted.length - 1]?.pricePerUnit ?? 0;
  const currentValue = currentValueOverride ?? quantity * lastPrice;
  const unrealisedGainLoss = currentValue - costBase;

  return { quantity, costBase, currentValue, unrealisedGainLoss, realisedGain, realisedLoss };
}

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const investments = await prisma.investment.findMany({
      where: { householdId },
      include: { investmentTransactions: true, dividends: true },
      orderBy: { createdAt: "asc" },
    });
    const withSummary = investments.map(
      (inv: { investmentTransactions: { type: string; quantity: number; pricePerUnit: number; brokerage: number; date: Date }[]; currentValueOverride: number | null; dividends: { status: string; netAmount: number }[] }) => ({
        ...inv,
        summary: computeHoldingSummary(inv.investmentTransactions, inv.currentValueOverride),
        totalDividends: inv.dividends.filter((d) => d.status === "RECEIVED").reduce((s: number, d) => s + d.netAmount, 0),
      })
    );
    res.json(withSummary);
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const data = investmentSchema.parse(req.body);
    const investment = await prisma.investment.create({ data: { householdId, ...data } });
    res.status(201).json(investment);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const investment = await prisma.investment.findFirst({
      where: { id: req.params.id, householdId },
      include: { investmentTransactions: { orderBy: { date: "asc" } }, dividends: { orderBy: { paymentDate: "desc" } } },
    });
    if (!investment) throw new FriendlyError("We couldn't find this investment.", 404);
    res.json({ ...investment, summary: computeHoldingSummary(investment.investmentTransactions, investment.currentValueOverride) });
  })
);

router.put(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const existing = await prisma.investment.findFirst({ where: { id: req.params.id, householdId } });
    if (!existing) throw new FriendlyError("We couldn't find this investment.", 404);
    const data = investmentSchema.partial().parse(req.body);
    const investment = await prisma.investment.update({ where: { id: existing.id }, data });
    res.json(investment);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const existing = await prisma.investment.findFirst({ where: { id: req.params.id, householdId } });
    if (!existing) throw new FriendlyError("We couldn't find this investment.", 404);
    await prisma.investment.delete({ where: { id: existing.id } });
    res.json({ message: "Investment removed." });
  })
);

router.post(
  "/:id/transactions",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const investment = await prisma.investment.findFirst({ where: { id: req.params.id, householdId } });
    if (!investment) throw new FriendlyError("We couldn't find this investment.", 404);
    const data = investmentTransactionSchema.parse(req.body);
    const tx = await prisma.investmentTransaction.create({
      data: { investmentId: investment.id, ...data, brokerage: data.brokerage ?? 0 },
    });
    res.status(201).json(tx);
  })
);

router.delete(
  "/transactions/:txId",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const tx = await prisma.investmentTransaction.findFirst({
      where: { id: req.params.txId, investment: { householdId } },
    });
    if (!tx) throw new FriendlyError("We couldn't find this transaction.", 404);
    await prisma.investmentTransaction.delete({ where: { id: tx.id } });
    res.json({ message: "Transaction removed." });
  })
);

export default router;
