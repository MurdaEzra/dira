/**
 * City data comes from Supabase. Empty/offline states stay explicit instead of showing sample records.
 */
import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BARRIER_TYPES,
  CATEGORIES,
  FEATURE_KEYS,
  type AccessPoint,
  type Barrier,
  type BarrierStatus,
  type BarrierType,
  type Category,
  type FeatureKey,
  type FeatureStatus,
  type Place,
  type Severity,
  type Source,
} from "./types";

export interface CityData {
  places: Place[];
  barriers: Barrier[];
  accessPoints: AccessPoint[];
  source: "cloud" | "empty";
}

export const EMPTY_CITY: CityData = {
  places: [],
  barriers: [],
  accessPoints: [],
  source: "empty",
};

const SOURCES: Source[] = ["official", "audited", "community3", "community", "osm", "ai"];
const SEVERITIES: Severity[] = ["low", "medium", "high", "blocking"];
const BSTATUS: BarrierStatus[] = [
  "reported",
  "ai_triaged",
  "community_confirmed",
  "sent_to_authority",
  "resolved",
  "reopened",
];
const FSTATUS: FeatureStatus[] = ["yes", "partial", "no", "unknown"];

function pick<T extends string>(list: readonly T[], v: string, fallback: T): T {
  return (list as readonly string[]).includes(v) ? (v as T) : fallback;
}

export function daysSince(iso: string, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86_400_000));
}

async function fetchCity(): Promise<CityData> {
  const [p, b, a] = await Promise.all([
    supabase
      .from("places")
      .select("id, name, category, area, lat, lng, is_demo, place_features(*)")
      .order("name"),
    supabase.from("barriers").select("*").order("created_at", { ascending: false }).limit(1000),
    supabase.from("access_points").select("*"),
  ]);
  if (p.error || b.error || a.error) throw p.error ?? b.error ?? a.error;

  const places: Place[] = p.data
    .filter((r) => !r.is_demo)
    .map((r) => {
      const byKey = new Map(r.place_features.map((f) => [f.feature, f]));
      return {
        id: r.id,
        name: r.name,
        category: pick<Category>(CATEGORIES, r.category, "public"),
        area: r.area,
        lat: r.lat,
        lng: r.lng,
        features: FEATURE_KEYS.map((key: FeatureKey) => {
          const f = byKey.get(key);
          return {
            key,
            status: f ? pick(FSTATUS, f.status, "unknown") : "unknown",
            evidence: f
              ? {
                  source: pick(SOURCES, f.source, "community"),
                  daysAgo: daysSince(f.last_confirmed_at),
                  confirmations: f.confirmations,
                  conflicts: f.conflicts,
                }
              : { source: "osm", daysAgo: 999, confirmations: 0, conflicts: 0 },
          };
        }),
      };
    });

  const barriers: Barrier[] = b.data
    .filter((r) => !r.is_demo)
    .map((r) => ({
      id: r.id,
      type: pick<BarrierType>(BARRIER_TYPES, r.type, "other"),
      severity: pick(SEVERITIES, r.severity, "medium"),
      area: r.area,
      lat: r.lat,
      lng: r.lng,
      status: pick(BSTATUS, r.status, "reported"),
      note: r.note,
      reporterId: r.reporter_id,
      evidence: {
        source: pick(SOURCES, r.source, "community"),
        daysAgo: daysSince(r.last_confirmed_at),
        confirmations: r.confirmations,
        conflicts: r.conflicts,
        temporary: r.is_temporary,
      },
    }));

  const accessPoints: AccessPoint[] = a.data
    .filter((r) => !/^r(?:0[1-9]|10)$/.test(r.id))
    .map((r) => ({
      id: r.id,
      kind: r.kind === "entrance" ? "entrance" : "ramp",
      area: r.area,
      lat: r.lat,
      lng: r.lng,
      evidence: {
        source: pick(SOURCES, r.source, "community"),
        daysAgo: daysSince(r.last_confirmed_at),
        confirmations: r.confirmations,
        conflicts: 0,
      },
    }));

  return { places, barriers, accessPoints, source: "cloud" };
}

export const cityQuery = queryOptions({
  queryKey: ["city"],
  queryFn: fetchCity,
  staleTime: 60_000,
  retry: 1,
});

/** Reads live Supabase records only. An empty result stays empty instead of showing sample venues. */
export function useCityData(): CityData {
  const q = useQuery({ ...cityQuery, initialData: EMPTY_CITY, initialDataUpdatedAt: 0 });
  return q.data;
}

export function useCityDataStatus() {
  const q = useQuery({ ...cityQuery, initialData: EMPTY_CITY, initialDataUpdatedAt: 0 });
  return { loading: q.isFetching && q.data.source === "empty", error: q.isError };
}

/** Nearest known area name for a point — used to label new reports. */
export function nearestArea(city: CityData, lat: number, lng: number) {
  let best = { d: Infinity, area: "" };
  for (const p of city.places) {
    const d = (p.lat - lat) ** 2 + ((p.lng - lng) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (d < best.d) best = { d, area: p.area };
  }
  return best.area;
}
