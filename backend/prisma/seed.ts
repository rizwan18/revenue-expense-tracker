/**
 * Development seed script — realistic FICTIONAL Australian data only.
 * Run with: npm run prisma:seed
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";
import { getFinancialYearId } from "../src/lib/financialYear";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding demo data…");

  await prisma.household.deleteMany({ where: { name: "The Wilson Household (Demo)" } });

  const household = await prisma.household.create({ data: { name: "The Wilson Household (Demo)" } });

  const passwordHash = await hashPassword("DemoPassword123!");
  const user = await prisma.user.create({
    data: {
      email: "demo@example.com",
      passwordHash,
      fullName: "Margaret Wilson",
      householdId: household.id,
      householdRole: "PRIMARY",
    },
  });

  await prisma.category.createMany({
    data: [
      ...INCOME_CATEGORIES.map((name) => ({ name, direction: "INCOME" as const, householdId: household.id })),
      ...EXPENSE_CATEGORIES.map((name) => ({ name, direction: "EXPENSE" as const, householdId: household.id })),
    ],
  });
  const categories = await prisma.category.findMany({ where: { householdId: household.id } });
  const cat = (name: string) => categories.find((c) => c.name === name)!.id;

  const account = await prisma.account.create({ data: { householdId: household.id, name: "Everyday Account", type: "BANK" } });

  // --- Properties -----------------------------------------------------------
  const propertyA = await prisma.property.create({
    data: {
      householdId: household.id,
      name: "Maple Street Rental",
      address: "12 Maple Street, Ballarat VIC 3350",
      purchaseDate: new Date("2015-03-10"),
      purchasePrice: 320000,
      currentEstimatedValue: 480000,
      loanBalance: 210000,
      loanInterestRate: 6.2,
      rentalAgent: "Ballarat Property Managers",
      tenantName: "The Nguyen family",
      rentAmount: 420,
      rentFrequency: "WEEKLY",
      rentalStartDate: new Date("2015-04-01"),
      owners: { create: { userId: user.id, percentage: 100 } },
    },
  });

  const propertyB = await prisma.property.create({
    data: {
      householdId: household.id,
      name: "Beachside Unit",
      address: "4/8 Ocean Parade, Torquay VIC 3228",
      purchaseDate: new Date("2019-11-20"),
      purchasePrice: 410000,
      currentEstimatedValue: 520000,
      loanBalance: 260000,
      loanInterestRate: 6.4,
      rentalAgent: "Surf Coast Rentals",
      tenantName: "S. Patterson",
      rentAmount: 480,
      rentFrequency: "WEEKLY",
      rentalStartDate: new Date("2020-01-15"),
      owners: { create: { userId: user.id, percentage: 100 } },
    },
  });

  // Rental income & expenses across the current and previous FY
  const now = new Date();
  const monthsBack = [0, 1, 2, 3, 4, 5, 6, 13];
  for (const m of monthsBack) {
    const date = new Date(now.getFullYear(), now.getMonth() - m, 5);
    await prisma.transaction.create({
      data: {
        householdId: household.id,
        userId: user.id,
        date,
        description: "Rent received — Maple Street",
        amount: 420 * 4.33,
        direction: "INCOME",
        categoryId: cat("Rental Income"),
        accountId: account.id,
        propertyId: propertyA.id,
        financialYear: getFinancialYearId(date),
      },
    });
    await prisma.transaction.create({
      data: {
        householdId: household.id,
        userId: user.id,
        date,
        description: "Rent received — Beachside Unit",
        amount: 480 * 4.33,
        direction: "INCOME",
        categoryId: cat("Rental Income"),
        accountId: account.id,
        propertyId: propertyB.id,
        financialYear: getFinancialYearId(date),
      },
    });
  }

  const propertyExpenseSeeds = [
    { property: propertyA, name: "Council rates", category: "Council Rates", amount: 620, month: 1 },
    { property: propertyA, name: "Insurance", category: "Insurance", amount: 1180, month: 3 },
    { property: propertyA, name: "Property management fee", category: "Property Management", amount: 320, month: 0 },
    { property: propertyA, name: "Gutter repairs", category: "Repairs & Maintenance", amount: 450, month: 2 },
    { property: propertyB, name: "Body corporate fees", category: "Body Corporate", amount: 890, month: 1 },
    { property: propertyB, name: "Insurance", category: "Insurance", amount: 990, month: 4 },
    { property: propertyB, name: "Property management fee", category: "Property Management", amount: 360, month: 0 },
  ];
  for (const e of propertyExpenseSeeds) {
    const date = new Date(now.getFullYear(), now.getMonth() - e.month, 18);
    await prisma.transaction.create({
      data: {
        householdId: household.id,
        userId: user.id,
        date,
        description: e.name,
        amount: e.amount,
        direction: "EXPENSE",
        categoryId: cat(e.category),
        accountId: account.id,
        propertyId: e.property.id,
        potentialTaxCategory: "Potential tax-related expense — review with your accountant",
        financialYear: getFinancialYearId(date),
      },
    });
  }

  // --- Shares & ETFs ----------------------------------------------------------
  const vas = await prisma.investment.create({
    data: { householdId: household.id, name: "Vanguard Australian Shares ETF", ticker: "VAS", type: "ETF" },
  });
  await prisma.investmentTransaction.createMany({
    data: [
      { investmentId: vas.id, type: "BUY", date: new Date("2021-02-10"), quantity: 200, pricePerUnit: 85.2, brokerage: 15 },
      { investmentId: vas.id, type: "BUY", date: new Date("2022-06-15"), quantity: 100, pricePerUnit: 88.4, brokerage: 15 },
      { investmentId: vas.id, type: "SELL", date: new Date(now.getFullYear(), now.getMonth() - 2, 10), quantity: 50, pricePerUnit: 95.1, brokerage: 15 },
    ],
  });
  await prisma.dividend.createMany({
    data: [
      {
        investmentId: vas.id,
        paymentDate: new Date(now.getFullYear(), now.getMonth() - 3, 15),
        exDividendDate: new Date(now.getFullYear(), now.getMonth() - 3, 1),
        grossAmount: 640,
        frankingCredit: 180,
        frankedAmount: 600,
        unfrankedAmount: 40,
        taxWithheld: 0,
        netAmount: 640,
        status: "RECEIVED",
        financialYear: getFinancialYearId(new Date(now.getFullYear(), now.getMonth() - 3, 15)),
      },
    ],
  });

  const cba = await prisma.investment.create({ data: { householdId: household.id, name: "Commonwealth Bank of Australia", ticker: "CBA", type: "SHARE" } });
  await prisma.investmentTransaction.create({
    data: { investmentId: cba.id, type: "BUY", date: new Date("2018-05-01"), quantity: 80, pricePerUnit: 72.5, brokerage: 20 },
  });
  await prisma.dividend.create({
    data: {
      investmentId: cba.id,
      paymentDate: new Date(now.getFullYear(), now.getMonth() + 1, 20),
      grossAmount: 340,
      frankingCredit: 145,
      frankedAmount: 340,
      netAmount: 340,
      status: "EXPECTED",
      financialYear: getFinancialYearId(new Date(now.getFullYear(), now.getMonth() + 1, 20)),
    },
  });
  await prisma.reminder.create({
    data: {
      householdId: household.id,
      title: "Dividend expected — Commonwealth Bank of Australia",
      dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 19),
      daysBefore: 1,
      status: "PENDING",
    },
  });

  const termDeposit = await prisma.investment.create({
    data: { householdId: household.id, name: "12-month Term Deposit — ANZ", type: "TERM_DEPOSIT", currentValueOverride: 50000 },
  });
  await prisma.transaction.create({
    data: {
      householdId: household.id,
      userId: user.id,
      date: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      description: "Term deposit interest",
      amount: 875,
      direction: "INCOME",
      categoryId: cat("Interest"),
      investmentId: termDeposit.id,
      financialYear: getFinancialYearId(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    },
  });

  // --- Household bills & income -----------------------------------------------
  await prisma.transaction.createMany({
    data: [0, 1, 2].map((m) => ({
      householdId: household.id,
      userId: user.id,
      date: new Date(now.getFullYear(), now.getMonth() - m, 1),
      description: "Age Pension",
      amount: 1850,
      direction: "INCOME" as const,
      categoryId: cat("Pension"),
      accountId: account.id,
      financialYear: getFinancialYearId(new Date(now.getFullYear(), now.getMonth() - m, 1)),
    })),
  });

  const bills = [
    { name: "Electricity", provider: "AGL", amount: 210, frequency: "QUARTERLY", category: "Electricity", daysAhead: 12 },
    { name: "Home & Contents Insurance", provider: "NRMA", amount: 1250, frequency: "ANNUALLY", category: "Insurance", daysAhead: 25 },
    { name: "Council Rates — Home", provider: "City of Ballarat", amount: 780, frequency: "QUARTERLY", category: "Council Rates", daysAhead: 5 },
    { name: "Home Loan", provider: "Commonwealth Bank", amount: 1450, frequency: "MONTHLY", category: "Mortgage Interest", daysAhead: 30 },
    { name: "Internet", provider: "Telstra", amount: 89, frequency: "MONTHLY", category: "Internet", daysAhead: 18 },
    { name: "Car Registration", provider: "VicRoads", amount: 865, frequency: "ANNUALLY", category: "Car", daysAhead: 45 },
  ];
  for (const b of bills) {
    const dueDate = new Date(now.getTime() + b.daysAhead * 24 * 60 * 60 * 1000);
    const bill = await prisma.bill.create({
      data: {
        householdId: household.id,
        name: b.name,
        provider: b.provider,
        amount: b.amount,
        frequency: b.frequency,
        nextDueDate: dueDate,
        categoryId: cat(b.category),
        accountId: account.id,
        reminderDaysBefore: 7,
      },
    });
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - 7);
    await prisma.reminder.create({
      data: { householdId: household.id, billId: bill.id, title: `${bill.name} due`, dueDate: reminderDate, daysBefore: 7, status: "PENDING" },
    });
  }

  // A couple of everyday expenses for realism.
  await prisma.transaction.createMany({
    data: [
      { description: "Woolworths groceries", amount: 165.4, category: "Groceries" },
      { description: "Medical — GP visit", amount: 45, category: "Medical" },
      { description: "Mobile phone plan", amount: 49, category: "Phone" },
    ].map((t, i) => ({
      householdId: household.id,
      userId: user.id,
      date: new Date(now.getFullYear(), now.getMonth(), 20 - i * 3),
      description: t.description,
      amount: t.amount,
      direction: "EXPENSE" as const,
      categoryId: cat(t.category),
      accountId: account.id,
      financialYear: getFinancialYearId(new Date(now.getFullYear(), now.getMonth(), 20 - i * 3)),
    })),
  });

  console.log("Seed complete.");
  console.log("Demo login: demo@example.com / DemoPassword123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
