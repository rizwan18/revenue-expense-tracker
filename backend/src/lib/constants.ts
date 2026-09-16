export const INCOME_CATEGORIES = [
  "Salary",
  "Pension",
  "Rental Income",
  "Dividends",
  "ETF Distributions",
  "Interest",
  "Managed Fund Distribution",
  "Capital Gains",
  "Other Investment Income",
  "Other Income",
] as const;

export const EXPENSE_CATEGORIES = [
  "Mortgage Interest",
  "Council Rates",
  "Water Rates",
  "Insurance",
  "Property Management",
  "Repairs & Maintenance",
  "Land Tax",
  "Strata",
  "Body Corporate",
  "Accounting",
  "Legal",
  "Utilities",
  "Electricity",
  "Gas",
  "Internet",
  "Phone",
  "Car",
  "Groceries",
  "Medical",
  "Other",
] as const;

// Categories where the app can *suggest* a potential tax category. This is
// never a determination of deductibility — see potentialTaxCategory usage.
export const LIKELY_DEDUCTIBLE_EXPENSE_CATEGORIES = new Set([
  "Mortgage Interest",
  "Council Rates",
  "Water Rates",
  "Insurance",
  "Property Management",
  "Repairs & Maintenance",
  "Land Tax",
  "Strata",
  "Body Corporate",
  "Accounting",
  "Legal",
]);

export const TRANSACTION_DIRECTIONS = ["INCOME", "EXPENSE"] as const;
export type TransactionDirection = (typeof TRANSACTION_DIRECTIONS)[number];

export const BILL_FREQUENCIES = [
  "WEEKLY",
  "FORTNIGHTLY",
  "MONTHLY",
  "QUARTERLY",
  "HALF_YEARLY",
  "ANNUALLY",
  "CUSTOM",
] as const;
export type BillFrequency = (typeof BILL_FREQUENCIES)[number];

export const BILL_STATUSES = ["UPCOMING", "PAID", "OVERDUE"] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];

export const REMINDER_STATUSES = ["PENDING", "SNOOZED", "COMPLETE", "DISABLED"] as const;
export type ReminderStatus = (typeof REMINDER_STATUSES)[number];

export const REMINDER_LEAD_OPTIONS = [1, 3, 7, 14, 30] as const;

export const INVESTMENT_TYPES = [
  "SHARE",
  "ETF",
  "LIC",
  "MANAGED_FUND",
  "BOND",
  "TERM_DEPOSIT",
  "CRYPTO",
  "P2P",
  "PRIVATE",
  "COLLECTIBLE",
  "OTHER",
] as const;
export type InvestmentType = (typeof INVESTMENT_TYPES)[number];

export const INVESTMENT_TRANSACTION_TYPES = ["BUY", "SELL"] as const;
export type InvestmentTransactionType = (typeof INVESTMENT_TRANSACTION_TYPES)[number];

export const DIVIDEND_STATUSES = ["EXPECTED", "RECEIVED"] as const;
export type DividendStatus = (typeof DIVIDEND_STATUSES)[number];

export const ACCOUNT_TYPES = ["BANK", "OFFSET", "CREDIT_CARD", "CASH", "OTHER"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const RENT_FREQUENCIES = ["WEEKLY", "FORTNIGHTLY", "MONTHLY"] as const;
export type RentFrequency = (typeof RENT_FREQUENCIES)[number];

/** Rough plain-English glossary shown as tooltips/help text throughout the UI. */
export const GLOSSARY: Record<string, string> = {
  "Capital Gains": "Profit or loss when you sell an investment for more or less than you paid.",
  "Franking Credit": "Tax already paid by an Australian company on your behalf, credited back to you.",
  "Unrealised Gain/Loss": "The change in value of something you still own — not a real profit or loss until you sell.",
  "Cost Base": "What an investment cost you in total, including brokerage — used to work out gain or loss when sold.",
  "Net Rental Income": "Rent received minus property expenses.",
  "Financial Year": "The 12 months the Australian Tax Office uses for tax purposes: 1 July to 30 June.",
  "Body Corporate": "The group of owners in a unit block or complex, and the fees paid to manage shared areas.",
  "Land Tax": "An annual state government tax on the value of land you own (varies by state and typically excludes your home).",
};
