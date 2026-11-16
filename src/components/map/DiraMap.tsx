import { useEffect, useRef } from "react";
import {
  Map as MLMap,
  Marker,
  NavigationControl,
  AttributionControl,
  setWorkerUrl,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { pinSvg, type PinKind } from "@/components/dira/marks";
import type { Theme } from "@/lib/types";

setWorkerUrl(workerUrl);

export interface MapItem {
  id: string;
  group: "place" | "barrier" | "ramp";
  kind: PinKind;
  lat: number;
  lng: number;
  label: string;
  faded?: boolean | undefined;
}

export interface DiraMapProps {
  items: MapItem[];
  heat: { lat: number; lng: number; weight: number }[];
  showHeat: boolean;
  selectedId?: string | undefined;
  onSelect: (item: MapItem) => void;
  focus?: { lat: number; lng: number; zoom?: number | undefined; key: number } | undefined;
  me?: { lat: number; lng: number } | undefined;
  theme: Theme;
  center: { lat: number; lng: number };
  zoom: number;
  ariaLabel: string;
}

const STYLE: Record<Theme, string> = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
  hc: "https://tiles.openfreemap.org/styles/dark",
};

/** Map-canvas tints matched to the DIRA palette (map styles need plain colour strings). */
const TINT: Record<Theme, { land: string; water: string; park: string; heat: [string, string, string, string] }> = {
  light: { land: "#EEFCEB", water: "#BFD0E2", park: "#D2F3CD", heat: ["#F45B6900", "#F9B4A8", "#F45B69", "#B8283A"] },
  dark: { land: "#0E3341", water: "#173F58", park: "#123F44", heat: ["#F45B6900", "#8A3A4A", "#F45B69", "#FFC2C8"] },
  hc: { land: "#05141A", water: "#0A2A40", park: "#05141A", heat: ["#F45B6900", "#B23A4A", "#FF6F7D", "#FFFFFF"] },
};

function tint(map: MLMap, theme: Theme) {
  const c = TINT[theme];
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id.toLowerCase();
    try {
      if (layer.type === "background") map.setPaintProperty(layer.id, "background-color", c.land);
      else if (layer.type === "fill" && id.includes("water")) map.setPaintProperty(layer.id, "fill-color", c.water);
      else if (layer.type === "fill" && (id.includes("park") || id.includes("wood") || id.includes("grass")))
        map.setPaintProperty(layer.id, "fill-color", c.park);
    } catch {
      /* some layers use expressions we leave alone */
    }
  }
}

function heatGeo(heat: DiraMapProps["heat"]) {
  return {
    type: "FeatureCollection" as const,
    features: heat.map((h) => ({
      type: "Feature" as const,
      properties: { w: h.weight },
      geometry: { type: "Point" as const, coordinates: [h.lng, h.lat] },
    })),
  };
}

export default function DiraMap(props: DiraMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markers = useRef(new Map<string, { m: Marker; node: HTMLButtonElement }>());
  const meMarker = useRef<Marker | null>(null);
  const latest = useRef(props);
  latest.current = props;

  // Create once
  useEffect(() => {
    if (!el.current) return;
    const map = new MLMap({
      container: el.current,
      style: STYLE[props.theme],
      center: [props.center.lng, props.center.lat],
      zoom: props.zoom,
      attributionControl: false,
      cooperativeGestures: false,
    });
    map.addControl(new AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    map.on("style.load", () => {
      const p = latest.current;
      tint(map, p.theme);
      if (!map.getSource("heat")) map.addSource("heat", { type: "geojson", data: heatGeo(p.heat) });
      const c = TINT[p.theme].heat;
      if (!map.getLayer("heat")) {
        map.addLayer({
          id: "heat",
          type: "heatmap",
          source: "heat",
          layout: { visibility: p.showHeat ? "visible" : "none" },
          paint: {
            "heatmap-weight": ["get", "w"],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 11, 30, 15, 70],
            "heatmap-opacity": 0.75,
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0, c[0],
              0.3, c[1],
              0.65, c[2],
              1, c[3],
            ],
          },
        });
      }
    });
    mapRef.current = map;
    return () => {
      markers.current.forEach(({ m }) => m.remove());
      markers.current.clear();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme swap
  const lastTheme = useRef(props.theme);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || lastTheme.current === props.theme) return;
    lastTheme.current = props.theme;
    map.setStyle(STYLE[props.theme]);
  }, [props.theme]);

  // Heat data + visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource("heat") as GeoJSONSource | undefined;
    src?.setData(heatGeo(props.heat));
    if (map.getLayer("heat")) map.setLayoutProperty("heat", "visibility", props.showHeat ? "visible" : "none");
  }, [props.heat, props.showHeat]);

  // Markers (accessible buttons)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const store = markers.current;
    const wanted = new Set(props.items.map((i) => i.group + ":" + i.id));
    for (const [key, { m }] of store) {
      if (!wanted.has(key)) {
        m.remove();
        store.delete(key);
      }
    }
    for (const item of props.items) {
      const key = item.group + ":" + item.id;
      let entry = store.get(key);
      if (!entry) {
        const node = document.createElement("button");
        node.type = "button";
        node.addEventListener("click", (e) => {
          e.stopPropagation();
          const cur = latest.current.items.find((i) => i.group + ":" + i.id === key);
          if (cur) latest.current.onSelect(cur);
        });
        const m = new Marker({ element: node }).setLngLat([item.lng, item.lat]).addTo(map);
        entry = { m, node };
        store.set(key, entry);
      }
      const { node } = entry;
      node.className = `dira-pin${item.group !== "place" ? " is-small" : ""}${item.faded ? " is-faded" : ""}`;
      node.innerHTML = pinSvg(item.kind);
      node.setAttribute("aria-label", item.label);
      node.setAttribute("aria-pressed", String(props.selectedId === key));
      node.style.zIndex = props.selectedId === key ? "5" : item.group === "place" ? "2" : "1";
    }
  }, [props.items, props.selectedId]);

  // Fly to focus
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !props.focus) return;
    const reduce =
      document.documentElement.classList.contains("reduce-motion") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.flyTo({
      center: [props.focus.lng, props.focus.lat],
      zoom: props.focus.zoom ?? Math.max(map.getZoom(), 15),
      animate: !reduce,
      essential: false,
    });
  }, [props.focus?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // My location
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !props.me) return;
    if (!meMarker.current) {
      const dot = document.createElement("div");
      dot.className = "dira-me";
      dot.setAttribute("aria-hidden", "true");
      meMarker.current = new Marker({ element: dot });
    }
    meMarker.current.setLngLat([props.me.lng, props.me.lat]).addTo(map);
  }, [props.me?.lat, props.me?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={el} role="region" aria-label={props.ariaLabel} className="absolute inset-0" />;
}
