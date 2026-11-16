import { confidence, tier, TIER_ORDER, type Tier } from "./confidence";
import type { Place } from "./types";

/** Most common tier across a place's known features; ties go to the less trusted tier. */
export function placeTier(place: Place): Tier {
  const counts: Record<Tier, number> = { verified: 0, community: 0, unconfirmed: 0, outdated: 0 };
  for (const f of place.features) if (f.status !== "unknown") counts[tier(f.evidence)]++;
  let best: Tier = "unconfirmed";
  let n = -1;
  for (const t of TIER_ORDER) {
    if (counts[t] >= n) {
      best = t;
      n = counts[t];
    }
  }
  return best;
}

/** Freshest evidence among the features that set the place's tier, so the label and the line agree. */
export function lastVerified(place: Place) {
  const t = placeTier(place);
  const sameTier = place.features.filter((f) => f.status !== "unknown" && tier(f.evidence) === t);
  const known = sameTier.length ? sameTier : place.features.filter((f) => f.status !== "unknown");
  const list = known.length ? known : place.features;
  const freshest = list.reduce((a, b) => (b.evidence.daysAgo < a.evidence.daysAgo ? b : a));
  return freshest.evidence;
}

export function avgConfidence(place: Place) {
  const known = place.features.filter((f) => f.status !== "unknown");
  if (!known.length) return 0;
  return known.reduce((s, f) => s + confidence(f.evidence), 0) / known.length;
}
