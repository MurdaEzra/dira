import type { Evidence, Source } from "./types";

/** Base trust per source, from the DIRA confidence spec. */
export const SOURCE_WEIGHTS: Record<Source, number> = {
  official: 1.0,
  audited: 0.95,
  community3: 0.8,
  community: 0.5,
  osm: 0.4,
  ai: 0.3,
};

/** Permanent features halve in weight every 90 days without re-confirmation. */
export const HALF_LIFE_DAYS = 90;
/** Temporary obstacles auto-expire after 7 days unless re-confirmed. */
export const TEMPORARY_TTL_DAYS = 7;

export type Tier = "verified" | "community" | "unconfirmed" | "outdated";

export function recencyDecay(e: Pick<Evidence, "daysAgo" | "temporary">): number {
  if (e.temporary) return e.daysAgo > TEMPORARY_TTL_DAYS ? 0 : 1;
  return Math.pow(0.5, e.daysAgo / HALF_LIFE_DAYS);
}

export function corroborationBoost(confirmations: number): number {
  return Math.min(1.25, 1 + 0.08 * Math.max(0, confirmations - 1));
}

export function conflictPenalty(conflicts: number): number {
  return Math.min(0.6, 0.2 * Math.max(0, conflicts));
}

/** confidence = source_weight × recency_decay × corroboration_boost × (1 − conflict_penalty), clamped 0..1 */
export function confidence(e: Evidence): number {
  const raw =
    SOURCE_WEIGHTS[e.source] *
    recencyDecay(e) *
    corroborationBoost(e.confirmations) *
    (1 - conflictPenalty(e.conflicts));
  return Math.max(0, Math.min(1, raw));
}

export function isExpired(e: Evidence): boolean {
  return !!e.temporary && e.daysAgo > TEMPORARY_TTL_DAYS;
}

export function needsRecheck(e: Evidence): boolean {
  return e.conflicts > 0;
}

export function tier(e: Evidence): Tier {
  // Older than two half-lives (or an expired temporary obstacle) reads as outdated, whatever the source.
  if (isExpired(e) || (!e.temporary && e.daysAgo > HALF_LIFE_DAYS * 2)) return "outdated";
  const c = confidence(e);
  if ((e.source === "official" || e.source === "audited") && c >= 0.6) return "verified";
  if ((e.source === "community3" || e.confirmations >= 3) && c >= 0.4) return "community";
  return "unconfirmed";
}

export const TIER_ORDER: Tier[] = ["verified", "community", "unconfirmed", "outdated"];

/** True when a place/barrier tier meets a minimum tier (verified is strictest). */
export function meetsTier(t: Tier, min: Tier | "any"): boolean {
  if (min === "any") return true;
  return TIER_ORDER.indexOf(t) <= TIER_ORDER.indexOf(min);
}
