import { describe, it, expect } from "vitest";
import { calculateDisposal } from "../lib/capitalGains";

describe("calculateDisposal", () => {
  it("calculates a simple full-ownership gain", () => {
    const result = calculateDisposal({
      purchaseDate: new Date("2020-01-01"),
      purchasePrice: 10,
      purchaseCosts: 50,
      saleDate: new Date("2023-01-01"),
      salePrice: 15,
      saleCosts: 50,
      quantity: 100,
      ownershipPercentage: 100,
    });
    // Cost base: 10*100 + 50 = 1050. Proceeds: 15*100 - 50 = 1450.
    expect(result.costBase).toBe(1050);
    expect(result.proceeds).toBe(1450);
    expect(result.grossGainLoss).toBe(400);
  });

  it("calculates a loss when sale proceeds are below cost base", () => {
    const result = calculateDisposal({
      purchaseDate: new Date("2022-01-01"),
      purchasePrice: 20,
      purchaseCosts: 0,
      saleDate: new Date("2022-06-01"),
      salePrice: 12,
      saleCosts: 0,
      quantity: 50,
      ownershipPercentage: 100,
    });
    expect(result.grossGainLoss).toBe(-400); // (12-20)*50
    expect(result.grossGainLoss).toBeLessThan(0);
  });

  it("applies ownership percentage to both cost base and proceeds (joint ownership)", () => {
    const full = calculateDisposal({
      purchaseDate: new Date("2020-01-01"),
      purchasePrice: 10,
      purchaseCosts: 0,
      saleDate: new Date("2023-01-01"),
      salePrice: 20,
      saleCosts: 0,
      quantity: 100,
      ownershipPercentage: 100,
    });
    const half = calculateDisposal({
      purchaseDate: new Date("2020-01-01"),
      purchasePrice: 10,
      purchaseCosts: 0,
      saleDate: new Date("2023-01-01"),
      salePrice: 20,
      saleCosts: 0,
      quantity: 100,
      ownershipPercentage: 50,
    });
    expect(half.costBase).toBe(full.costBase / 2);
    expect(half.proceeds).toBe(full.proceeds / 2);
    expect(half.grossGainLoss).toBe(full.grossGainLoss / 2);
  });

  it("computes holding period in whole days", () => {
    const result = calculateDisposal({
      purchaseDate: new Date("2023-01-01T00:00:00Z"),
      purchasePrice: 1,
      purchaseCosts: 0,
      saleDate: new Date("2023-01-11T00:00:00Z"),
      salePrice: 1,
      saleCosts: 0,
      quantity: 1,
      ownershipPercentage: 100,
    });
    expect(result.holdingPeriodDays).toBe(10);
  });

  it("flags eligibleForDiscountInformationalOnly when held over 365 days, not otherwise", () => {
    const heldLong = calculateDisposal({
      purchaseDate: new Date("2020-01-01"),
      purchasePrice: 1,
      purchaseCosts: 0,
      saleDate: new Date("2022-01-01"),
      salePrice: 1,
      saleCosts: 0,
      quantity: 1,
      ownershipPercentage: 100,
    });
    const heldShort = calculateDisposal({
      purchaseDate: new Date("2023-01-01"),
      purchasePrice: 1,
      purchaseCosts: 0,
      saleDate: new Date("2023-03-01"),
      salePrice: 1,
      saleCosts: 0,
      quantity: 1,
      ownershipPercentage: 100,
    });
    expect(heldLong.eligibleForDiscountInformationalOnly).toBe(true);
    expect(heldShort.eligibleForDiscountInformationalOnly).toBe(false);
  });
});
