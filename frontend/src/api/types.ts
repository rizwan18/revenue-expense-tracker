export interface User {
  id: string;
  email: string;
  fullName: string;
  easyViewEnabled: boolean;
  timezone?: string;
  householdId?: string | null;
}

export interface FinancialYearOption {
  id: string;
  label: string;
}

export interface DashboardResponse {
  financialYear: { id: string; label: string; startDate: string; endDate: string; daysRemaining: number };
  availableFinancialYears: FinancialYearOption[];
  snapshot: {
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    investmentIncome: number;
    propertyIncome: number;
    dividends: number;
    otherIncome: number;
    upcomingBillsCount: number;
    outstandingBillsCount: number;
  };
  investmentSnapshot: {
    propertyValue: number;
    shareValue: number;
    otherValue: number;
    totalInvestmentValue: number;
    totalInvestmentIncome: number;
    capitalGains: { gains: number; losses: number; net: number };
  };
  propertySnapshot: {
    numberOfProperties: number;
    totalRentalIncome: number;
    totalPropertyExpenses: number;
    netRentalIncome: number;
    loanBalance: number;
    estimatedEquity: number;
  };
  upcomingPayments: Array<{ id: string; name: string; amount: number; dueDate: string; property: string | null }>;
  alerts: Array<{ id: string; message: string; severity: "info" | "warning" }>;
  recentActivity: Array<{ id: string; description: string; amount: number; date: string; category: string | null }>;
}

export interface Category {
  id: string;
  name: string;
  direction: "INCOME" | "EXPENSE";
  isCustom: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  direction: "INCOME" | "EXPENSE";
  categoryId: string | null;
  category?: Category | null;
  accountId: string | null;
  propertyId: string | null;
  property?: { id: string; name: string } | null;
  investmentId: string | null;
  investment?: { id: string; name: string } | null;
  notes: string | null;
  isRecurring: boolean;
  recurrenceFrequency: string | null;
  potentialTaxCategory: string | null;
  financialYear: string;
}

export interface Property {
  id: string;
  name: string;
  address: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  currentEstimatedValue: number | null;
  loanBalance: number | null;
  loanInterestRate: number | null;
  rentalAgent: string | null;
  tenantName: string | null;
  rentAmount: number | null;
  rentFrequency: string | null;
  rentalStartDate: string | null;
  notes: string | null;
}

export interface PropertySummary {
  property: Property;
  financialYear: string;
  rentalIncome: number;
  expenses: number;
  netRentalIncome: number;
  annualisedRentalIncome: number;
  rentalYield: number | null;
  estimatedEquity: number | null;
  majorExpenses: Array<{ category: string; amount: number }>;
}

export interface InvestmentTransactionRecord {
  id: string;
  type: "BUY" | "SELL";
  date: string;
  quantity: number;
  pricePerUnit: number;
  brokerage: number;
  notes: string | null;
}

export interface Investment {
  id: string;
  name: string;
  ticker: string | null;
  type: string;
  notes: string | null;
  currentValueOverride: number | null;
  investmentTransactions: InvestmentTransactionRecord[];
  dividends: Dividend[];
  summary: { quantity: number; costBase: number; currentValue: number; unrealisedGainLoss: number; realisedGain: number; realisedLoss: number };
  totalDividends: number;
}

export interface Dividend {
  id: string;
  investmentId: string;
  exDividendDate: string | null;
  paymentDate: string | null;
  grossAmount: number;
  frankingCredit: number;
  frankedAmount: number;
  unfrankedAmount: number;
  taxWithheld: number;
  netAmount: number;
  status: "EXPECTED" | "RECEIVED";
  notes: string | null;
  financialYear: string;
}

export interface Bill {
  id: string;
  name: string;
  provider: string | null;
  amount: number;
  frequency: string;
  nextDueDate: string;
  status: "UPCOMING" | "PAID" | "OVERDUE";
  autoRenew: boolean;
  reminderDaysBefore: number;
  notes: string | null;
  property?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
}

export interface Reminder {
  id: string;
  title: string;
  dueDate: string;
  daysBefore: number;
  status: "PENDING" | "SNOOZED" | "COMPLETE" | "DISABLED";
  bill?: { id: string; name: string; property?: { name: string } | null } | null;
}

export interface CapitalGainDisposal {
  id: string;
  source: "automatic" | "manual";
  investmentId: string;
  investmentName: string;
  ticker: string | null;
  saleDate: string;
  quantity: number;
  salePrice: number;
  saleCosts: number;
  proceeds: number;
  costBase: number;
  grossGainLoss: number;
  financialYear: string;
  holdingPeriodDays: number | null;
  eligibleForDiscountInformationalOnly: boolean | null;
  notes: string | null;
  hasDocuments: boolean;
}
