/** Shared, serialisable route shapes (server function ↔ browser). Coordinates are [lng, lat]. */
export type RouteKind = "accessible" | "balanced" | "fastest";

export interface RouteStep {
  /** OpenRouteService instruction type (0–13). */
  type: number;
  name: string;
  distance: number;
  duration: number;
  /** Index range into `coords`. */
  from: number;
  to: number;
}

export interface RouteOption {
  kind: RouteKind;
  coords: [number, number][];
  distance: number; // metres
  duration: number; // seconds, walking/rolling baseline
  steps: RouteStep[];
  /** [fromIndex, toIndex, steepnessClass −5..5] from OpenRouteService. */
  steepness: [number, number, number][];
  approx: boolean;
}

export interface AvoidPoint {
  lat: number;
  lng: number;
}

export interface PlanInput {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  limits: { maxSlope: number; minWidth: number; maxKerb: number; smoothOnly: boolean };
  avoidStrict: AvoidPoint[];
  avoidBalanced: AvoidPoint[];
}

export interface PlanResult {
  options: RouteOption[];
  source: "ors" | "fallback";
}
