/**
 * DEMO DATA — Nairobi. All venue names are fictional. Nothing here describes a real venue.
 */
import {
  FEATURE_KEYS,
  type AccessPoint,
  type Barrier,
  type BarrierStatus,
  type BarrierType,
  type Category,
  type Evidence,
  type FeatureStatus,
  type Place,
  type Severity,
  type Source,
} from "@/lib/types";

export const CITY = { name: "Nairobi", center: { lat: -1.2864, lng: 36.8172 }, zoom: 12.6 };

const SRC: Record<string, Source> = {
  O: "official",
  A: "audited",
  C: "community3",
  S: "community",
  M: "osm",
  I: "ai",
};
const ST: Record<string, FeatureStatus> = { Y: "yes", P: "partial", N: "no", U: "unknown" };

function hash(s: string) {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

type Row = [string, string, Category, string, number, number, string, string, number];

// id, name, category, area, lat, lng, 13 feature statuses (FEATURE_KEYS order), sources, base days
const ROWS: Row[] = [
  ["mvule-kitchen", "Mvule Kitchen", "restaurant", "Westlands", -1.2668, 36.8061, "YYYNUYPYYYNNP", "AC", 10],
  ["jacaranda-courtyard", "Jacaranda Courtyard Café", "restaurant", "Kilimani", -1.2903, 36.7871, "YNYNUPNYYYNNY", "CS", 30],
  ["nyama-terrace", "Nyama Terrace", "restaurant", "CBD", -1.2846, 36.8241, "NNPNNNNPYYNNN", "SM", 60],
  ["kahawa-corner", "Kahawa Corner", "restaurant", "Ngara", -1.2747, 36.8262, "PYPNUNNPYYUUU", "SI", 20],
  ["pilau-house", "Pilau House", "restaurant", "South B", -1.3101, 36.8378, "YYYNUYYYYYNNU", "C", 14],
  ["mango-leaf", "Mango Leaf Eatery", "restaurant", "Hurlingham", -1.2951, 36.7993, "UUUUUUUUYUUUU", "M", 200],
  ["uhai-clinic", "Uhai Community Clinic", "hospital", "Ngara", -1.2722, 36.8296, "YYYYYYYYYYYPY", "OA", 5],
  ["tumaini-general", "Tumaini General Hospital", "hospital", "Upper Hill", -1.3009, 36.8139, "YYYYYYYYYYPYN", "O", 12],
  ["afya-bora", "Afya Bora Medical Centre", "hospital", "Parklands", -1.2627, 36.8189, "YYYNYYPYYYNNN", "AC", 40],
  ["faraja-eye", "Faraja Eye & ENT Centre", "hospital", "Kilimani", -1.2937, 36.7832, "YYYYYYPYYYYYY", "A", 25],
  ["mlimani-tech", "Mlimani Institute of Technology", "university", "Upper Hill", -1.2978, 36.8181, "PYYNYPYYYYPNN", "CS", 50],
  ["chuo-pwani", "Chuo cha Pwani City Campus", "university", "CBD", -1.2817, 36.8166, "YYYYYYYYYYYYP", "O", 8],
  ["kilele-arts", "Kilele School of Arts", "university", "Lavington", -1.2771, 36.7718, "NNPNNNPUYYUUU", "SI", 15],
  ["hekima-library", "Hekima Open Library", "public", "CBD", -1.2858, 36.8196, "YYYYYYNYYYYYY", "OA", 6],
  ["baraka-mall", "Baraka Mall", "shopping", "Westlands", -1.2649, 36.8031, "YYYYYYYYYYNNN", "AC", 20],
  ["soko-huru", "Soko Huru Market Hall", "shopping", "CBD", -1.2831, 36.8275, "PNPNNNNNYYNNN", "SM", 100],
  ["riverside-arcade", "Riverside Arcade", "shopping", "Parklands", -1.2598, 36.8243, "YYYYPYYYYYNNU", "C", 35],
  ["jua-kali-crafts", "Jua Kali Crafts Centre", "shopping", "Ngara", -1.2761, 36.8311, "NNNNNNNNYYNNN", "S", 10],
  ["mwangaza-plaza", "Mwangaza Plaza", "shopping", "Lavington", -1.2797, 36.7681, "YYYYYYYYYYPNP", "A", 30],
  ["civic-services", "Civic Services Hall", "public", "CBD", -1.2879, 36.8221, "YYYNYYYYYYYPN", "O", 15],
  ["bustani-park", "Bustani Pocket Park", "public", "Kilimani", -1.2889, 36.7905, "YYUNUPNUYNNNY", "C", 40],
  ["records-office", "County Records Office", "public", "Upper Hill", -1.2962, 36.8121, "PYPNPNYNYYNNN", "S", 70],
  ["sauti-centre", "Sauti Community Centre", "public", "South B", -1.3082, 36.8415, "YYYNNYNYYYYYY", "C", 18],
  ["matatu-north", "Kituo Matatu Stage North", "transport", "CBD", -1.2808, 36.8259, "PNNNNNNNPPNNN", "SM", 25],
  ["reli-terminus", "Reli Bus Terminus", "transport", "CBD", -1.2899, 36.8268, "YYYNNPNYYYYNN", "AC", 45],
  ["westlands-feeder", "Westlands Feeder Stop", "transport", "Westlands", -1.2689, 36.8117, "YYUNUNNUPNYUU", "I", 3],
  ["gigiri-shuttle", "Gigiri Link Shuttle Point", "transport", "Gigiri", -1.2341, 36.8061, "YYYYUYYYYYYNN", "O", 20],
  ["ngong-cycle-ride", "Ngong Road Cycle & Ride", "transport", "Kilimani", -1.2995, 36.7889, "YPYNNNYUPNNNN", "M", 130],
  ["nuru-rooftop", "Nuru Rooftop Grill", "restaurant", "Parklands", -1.2619, 36.8152, "NNYNYPNYYYNNN", "CS", 22],
  ["amani-rehab", "Amani Rehab & Physio", "hospital", "Hurlingham", -1.2974, 36.7962, "YYYYYYYYYYYYY", "OA", 3],
];

function evidenceFor(id: string, i: number, sources: string, baseDays: number): Evidence {
  const h = hash(id);
  const src = SRC[sources[(h + i) % sources.length] ?? "S"] ?? "community";
  const daysAgo = baseDays + ((i * 37 + h) % 40);
  const confirmations =
    src === "community3" ? 3 + ((h + i) % 6) : src === "osm" || src === "ai" ? 0 : 1 + ((h + i) % 2);
  const conflicts = (h + i * 7) % 19 === 0 ? 1 : 0;
  return { source: src, daysAgo, confirmations, conflicts };
}

export const PLACES: Place[] = ROWS.map(([id, name, category, area, lat, lng, feats, sources, days]) => ({
  id,
  name,
  category,
  area,
  lat,
  lng,
  features: FEATURE_KEYS.map((key, i) => ({
    key,
    status: ST[feats[i] ?? "U"] ?? "unknown",
    evidence: evidenceFor(id, i, sources, days),
  })),
}));

type BRow = [string, BarrierType, Severity, string, number, number, boolean, BarrierStatus, Source, number, number, number];

// id, type, severity, area, lat, lng, temporary, status, source, daysAgo, confirmations, conflicts
const BROWS: BRow[] = [
  ["b01", "blocked_path", "blocking", "CBD", -1.2852, 36.8229, true, "community_confirmed", "community3", 2, 5, 0],
  ["b02", "broken_ramp", "high", "CBD", -1.2869, 36.8188, false, "sent_to_authority", "audited", 20, 4, 0],
  ["b03", "no_dropped_kerb", "high", "Westlands", -1.2672, 36.8089, false, "community_confirmed", "community3", 35, 6, 0],
  ["b04", "stairs_only", "blocking", "Ngara", -1.2741, 36.8283, false, "reported", "community", 12, 1, 0],
  ["b05", "narrow", "medium", "Kilimani", -1.2911, 36.7859, false, "ai_triaged", "ai", 4, 0, 0],
  ["b06", "broken_lift", "blocking", "Upper Hill", -1.2988, 36.8148, true, "community_confirmed", "community3", 1, 3, 0],
  ["b07", "steep", "medium", "Upper Hill", -1.3015, 36.8171, false, "sent_to_authority", "official", 60, 2, 0],
  ["b08", "poor_surface", "medium", "South B", -1.3092, 36.8396, false, "reported", "community", 25, 1, 1],
  ["b09", "parked_vehicle", "high", "CBD", -1.2838, 36.8212, true, "reported", "community", 1, 1, 0],
  ["b10", "construction", "blocking", "Parklands", -1.2612, 36.8205, true, "community_confirmed", "community3", 3, 4, 0],
  ["b11", "flooding", "high", "South B", -1.3071, 36.8402, true, "reported", "community", 15, 2, 0],
  ["b12", "inaccessible_entrance", "high", "Lavington", -1.2783, 36.7702, false, "reported", "osm", 40, 0, 0],
  ["b13", "blocked_path", "medium", "Hurlingham", -1.2958, 36.7978, true, "ai_triaged", "ai", 2, 0, 0],
  ["b14", "no_dropped_kerb", "medium", "Kilimani", -1.2897, 36.7884, false, "reported", "community", 230, 1, 0],
  ["b15", "broken_ramp", "high", "Parklands", -1.2633, 36.8171, false, "resolved", "audited", 8, 3, 0],
  ["b16", "steep", "low", "Westlands", -1.2659, 36.8045, false, "community_confirmed", "community3", 70, 3, 0],
  ["b17", "poor_surface", "low", "Ngara", -1.2755, 36.8247, false, "reported", "osm", 300, 0, 0],
  ["b18", "construction", "high", "Upper Hill", -1.2969, 36.8109, true, "resolved", "community3", 20, 5, 0],
  ["b19", "narrow", "high", "CBD", -1.2824, 36.8249, false, "reopened", "community", 9, 2, 1],
  ["b20", "parked_vehicle", "medium", "Kilimani", -1.2929, 36.7848, true, "reported", "community", 11, 1, 0],
  ["b21", "stairs_only", "high", "CBD", -1.2889, 36.8241, false, "sent_to_authority", "official", 30, 2, 0],
  ["b22", "flooding", "medium", "CBD", -1.2875, 36.8262, true, "reported", "ai", 5, 0, 0],
  ["b23", "broken_lift", "high", "Westlands", -1.2643, 36.8022, false, "resolved", "official", 4, 1, 0],
  ["b24", "inaccessible_entrance", "medium", "Gigiri", -1.2352, 36.8072, false, "reported", "community", 190, 1, 0],
  ["b25", "other", "low", "Hurlingham", -1.2981, 36.7951, false, "ai_triaged", "ai", 6, 0, 0],
];

export const BARRIERS: Barrier[] = BROWS.map(
  ([id, type, severity, area, lat, lng, temporary, status, source, daysAgo, confirmations, conflicts]) => ({
    id,
    type,
    severity,
    area,
    lat,
    lng,
    status,
    evidence: { source, daysAgo, confirmations, conflicts, temporary },
  }),
);

export const ACCESS_POINTS: AccessPoint[] = [
  ["r01", "ramp", -1.2861, 36.8201, "CBD", "audited", 14, 3],
  ["r02", "ramp", -1.2829, 36.8183, "CBD", "community3", 22, 4],
  ["r03", "entrance", -1.2856, 36.8193, "CBD", "official", 6, 1],
  ["r04", "ramp", -1.2665, 36.8072, "Westlands", "community3", 30, 3],
  ["r05", "entrance", -1.2646, 36.8034, "Westlands", "audited", 18, 2],
  ["r06", "ramp", -1.2725, 36.8292, "Ngara", "official", 9, 1],
  ["r07", "entrance", -1.3005, 36.8142, "Upper Hill", "official", 12, 1],
  ["r08", "ramp", -1.2934, 36.7835, "Kilimani", "community", 50, 1],
  ["r09", "entrance", -1.2971, 36.7965, "Hurlingham", "audited", 5, 2],
  ["r10", "ramp", -1.3085, 36.8381, "South B", "community3", 40, 5],
].map(([id, kind, lat, lng, area, source, daysAgo, confirmations]) => ({
  id: id as string,
  kind: kind as AccessPoint["kind"],
  lat: lat as number,
  lng: lng as number,
  area: area as string,
  evidence: {
    source: source as Source,
    daysAgo: daysAgo as number,
    confirmations: confirmations as number,
    conflicts: 0,
  },
}));

export function getPlace(id: string) {
  return PLACES.find((p) => p.id === id);
}
