import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { asyncHandler, FriendlyError } from "../middleware/errorHandler";
import { dividendSchema } from "../lib/validation";
import { getFinancialYearId } from "../lib/financialYear";

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
    const { financialYear, investmentId } = req.query as Record<string, string>;
    const investments = await prisma.investment.findMany({ where: { householdId }, select: { id: true, name: true, ticker: true } });
    const investmentIds = investments.map((i: { id: string }) => i.id);
    const dividends = await prisma.dividend.findMany({
      where: {
        investmentId: investmentId ? investmentId : { in: investmentIds },
        ...(financialYear ? { financialYear } : {}),
      },
      orderBy: { paymentDate: "desc" },
    });
    const investmentMap = new Map(investments.map((i: { id: string; name: string; ticker: string | null }) => [i.id, i]));
    const enriched = dividends.map((d: { investmentId: string }) => ({ ...d, investment: investmentMap.get(d.investmentId) }));

    const totals = dividends.reduce(
      (acc: { gross: number; franking: number; net: number }, d: { grossAmount: number; frankingCredit: number; status: string; netAmount: number }) => {
        acc.gross += d.grossAmount;
        acc.franking += d.frankingCredit;
        acc.net += d.status === "RECEIVED" ? d.netAmount : 0;
        return acc;
      },
      { gross: 0, franking: 0, net: 0 }
    );

    res.json({ items: enriched, totals });
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const data = dividendSchema.parse(req.body);
    const investment = await prisma.investment.findFirst({ where: { id: data.investmentId, householdId } });
    if (!investment) throw new FriendlyError("We couldn't find this investment.", 404);

    const referenceDate = data.paymentDate ?? data.exDividendDate ?? new Date();
    const dividend = await prisma.dividend.create({
      data: {
        investmentId: data.investmentId,
        exDividendDate: data.exDividendDate ?? null,
        paymentDate: data.paymentDate ?? null,
        grossAmount: data.grossAmount,
        frankingCredit: data.frankingCredit ?? 0,
        frankedAmount: data.frankedAmount ?? 0,
        unfrankedAmount: data.unfrankedAmount ?? 0,
        taxWithheld: data.taxWithheld ?? 0,
        netAmount: data.netAmount,
        status: data.status ?? "EXPECTED",
        notes: data.notes ?? null,
        financialYear: getFinancialYearId(referenceDate),
      },
    });

    // If this is an expected dividend, create a reminder so the user is
    // notified around the expected payment date (see section 10 & 13).
    if (dividend.status === "EXPECTED" && data.paymentDate) {
      await prisma.reminder.create({
        data: {
          householdId,
          dividendId: dividend.id,
          title: `Dividend expected — ${investment.name}`,
          dueDate: data.paymentDate,
          daysBefore: 1,
          status: "PENDING",
        },
      });
    }

    res.status(201).json(dividend);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const existing = await prisma.dividend.findFirst({ where: { id: req.params.id, investment: { householdId } } });
    if (!existing) throw new FriendlyError("We couldn't find this dividend.", 404);
    const data = dividendSchema.partial().parse(req.body);
    const referenceDate = data.paymentDate ?? existing.paymentDate ?? existing.exDividendDate ?? new Date();
    const dividend = await prisma.dividend.update({
      where: { id: existing.id },
      data: { ...data, financialYear: getFinancialYearId(referenceDate) },
    });
    res.json(dividend);
  })
);

router.post(
  "/:id/mark-received",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const existing = await prisma.dividend.findFirst({ where: { id: req.params.id, investment: { householdId } } });
    if (!existing) throw new FriendlyError("We couldn't find this dividend.", 404);
    const dividend = await prisma.dividend.update({ where: { id: existing.id }, data: { status: "RECEIVED" } });
    res.json(dividend);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const existing = await prisma.dividend.findFirst({ where: { id: req.params.id, investment: { householdId } } });
    if (!existing) throw new FriendlyError("We couldn't find this dividend.", 404);
    await prisma.dividend.delete({ where: { id: existing.id } });
    res.json({ message: "Dividend removed." });
  })
);

export default router;
