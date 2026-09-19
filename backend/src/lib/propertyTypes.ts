import { PROPERTY_TYPES, type PropertyType } from "./constants";

export interface PropertyGroupTotals {
  count: number;
  value: number;
  loanBalance: number;
  equity: number;
}

export function isPropertyType(value: unknown): value is PropertyType {
  return typeof value === "string" && (PROPERTY_TYPES as readonly string[]).includes(value);
}

/**
 * Split properties into investment properties and the principal place of
 * residence (PPR), with value, loan and equity for each group. Anything that
 * isn't explicitly "PPR" is treated as an investment property.
 */
export function groupPropertyTotals(
  properties: Array<{ propertyType: string; currentEstimatedValue: number | null; loanBalance: number | null }>
): { investment: PropertyGroupTotals; ppr: PropertyGroupTotals } {
  const empty = (): PropertyGroupTotals => ({ count: 0, value: 0, loanBalance: 0, equity: 0 });
  const result = { investment: empty(), ppr: empty() };
  for (const p of properties) {
    const group = p.propertyType === "PPR" ? result.ppr : result.investment;
    group.count += 1;
    group.value += p.currentEstimatedValue ?? 0;
    group.loanBalance += p.loanBalance ?? 0;
  }
  result.investment.equity = result.investment.value - result.investment.loanBalance;
  result.ppr.equity = result.ppr.value - result.ppr.loanBalance;
  return result;
}

export interface OwnedPropertyRef {
  id: string;
  name: string;
  propertyType: string;
}

/**
 * Business rule: a person can have only one principal place of residence.
 * Given the properties a person owns, returns the PPR that would conflict with
 * making `propertyId` (or a brand-new property, when omitted) a PPR — or null
 * when it's fine. A property never conflicts with itself.
 */
export function findConflictingPpr(ownedProperties: OwnedPropertyRef[], propertyId?: string): OwnedPropertyRef | null {
  return ownedProperties.find((p) => p.propertyType === "PPR" && p.id !== propertyId) ?? null;
}

export function pprConflictMessage(existingName: string): string {
  return `You already have a principal place of residence ("${existingName}"), and a person can only have one at a time. If you've moved, change that property to an investment property first.`;
}
