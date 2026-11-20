import { describe, expect, it } from "vitest";
import { assessRoute, avoidPoints, flagBarriers, slopeClass } from "./route-score";
import { DEFAULT_PROFILE, type Barrier } from "./types";
import type { RouteOption } from "./route-types";

// A straight 1.1 km east–west line through central Nairobi.
const coords: [number, number][] = Array.from({ length: 11 }, (_, i) => [
  36.81 + i * 0.001,
  -1.285,
]);
const route: RouteOption = {
  kind: "fastest",
  coords,
  distance: 1113,
  duration: 800,
  steps: [],
  steepness: [],
  approx: false,
};

function barrier(
  id: string,
  over: Partial<Barrier> & { lat?: number; daysAgo?: number } = {},
): Barrier {
  return {
    id,
    type: "blocked_path",
    severity: over.severity ?? "high",
    area: "CBD",
    lat: over.lat ?? -1.285,
    lng: over.lng ?? 36.815,
    status: over.status ?? "community_confirmed",
    evidence: {
      source: "community3",
      daysAgo: over.daysAgo ?? 2,
      confirmations: 4,
      conflicts: 0,
      temporary: false,
    },
  };
}

describe("flagBarriers", () => {
  it("flags a barrier sitting on the route", () => {
    expect(flagBarriers(coords, [barrier("on")])).toHaveLength(1);
  });
  it("ignores a barrier ~110 m off the route", () => {
    expect(flagBarriers(coords, [barrier("off", { lat: -1.286 })])).toHaveLength(0);
  });
  it("ignores resolved barriers", () => {
    expect(flagBarriers(coords, [barrier("done", { status: "resolved" })])).toHaveLength(0);
  });
});

describe("assessRoute", () => {
  it("scores a clear route 100", () => {
    expect(assessRoute(route, [], DEFAULT_PROFILE).score).toBe(100);
  });
  it("a blocking barrier costs more than a low one", () => {
    const blocking = assessRoute(
      route,
      [barrier("a", { severity: "blocking" })],
      DEFAULT_PROFILE,
    ).score;
    const low = assessRoute(route, [barrier("b", { severity: "low" })], DEFAULT_PROFILE).score;
    expect(blocking).toBeLessThan(low);
  });
  it("a manual wheelchair user gets a longer adjusted time than the baseline", () => {
    const base = assessRoute(route, [], DEFAULT_PROFILE).minutes;
    const wc = assessRoute(route, [], {
      ...DEFAULT_PROFILE,
      mobility: ["manual_wheelchair"],
    }).minutes;
    expect(wc).toBeGreaterThan(base);
  });
  it("marks slopes steeper than the person's limit as caution", () => {
    const steep = { ...route, steepness: [[2, 5, 4]] as [number, number, number][] };
    const a = assessRoute(steep, [], { ...DEFAULT_PROFILE, maxSlope: 6 });
    expect(a.segments.some((s) => s.kind === "caution")).toBe(true);
    expect(a.score).toBeLessThan(100);
  });
});

describe("avoidPoints", () => {
  it("strict avoids a medium barrier, balanced does not", () => {
    const b = [barrier("m", { severity: "medium" })];
    expect(avoidPoints(b, "strict")).toHaveLength(1);
    expect(avoidPoints(b, "balanced")).toHaveLength(0);
  });
  it("balanced avoids a community-confirmed blocking barrier", () => {
    expect(avoidPoints([barrier("x", { severity: "blocking" })], "balanced")).toHaveLength(1);
  });
});

describe("slopeClass", () => {
  it("maps an 8 % limit to class 3", () => {
    expect(slopeClass(8)).toBe(3);
  });
});
