import { useMemo } from "react";
import { usePrefs } from "./prefs";
import { useCityData } from "./data";
import { distanceKm, fitBand, fitScore } from "./fit";
import { lastVerified, placeTier } from "./place";
import type { Place } from "./types";
import type { Tier } from "./confidence";
import type { Evidence } from "./types";

export interface ScoredPlace {
  place: Place;
  score: number;
  band: "good" | "partial" | "poor";
  tier: Tier;
  last: Evidence;
  km: number;
}

export function scorePlaces(
  places: Place[],
  profile: Parameters<typeof fitScore>[1],
  here: { lat: number; lng: number },
): ScoredPlace[] {
  return places
    .map((place) => {
      const score = fitScore(place, profile);
      return {
        place,
        score,
        band: fitBand(score),
        tier: placeTier(place),
        last: lastVerified(place),
        km: distanceKm(here, place),
      };
    })
    .sort((a, b) => b.score - a.score || a.km - b.km);
}

export function useScoredPlaces() {
  const { profile, here } = usePrefs();
  const { places } = useCityData();
  return useMemo(() => scorePlaces(places, profile, here), [places, profile, here]);
}
