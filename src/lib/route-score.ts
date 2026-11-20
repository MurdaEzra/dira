/**
 * Route maths: which barriers sit on a route, what to avoid, and how hard a route is for this person.
 * Trust always comes from confidence.ts — never re-derived here.
 */
import { confidence, isExpired, tier, type Tier } from "./confidence";
import type { AccessProfile, Barrier, Severity } from "./types";
import type { AvoidPoint, RouteOption } from "./route-types";

const M_PER_DEG = 111_320;

export function metersBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const k = Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  return M_PER_DEG * Math.hypot(a.lat - b.lat, (a.lng - b.lng) * k);
}

/** Distance from a point to a polyline, and the index of the nearest vertex. */
export function nearestOnLine(coords: [number, number][], p: { lat: number; lng: number }) {
  const k = Math.cos((p.lat * Math.PI) / 180);
  let best = { d: Infinity, index: 0 };
  for (let i = 0; i < coords.length - 1; i++) {
    const [ax, ay] = [coords[i]![0] * k, coords[i]![1]];
    const [bx, by] = [coords[i + 1]![0] * k, coords[i + 1]![1]];
    const [px, py] = [p.lng * k, p.lat];
    const dx = bx - ax;
    const dy = by - ay;
    const len = dx * dx + dy * dy;
    const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
    const d = M_PER_DEG * Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    if (d < best.d) best = { d, index: t < 0.5 ? i : i + 1 };
  }
  if (coords.length === 1)
    best = { d: metersBetween(p, { lng: coords[0]![0], lat: coords[0]![1] }), index: 0 };
  return best;
}

export function isActive(b: Barrier) {
  return b.status !== "resolved" && !isExpired(b.evidence);
}

/** Barriers to route around. Strict ("most accessible") avoids anything medium+; balanced only trusted high+. */
export function avoidPoints(barriers: Barrier[], level: "strict" | "balanced"): AvoidPoint[] {
  return barriers
    .filter((b) => {
      if (!isActive(b)) return false;
      const c = confidence(b.evidence);
      if (level === "strict") return b.severity !== "low" && c >= 0.2;
      const trusted: Tier[] = ["verified", "community"];
      return (
        (b.severity === "blocking" || b.severity === "high") && trusted.includes(tier(b.evidence))
      );
    })
    .slice(0, 60)
    .map((b) => ({ lat: b.lat, lng: b.lng }));
}

export interface FlaggedBarrier {
  barrier: Barrier;
  index: number;
  meters: number;
  confidence: number;
  tier: Tier;
}

/** Active barriers within `radius` metres of the route line, in route order. */
export function flagBarriers(
  coords: [number, number][],
  barriers: Barrier[],
  radius = 25,
): FlaggedBarrier[] {
  if (coords.length === 0) return [];
  return barriers
    .filter(isActive)
    .map((barrier) => {
      const n = nearestOnLine(coords, barrier);
      return {
        barrier,
        index: n.index,
        meters: n.d,
        confidence: confidence(barrier.evidence),
        tier: tier(barrier.evidence),
      };
    })
    .filter((f) => f.meters <= radius)
    .sort((a, b) => a.index - b.index);
}

const SEV_PENALTY: Record<Severity, number> = { low: 6, medium: 14, high: 26, blocking: 40 };
const SEV_MINUTES: Record<Severity, number> = { low: 1, medium: 2, high: 4, blocking: 8 };

/** OpenRouteService steepness class the person can manage (1 = up to 3 %, 2 = 4–6 %, 3 = 7–9 %, 4 = 10–15 %). */
export function slopeClass(maxSlope: number) {
  if (maxSlope <= 3) return 1;
  if (maxSlope <= 6) return 2;
  if (maxSlope <= 9) return 3;
  if (maxSlope <= 15) return 4;
  return 5;
}

/** Relative speed versus a walking baseline. */
export function speedFactor(p: AccessProfile) {
  const m = p.mobility;
  if (m.includes("manual_wheelchair")) return 0.8;
  if (m.includes("walking_aid") || m.includes("older_adult") || m.includes("temporary"))
    return 0.65;
  if (m.includes("blind_low_vision")) return 0.75;
  if (m.includes("stroller")) return 0.9;
  return 1;
}

export type SegmentKind = "ok" | "caution" | "barrier";
export interface Segment {
  from: number;
  to: number;
  kind: SegmentKind;
}

export interface RouteAssessment {
  score: number; // 0–100, higher is more accessible for this person
  minutes: number; // adjusted for the person's pace and expected barriers
  effort: "low" | "moderate" | "high";
  steepMeters: number;
  flagged: FlaggedBarrier[];
  segments: Segment[];
}

function segLen(coords: [number, number][], i: number) {
  const a = coords[i]!;
  const b = coords[i + 1]!;
  return metersBetween({ lng: a[0], lat: a[1] }, { lng: b[0], lat: b[1] });
}

export function assessRoute(
  route: RouteOption,
  barriers: Barrier[],
  profile: AccessProfile,
): RouteAssessment {
  const flagged = flagBarriers(route.coords, barriers);
  const n = Math.max(0, route.coords.length - 1);
  const kinds: SegmentKind[] = new Array(n).fill("ok");
  const limit = slopeClass(profile.maxSlope);

  let steepMeters = 0;
  for (const [from, to, cls] of route.steepness) {
    if (Math.abs(cls) <= limit) continue;
    for (let i = from; i < Math.min(to, n); i++) {
      kinds[i] = "caution";
      steepMeters += segLen(route.coords, i);
    }
  }
  for (const f of flagged) {
    for (let i = Math.max(0, f.index - 1); i <= Math.min(n - 1, f.index); i++) kinds[i] = "barrier";
  }

  const segments: Segment[] = [];
  kinds.forEach((kind, i) => {
    const last = segments[segments.length - 1];
    if (last && last.kind === kind && last.to === i) last.to = i + 1;
    else segments.push({ from: i, to: i + 1, kind });
  });

  const steepShare = route.distance > 0 ? steepMeters / route.distance : 0;
  const barrierPenalty = flagged.reduce(
    (s, f) => s + SEV_PENALTY[f.barrier.severity] * Math.max(0.35, f.confidence),
    0,
  );
  const score = Math.round(
    Math.max(0, Math.min(100, 100 - barrierPenalty - Math.min(30, steepShare * 120))),
  );

  const delay = flagged.reduce(
    (s, f) => s + SEV_MINUTES[f.barrier.severity] * Math.max(0.35, f.confidence),
    0,
  );
  const minutes = Math.max(
    1,
    Math.round(route.duration / 60 / speedFactor(profile) + delay + steepMeters / 60),
  );

  const effort =
    steepShare > 0.15 || route.distance > 2500
      ? "high"
      : steepShare > 0.05 || route.distance > 1200
        ? "moderate"
        : "low";

  return { score, minutes, effort, steepMeters: Math.round(steepMeters), flagged, segments };
}
