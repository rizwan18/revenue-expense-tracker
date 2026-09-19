import { describe, it, expect } from "vitest";
import { groupPropertyTotals, isPropertyType, findConflictingPpr, pprConflictMessage } from "../lib/propertyTypes";

describe("groupPropertyTotals", () => {
  const properties = [
    { propertyType: "INVESTMENT", currentEstimatedValue: 480000, loanBalance: 210000 },
    { propertyType: "INVESTMENT", currentEstimatedValue: 520000, loanBalance: 260000 },
    { propertyType: "PPR", currentEstimatedValue: 610000, loanBalance: 95000 },
  ];

  it("keeps investment properties and the family home apart", () => {
    const t = groupPropertyTotals(properties);
    expect(t.investment).toEqual({ count: 2, value: 1000000, loanBalance: 470000, equity: 530000 });
    expect(t.ppr).toEqual({ count: 1, value: 610000, loanBalance: 95000, equity: 515000 });
  });

  it("treats missing values as zero and unknown types as investment", () => {
    const t = groupPropertyTotals([{ propertyType: "SOMETHING", currentEstimatedValue: null, loanBalance: null }]);
    expect(t.investment.count).toBe(1);
    expect(t.investment.equity).toBe(0);
    expect(t.ppr.count).toBe(0);
  });

  it("handles no properties", () => {
    const t = groupPropertyTotals([]);
    expect(t.investment.count + t.ppr.count).toBe(0);
  });
});

describe("isPropertyType", () => {
  it("accepts only the two known types", () => {
    expect(isPropertyType("INVESTMENT")).toBe(true);
    expect(isPropertyType("PPR")).toBe(true);
    expect(isPropertyType("HOLIDAY")).toBe(false);
    expect(isPropertyType(undefined)).toBe(false);
  });
});

describe("one principal place of residence per person", () => {
  const owned = [
    { id: "a", name: "Maple Street", propertyType: "INVESTMENT" },
    { id: "b", name: "Family Home", propertyType: "PPR" },
  ];

  it("blocks a second PPR (new property, or converting an investment property)", () => {
    expect(findConflictingPpr(owned)?.name).toBe("Family Home");
    expect(findConflictingPpr(owned, "a")?.name).toBe("Family Home");
  });

  it("does not block a person who has no PPR yet", () => {
    expect(findConflictingPpr([{ id: "a", name: "Maple Street", propertyType: "INVESTMENT" }])).toBeNull();
    expect(findConflictingPpr([])).toBeNull();
  });

  it("does not conflict with itself (editing the existing PPR)", () => {
    expect(findConflictingPpr(owned, "b")).toBeNull();
  });

  it("explains the rule and how to move on", () => {
    const msg = pprConflictMessage("Family Home");
    expect(msg).toContain("Family Home");
    expect(msg).toContain("only have one");
    expect(msg).toContain("investment property");
  });
});
