import { describe, expect, it } from "vitest";
import { confidence, recencyDecay, SOURCE_WEIGHTS, tier } from "./confidence";

describe("confidence scoring", () => {
  it("uses the specified source weights", () => {
    expect(SOURCE_WEIGHTS).toEqual({
      official: 1.0,
      audited: 0.95,
      community3: 0.8,
      community: 0.5,
      osm: 0.4,
      ai: 0.3,
    });
  });

  it("halves a permanent feature's weight every 90 days", () => {
    expect(recencyDecay({ daysAgo: 90 })).toBeCloseTo(0.5);
    expect(recencyDecay({ daysAgo: 180 })).toBeCloseTo(0.25);
  });

  it("expires temporary obstacles after 7 days", () => {
    expect(recencyDecay({ daysAgo: 7, temporary: true })).toBe(1);
    expect(recencyDecay({ daysAgo: 8, temporary: true })).toBe(0);
    expect(tier({ source: "community3", daysAgo: 8, confirmations: 5, conflicts: 0, temporary: true })).toBe("outdated");
  });

  it("lowers confidence when reports conflict", () => {
    const base = { source: "community" as const, daysAgo: 0, confirmations: 1 };
    expect(confidence({ ...base, conflicts: 1 })).toBeLessThan(confidence({ ...base, conflicts: 0 }));
  });

  it("never lets AI-only data reach Verified or Community-confirmed", () => {
    expect(tier({ source: "ai", daysAgo: 0, confirmations: 0, conflicts: 0 })).toBe("unconfirmed");
  });

  it("marks fresh official data Verified and 3+ community confirmations Community-confirmed", () => {
    expect(tier({ source: "official", daysAgo: 10, confirmations: 1, conflicts: 0 })).toBe("verified");
    expect(tier({ source: "community3", daysAgo: 10, confirmations: 3, conflicts: 0 })).toBe("community");
  });
});
