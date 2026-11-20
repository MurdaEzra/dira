import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PlanResult, RouteKind, RouteOption, RouteStep } from "./route-types";

const point = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
const schema = z.object({
  from: point,
  to: point,
  limits: z.object({
    maxSlope: z.number().min(0).max(30),
    minWidth: z.number().min(40).max(200),
    maxKerb: z.number().min(0).max(30),
    smoothOnly: z.boolean(),
  }),
  avoidStrict: z.array(point).max(60),
  avoidBalanced: z.array(point).max(60),
});

const M_PER_DEG = 111_320;
function meters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const k = Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  return M_PER_DEG * Math.hypot(a.lat - b.lat, (a.lng - b.lng) * k);
}

/** Small octagon (≈ radius metres) around a barrier, as a GeoJSON polygon ring. */
function octagon(p: { lat: number; lng: number }, radius = 14) {
  const dLat = radius / M_PER_DEG;
  const dLng = radius / (M_PER_DEG * Math.cos((p.lat * Math.PI) / 180));
  const ring: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i;
    ring.push([p.lng + dLng * Math.cos(a), p.lat + dLat * Math.sin(a)]);
  }
  ring.push(ring[0]!);
  return [ring];
}

const INCLINES = [3, 6, 10, 15];
const KERBS = [0.03, 0.06, 0.1, 0.31];
function atOrBelow(list: number[], v: number) {
  return [...list].reverse().find((x) => x <= v) ?? list[0]!;
}
function atOrAbove(list: number[], v: number) {
  return list.find((x) => x >= v) ?? list[list.length - 1]!;
}

interface OrsFeature {
  geometry: { coordinates: [number, number][] };
  properties: {
    summary?: { distance?: number; duration?: number };
    segments?: { steps?: { distance: number; duration: number; type: number; name: string; way_points: [number, number] }[] }[];
    extras?: { steepness?: { values?: [number, number, number][] } };
  };
}

async function ors(
  key: string,
  kind: RouteKind,
  data: z.infer<typeof schema>,
): Promise<RouteOption | null> {
  const profile = kind === "fastest" ? "foot-walking" : "wheelchair";
  const avoid = kind === "accessible" ? data.avoidStrict : kind === "balanced" ? data.avoidBalanced : [];
  const options: Record<string, unknown> = {};
  if (avoid.length) options["avoid_polygons"] = { type: "MultiPolygon", coordinates: avoid.map((p) => octagon(p)) };
  if (kind !== "fastest") {
    const strict = kind === "accessible";
    const restrictions: Record<string, unknown> = {
      maximum_incline: strict ? atOrBelow(INCLINES, data.limits.maxSlope) : atOrAbove(INCLINES, data.limits.maxSlope),
      maximum_sloped_kerb: strict ? atOrBelow(KERBS, data.limits.maxKerb / 100) : atOrAbove(KERBS, data.limits.maxKerb / 100),
      minimum_width: Math.round((data.limits.minWidth / 100) * 10) / 10,
    };
    // Surface tags are too sparse in Nairobi's map data to filter on; smoothness is reflected in scoring instead.
    options["profile_params"] = { restrictions };
  }
  const body = {
    coordinates: [
      [data.from.lng, data.from.lat],
      [data.to.lng, data.to.lat],
    ],
    instructions: true,
    extra_info: ["steepness"],
    units: "m",
    ...(Object.keys(options).length ? { options } : {}),
  };
  const res = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}/geojson`, {
    method: "POST",
    headers: { Authorization: key, "Content-Type": "application/json", Accept: "application/geo+json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`ORS ${kind} failed`, res.status, (await res.text()).slice(0, 300));
    return null;
  }
  const json = (await res.json()) as { features?: OrsFeature[] };
  const f = json.features?.[0];
  if (!f) return null;
  const steps: RouteStep[] = (f.properties.segments ?? []).flatMap((s) =>
    (s.steps ?? []).map((st) => ({
      type: st.type,
      name: st.name && st.name !== "-" ? st.name : "",
      distance: st.distance,
      duration: st.duration,
      from: st.way_points[0],
      to: st.way_points[1],
    })),
  );
  return {
    kind,
    coords: f.geometry.coordinates.map((c) => [c[0], c[1]] as [number, number]),
    distance: f.properties.summary?.distance ?? 0,
    duration: f.properties.summary?.duration ?? 0,
    steps,
    steepness: f.properties.extras?.steepness?.values ?? [],
    approx: false,
  };
}

/** Approximate lines used when the routing service can't answer (offline demo journeys). */
function fallback(data: z.infer<typeof schema>): RouteOption[] {
  const { from, to } = data;
  const d = meters(from, to);
  const make = (kind: RouteKind, bend: number): RouteOption => {
    const n = 24;
    const coords: [number, number][] = [];
    // Perpendicular offset for a gentle curve.
    const px = -(to.lat - from.lat);
    const py = to.lng - from.lng;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const off = Math.sin(Math.PI * t) * bend;
      coords.push([from.lng + (to.lng - from.lng) * t + px * off, from.lat + (to.lat - from.lat) * t + py * off]);
    }
    const dist = d * (1 + Math.abs(bend) * 0.9);
    return {
      kind,
      coords,
      distance: Math.round(dist),
      duration: Math.round(dist / 1.25),
      steps: [
        { type: 11, name: "", distance: Math.round(dist), duration: Math.round(dist / 1.25), from: 0, to: n },
        { type: 10, name: "", distance: 0, duration: 0, from: n, to: n },
      ],
      steepness: [],
      approx: true,
    };
  };
  return [make("accessible", 0.28), make("balanced", -0.14), make("fastest", 0)];
}

export const planRoutes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }): Promise<PlanResult> => {
    if (meters(data.from, data.to) > 40_000) return { options: fallback(data), source: "fallback" };
    const key = process.env["OPENROUTESERVICE_API_KEY"];
    if (!key) return { options: fallback(data), source: "fallback" };
    try {
      const results = await Promise.all(
        (["accessible", "balanced", "fastest"] as const).map((k) => ors(key, k, data).catch(() => null)),
      );
      if (!results[0]) {
        // Strict limits found nothing: keep the barrier avoidance, relax the slope/kerb limits.
        const relaxed = { ...data, limits: { ...data.limits, maxSlope: 15, maxKerb: 10, minWidth: 60 } };
        results[0] = await ors(key, "accessible", relaxed).catch(() => null);
      }
      let options = results.filter((r): r is RouteOption => r !== null);
      // If a strict wheelchair route is impossible, fall back to the next-best real route for that slot.
      if (!results[0] && results[1]) options = [{ ...results[1], kind: "accessible" }, ...options];
      if (options.length === 0) return { options: fallback(data), source: "fallback" };
      return { options, source: "ors" };
    } catch (e) {
      console.error("routing failed", e);
      return { options: fallback(data), source: "fallback" };
    }
  });
