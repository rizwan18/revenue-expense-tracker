import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { asyncHandler, FriendlyError } from "../middleware/errorHandler";
import { propertySchema } from "../lib/validation";
import { getCurrentFinancialYear } from "../lib/financialYear";

const router = Router();
router.use(requireAuth);

function householdOf(req: AuthedRequest): string {
  if (!req.householdId) throw new FriendlyError("Please finish setting up your household first.", 400);
  return req.householdId;
}

function annualisedRent(rentAmount: number | null, rentFrequency: string | null): number {
  if (!rentAmount || !rentFrequency) return 0;
  switch (rentFrequency) {
    case "WEEKLY":
      return rentAmount * 52;
    case "FORTNIGHTLY":
      return rentAmount * 26;
    case "MONTHLY":
      return rentAmount * 12;
    default:
      return 0;
  }
}

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const properties = await prisma.property.findMany({ where: { householdId }, include: { owners: true }, orderBy: { createdAt: "asc" } });
    res.json(properties);
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const data = propertySchema.parse(req.body);
    const property = await prisma.property.create({
      data: {
        householdId,
        ...data,
        owners: { create: { userId: req.userId!, percentage: 100 } },
      },
      include: { owners: true },
    });
    res.status(201).json(property);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const property = await prisma.property.findFirst({ where: { id: req.params.id, householdId }, include: { owners: true } });
    if (!property) throw new FriendlyError("We couldn't find this property.", 404);
    res.json(property);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const existing = await prisma.property.findFirst({ where: { id: req.params.id, householdId } });
    if (!existing) throw new FriendlyError("We couldn't find this property.", 404);
    const data = propertySchema.partial().parse(req.body);
    const property = await prisma.property.update({ where: { id: existing.id }, data });
    res.json(property);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const existing = await prisma.property.findFirst({ where: { id: req.params.id, householdId } });
    if (!existing) throw new FriendlyError("We couldn't find this property.", 404);
    await prisma.property.delete({ where: { id: existing.id } });
    res.json({ message: "Property removed." });
  })
);

router.get(
  "/:id/summary",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const property = await prisma.property.findFirst({ where: { id: req.params.id, householdId } });
    if (!property) throw new FriendlyError("We couldn't find this property.", 404);

    const financialYear = (req.query.financialYear as string) || getCurrentFinancialYear().id;

    const [incomeAgg, expenseAgg, expenseByCategory] = await Promise.all([
      prisma.transaction.aggregate({ where: { propertyId: property.id, direction: "INCOME", financialYear }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { propertyId: property.id, direction: "EXPENSE", financialYear }, _sum: { amount: true } }),
      prisma.transaction.groupBy({
        by: ["categoryId"],
        where: { propertyId: property.id, direction: "EXPENSE", financialYear },
        _sum: { amount: true },
      }),
    ]);

    const rentalIncome = incomeAgg._sum.amount ?? 0;
    const expenses = expenseAgg._sum.amount ?? 0;
    const netRentalIncome = rentalIncome - expenses;
    const annualRent = annualisedRent(property.rentAmount, property.rentFrequency);
    const rentalYield =
      property.currentEstimatedValue && property.currentEstimatedValue > 0 ? (annualRent / property.currentEstimatedValue) * 100 : null;
    const estimatedEquity =
      property.currentEstimatedValue !== null && property.loanBalance !== null
        ? property.currentEstimatedValue - property.loanBalance
        : null;

    const categoryIds = expenseByCategory.map((c: { categoryId: string | null }) => c.categoryId).filter((id: string | null): id is string => !!id);
    const categories = await prisma.category.findMany({ where: { id: { in: categoryIds } } });
    const categoryMap = new Map(categories.map((c: { id: string; name: string }) => [c.id, c.name]));

    res.json({
      property,
      financialYear,
      rentalIncome,
      expenses,
      netRentalIncome,
      annualisedRentalIncome: annualRent,
      rentalYield,
      estimatedEquity,
      majorExpenses: expenseByCategory
        .map((c: { categoryId: string | null; _sum: { amount: number | null } }) => ({
          category: c.categoryId ? categoryMap.get(c.categoryId) ?? "Uncategorised" : "Uncategorised",
          amount: c._sum.amount ?? 0,
        }))
        .sort((a: { amount: number }, b: { amount: number }) => b.amount - a.amount),
    });
  })
);

export default router;
