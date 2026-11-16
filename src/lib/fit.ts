import { confidence } from "./confidence";
import type { AccessProfile, FeatureKey, FeatureStatus, Place } from "./types";

const STATUS_VALUE: Record<FeatureStatus, number> = { yes: 1, partial: 0.5, no: 0, unknown: 0.3 };
/** What we assume when evidence is weak: slightly pessimistic. */
const PRIOR = 0.35;

/** How much each feature matters to this person. 0 = ignored. */
export function featureWeights(p: AccessProfile): Partial<Record<FeatureKey, number>> {
  const w: Partial<Record<FeatureKey, number>> = {
    step_free_entrance: 1,
    accessible_toilet: 1,
    staff_assistance: 0.5,
    seating: 0.5,
  };
  const bump = (k: FeatureKey, v: number) => (w[k] = Math.max(w[k] ?? 0, v));
  const m = new Set(p.mobility);
  if (m.has("manual_wheelchair") || m.has("powered_wheelchair")) {
    bump("step_free_entrance", 3);
    bump("ramp", 2);
    bump("door_width", 2);
    bump("wide_aisles", 1.5);
    bump("accessible_toilet", 2);
    bump("lift", 1.5);
  }
  if (m.has("powered_wheelchair")) bump("automatic_door", 1.5);
  if (m.has("walking_aid") || m.has("older_adult") || m.has("temporary")) {
    bump("step_free_entrance", 2);
    bump("seating", 2);
    bump("lift", 1.5);
  }
  if (m.has("stroller")) {
    bump("step_free_entrance", 2);
    bump("lift", 1.5);
    bump("wide_aisles", 1);
  }
  if (m.has("blind_low_vision")) {
    bump("tactile_signage", 3);
    bump("staff_assistance", 2);
  }
  if (m.has("deaf_hoh")) {
    bump("hearing_loop", 3);
    bump("staff_assistance", 1);
  }
  if (m.has("cognitive")) {
    bump("quiet_hours", 2);
    bump("staff_assistance", 2);
  }
  if (p.stairs === "never") bump("step_free_entrance", 3);
  if (p.needs.lift) bump("lift", 3);
  if (p.needs.toilet) bump("accessible_toilet", 3);
  if (p.needs.parking) bump("accessible_parking", 3);
  return w;
}

/** Status value blended with the prior by how much we trust the data. */
export function effectiveValue(status: FeatureStatus, conf: number): number {
  return conf * STATUS_VALUE[status] + (1 - conf) * PRIOR;
}

/** 0–100: how well a place fits this person's profile. */
export function fitScore(place: Place, profile: AccessProfile): number {
  const weights = featureWeights(profile);
  let num = 0;
  let den = 0;
  for (const [key, w] of Object.entries(weights) as [FeatureKey, number][]) {
    if (!w) continue;
    const f = place.features.find((x) => x.key === key);
    const v = f ? effectiveValue(f.status, confidence(f.evidence)) : PRIOR;
    num += w * v;
    den += w;
  }
  return den === 0 ? 0 : Math.round((100 * num) / den);
}

/** Features that matter most to the person and are present at the place. */
export function topFeatures(place: Place, profile: AccessProfile, n = 3) {
  const weights = featureWeights(profile);
  return place.features
    .filter((f) => f.status === "yes" || f.status === "partial")
    .sort(
      (a, b) =>
        (weights[b.key] ?? 0.2) * (b.status === "yes" ? 1 : 0.5) -
        (weights[a.key] ?? 0.2) * (a.status === "yes" ? 1 : 0.5),
    )
    .slice(0, n);
}

/** Overall standing used for map pin shape. */
export function fitBand(score: number): "good" | "partial" | "poor" {
  if (score >= 70) return "good";
  if (score >= 45) return "partial";
  return "poor";
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
