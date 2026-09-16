/**
 * Pure calculation for a single capital gains disposal. Kept separate from
 * the Prisma-backed route so it can be unit tested without a database, and
 * reused identically by both create and update handlers.
 *
 * This is informational only — it does not determine CGT discount
 * eligibility or any other tax treatment. The "> 365 days" check is a
 * simplification for display purposes; the ATO's actual 12-month rule has
 * edge cases (e.g. it excludes the acquisition day) that this app does not
 * attempt to model. Always shown alongside a disclaimer to review with a
 * tax adviser.
 */
export interface DisposalInput {
  purchaseDate: Date;
  purchasePrice: number;
  purchaseCosts: number;
  saleDate: Date;
  salePrice: number;
  saleCosts: number;
  quantity: number;
  ownershipPercentage: number;
}

export interface DisposalResult {
  costBase: number;
  proceeds: number;
  grossGainLoss: number;
  holdingPeriodDays: number;
  eligibleForDiscountInformationalOnly: boolean;
}

export function calculateDisposal(input: DisposalInput): DisposalResult {
  const ownershipFraction = input.ownershipPercentage / 100;
  const costBase = (input.purchasePrice * input.quantity + input.purchaseCosts) * ownershipFraction;
  const proceeds = (input.salePrice * input.quantity - input.saleCosts) * ownershipFraction;
  const grossGainLoss = proceeds - costBase;
  const holdingPeriodDays = Math.round((input.saleDate.getTime() - input.purchaseDate.getTime()) / (1000 * 60 * 60 * 24));

  return {
    costBase,
    proceeds,
    grossGainLoss,
    holdingPeriodDays,
    eligibleForDiscountInformationalOnly: holdingPeriodDays > 365,
  };
}
