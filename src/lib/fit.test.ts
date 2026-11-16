import { describe, expect, it } from "vitest";
import { fitScore } from "./fit";
import { DEFAULT_PROFILE, FEATURE_KEYS, type AccessProfile, type FeatureStatus, type Place } from "./types";

function place(overrides: Partial<Record<(typeof FEATURE_KEYS)[number], FeatureStatus>>): Place {
  return {
    id: "t",
    name: "Test",
    category: "restaurant",
    area: "CBD",
    lat: 0,
    lng: 0,
    features: FEATURE_KEYS.map((key) => ({
      key,
      status: overrides[key] ?? "yes",
      evidence: { source: "official", daysAgo: 0, confirmations: 1, conflicts: 0 },
    })),
  };
}

const wheelchair: AccessProfile = { ...DEFAULT_PROFILE, mobility: ["manual_wheelchair"] };
const deaf: AccessProfile = { ...DEFAULT_PROFILE, mobility: ["deaf_hoh"] };

describe("fit score", () => {
  it("scores a fully accessible, officially verified place at 100", () => {
    expect(fitScore(place({}), wheelchair)).toBe(100);
  });

  it("penalises a missing step-free entrance more for a wheelchair user than for a deaf user", () => {
    const p = place({ step_free_entrance: "no", ramp: "no" });
    expect(fitScore(p, wheelchair)).toBeLessThan(fitScore(p, deaf));
  });

  it("ranks a place lower when a required lift is missing", () => {
    const needsLift: AccessProfile = { ...DEFAULT_PROFILE, needs: { ...DEFAULT_PROFILE.needs, lift: true } };
    expect(fitScore(place({ lift: "no" }), needsLift)).toBeLessThan(fitScore(place({}), needsLift));
  });
});
