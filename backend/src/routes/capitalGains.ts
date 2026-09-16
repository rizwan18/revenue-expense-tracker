import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { asyncHandler, FriendlyError } from "../middleware/errorHandler";
import { capitalGainSchema } from "../lib/validation";
import { getFinancialYearId } from "../lib/financialYear";

const router = Router();
router.use(requireAuth);

function householdOf(req: AuthedRequest): string {
  if (!req.householdId) throw new FriendlyError("Please finish setting up your household first.", 400);
  return req.householdId;
}

/**
 * Reads realised disposals directly from InvestmentTransaction "SELL" rows
 * (average-cost method — see calculations.ts) and enriches each with
 * holding-period info. This is informational only: it does NOT determine
 * eligibility for the 50% CGT discount or any other tax treatment.
 */
router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const { financialYear } = req.query as Record<string, string>;
    const investments = await prisma.investment.findMany({
      where: { householdId },
      include: { investmentTransactions: { orderBy: { date: "asc" } } },
    });

    const disposals: Array<Record<string, unknown>> = [];

    for (const inv of investments) {
      let heldQty = 0;
      let heldCost = 0;
      const buyDates: Date[] = [];
      for (const tx of inv.investmentTransactions) {
        if (tx.type === "BUY") {
          heldQty += tx.quantity;
          heldCost += tx.quantity * tx.pricePerUnit + tx.brokerage;
          buyDates.push(tx.date);
        } else {
          const avgCost = heldQty > 0 ? heldCost / heldQty : 0;
          const costOfSold = avgCost * tx.quantity;
          const proceeds = tx.quantity * tx.pricePerUnit - tx.brokerage;
          const gainLoss = proceeds - costOfSold;
          const fy = getFinancialYearId(tx.date);
          const earliestBuy = buyDates[0];
          const holdingDays = earliestBuy ? Math.round((tx.date.getTime() - earliestBuy.getTime()) / (1000 * 60 * 60 * 24)) : null;

          if (!financialYear || fy === financialYear) {
            disposals.push({
              investmentId: inv.id,
              investmentName: inv.name,
              ticker: inv.ticker,
              saleDate: tx.date,
              quantity: tx.quantity,
              salePrice: tx.pricePerUnit,
              saleCosts: tx.brokerage,
              proceeds,
              costBase: costOfSold,
              grossGainLoss: gainLoss,
              financialYear: fy,
              holdingPeriodDays: holdingDays,
              eligibleForDiscountInformationalOnly: holdingDays !== null ? holdingDays > 365 : null,
            });
          }

          heldQty -= tx.quantity;
          heldCost -= costOfSold;
        }
      }
    }

    const totals = disposals.reduce(
      (acc: { gains: number; losses: number }, d) => {
        const g = d.grossGainLoss as number;
        if (g >= 0) acc.gains += g;
        else acc.losses += -g;
        return acc;
      },
      { gains: 0, losses: 0 }
    );

    res.json({ items: disposals, totals: { ...totals, net: totals.gains - totals.losses } });
  })
);

// Manually recorded disposals (e.g. for assets not tracked as buy/sell
// investment transactions — private sales, collectibles, etc.)
router.post(
  "/manual",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const data = capitalGainSchema.parse(req.body);
    const investment = await prisma.investment.findFirst({ where: { id: data.investmentId, householdId } });
    if (!investment) throw new FriendlyError("We couldn't find this investment.", 404);

    const purchaseCosts = data.purchaseCosts ?? 0;
    const saleCosts = data.saleCosts ?? 0;
    const ownershipPct = data.ownershipPercentage ?? 100;

    const costBase = (data.purchasePrice * data.quantity + purchaseCosts) * (ownershipPct / 100);
    const proceeds = (data.salePrice * data.quantity - saleCosts) * (ownershipPct / 100);
    const grossGainLoss = proceeds - costBase;
    const holdingPeriodDays = Math.round((data.saleDate.getTime() - data.purchaseDate.getTime()) / (1000 * 60 * 60 * 24));

    res.status(201).json({
      ...data,
      costBase,
      proceeds,
      grossGainLoss,
      holdingPeriodDays,
      financialYear: getFinancialYearId(data.saleDate),
      eligibleForDiscountInformationalOnly: holdingPeriodDays > 365,
      disclaimer: "Informational only — CGT discount eligibility and tax treatment depend on your circumstances. Review with your tax adviser.",
    });
  })
);

export default router;
