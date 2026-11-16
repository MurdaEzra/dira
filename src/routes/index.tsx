import { ClientOnly, Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ChevronUp, Layers, LocateFixed, Search, X, ArrowRight } from "lucide-react";
import { ACCESS_POINTS, BARRIERS, CITY } from "@/data/seed";
import { usePrefs } from "@/lib/prefs";
import { useScoredPlaces } from "@/lib/use-scored";
import { fmt } from "@/lib/i18n";
import { isExpired, tier } from "@/lib/confidence";
import { CATEGORIES, type Category } from "@/lib/types";
import { topFeatures } from "@/lib/fit";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { EvidenceLine, Legend, PinGlyph, TierMark, StatusMark } from "@/components/dira/marks";
import { FitNumeral, PlaceRow } from "@/components/dira/place-row";
import type { MapItem } from "@/components/map/DiraMap";
import { cn } from "@/lib/utils";

const DiraMap = lazy(() => import("@/components/map/DiraMap"));

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { place?: string } =>
    typeof s["place"] === "string" ? { place: s["place"] } : {},
  head: () => ({
    meta: [
      { title: "DIRA — Accessible map of Nairobi" },
      {
        name: "description",
        content: "See step-free places, verified ramps and reported barriers on one map, ranked for your access needs.",
      },
      { property: "og:title", content: "DIRA — Accessible map of Nairobi" },
      {
        property: "og:description",
        content: "Step-free places, verified ramps and reported barriers, ranked for your access needs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

type Layer = "places" | "barriers" | "ramps" | "heat";
const SEV_WEIGHT = { low: 0.25, medium: 0.5, high: 0.8, blocking: 1 };

function Home() {
  const { t, display, hydrated, onboarded, here, setHere, announce, profile } = usePrefs();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const scored = useScoredPlaces();
  const [cat, setCat] = useState<Category | "all">("all");
  const [q, setQ] = useState("");
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ places: true, barriers: true, ramps: true, heat: false });
  const [selected, setSelected] = useState<string | undefined>(search.place ? `place:${search.place}` : undefined);
  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom?: number; key: number }>();
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // First visit: offer the access profile.
  useEffect(() => {
    if (hydrated && !onboarded) navigate({ to: "/onboarding" });
  }, [hydrated, onboarded, navigate]);

  useEffect(() => {
    if (!search.place) return;
    const p = scored.find((s) => s.place.id === search.place);
    if (p) {
      setSelected(`place:${p.place.id}`);
      setFocus({ lat: p.place.lat, lng: p.place.lng, zoom: 15.5, key: Date.now() });
      setOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.place]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return scored.filter(
      (s) =>
        (cat === "all" || s.place.category === cat) &&
        (!needle ||
          s.place.name.toLowerCase().includes(needle) ||
          s.place.area.toLowerCase().includes(needle) ||
          t.catOne[s.place.category].toLowerCase().includes(needle)),
    );
  }, [scored, cat, q, t]);

  useEffect(() => {
    if (q) announce(visible.length ? fmt(t.map.shown, { n: visible.length }) : t.map.noResults);
  }, [visible.length, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo<MapItem[]>(() => {
    const out: MapItem[] = [];
    if (layers.places)
      for (const s of visible)
        out.push({
          id: s.place.id,
          group: "place",
          kind: s.band,
          lat: s.place.lat,
          lng: s.place.lng,
          label: `${s.place.name}, ${t.catOne[s.place.category]}, ${t.map.fit} ${s.score}, ${t.tier[s.tier]}`,
        });
    if (layers.barriers)
      for (const b of BARRIERS)
        out.push({
          id: b.id,
          group: "barrier",
          kind: b.status === "resolved" ? "resolved" : "barrier",
          lat: b.lat,
          lng: b.lng,
          faded: b.status === "resolved" || isExpired(b.evidence),
          label: `${t.map.barrierHere}: ${t.barrier[b.type]}, ${t.severity[b.severity]}, ${t.bstatus[b.status]}, ${t.tier[tier(b.evidence)]}`,
        });
    if (layers.ramps)
      for (const r of ACCESS_POINTS)
        out.push({
          id: r.id,
          group: "ramp",
          kind: "ramp",
          lat: r.lat,
          lng: r.lng,
          label: `${r.kind === "ramp" ? t.map.rampKind : t.map.entranceKind}, ${r.area}, ${t.tier[tier(r.evidence)]}`,
        });
    return out;
  }, [visible, layers, t]);

  const heat = useMemo(
    () =>
      BARRIERS.filter((b) => b.status !== "resolved" && !isExpired(b.evidence)).map((b) => ({
        lat: b.lat,
        lng: b.lng,
        weight: SEV_WEIGHT[b.severity],
      })),
    [],
  );

  function select(key: string, lat: number, lng: number) {
    setSelected(key);
    setFocus({ lat, lng, key: Date.now() });
    setOpen(true);
    listRef.current?.scrollTo({ top: 0 });
  }

  function locate() {
    if (!("geolocation" in navigator)) return announce(t.map.locateFail);
    announce(t.map.locating);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const h = { lat: pos.coords.latitude, lng: pos.coords.longitude, real: true };
        setHere(h);
        setFocus({ ...h, zoom: 15, key: Date.now() });
        announce(t.map.located);
      },
      () => announce(t.map.locateFail),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const [group, id] = selected?.split(":") ?? [];
  const selPlace = group === "place" ? scored.find((s) => s.place.id === id) : undefined;
  const selBarrier = group === "barrier" ? BARRIERS.find((b) => b.id === id) : undefined;
  const selRamp = group === "ramp" ? ACCESS_POINTS.find((r) => r.id === id) : undefined;

  return (
    <div className="relative h-stage overflow-hidden lg:grid lg:grid-cols-[27rem_1fr]">
      {/* Panel — bottom sheet on phones, side column on desktop */}
      <section
        aria-label={t.map.nearby}
        data-open={open}
        className={cn(
          "absolute inset-x-0 bottom-0 z-20 flex max-h-[80%] flex-col rounded-t-[1.75rem] rule-t bg-background",
          "lg:static lg:z-auto lg:h-full lg:max-h-none lg:rounded-none lg:border-t-0 lg:border-r-[length:var(--rule-w)] lg:border-rule",
        )}
      >
        <button
          type="button"
          aria-expanded={open}
          aria-controls="place-list"
          onClick={() => setOpen((o) => !o)}
          className="tap flex w-full flex-col items-center gap-1 pt-2 pb-1 lg:hidden"
        >
          <span aria-hidden className="h-1.5 w-12 rounded-full bg-foreground/40" />
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <ChevronUp aria-hidden className={cn("size-4 transition-transform", open && "rotate-180")} />
            {open ? t.map.hideList : `${t.map.showList} · ${visible.length}`}
          </span>
        </button>

        <div className="space-y-3 px-4 pb-3 lg:px-6 lg:pt-6">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const first = visible[0];
              if (first) select(`place:${first.place.id}`, first.place.lat, first.place.lng);
            }}
          >
            <label htmlFor="map-search" className="sr-only">
              {t.map.searchLabel}
            </label>
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <input
                id="map-search"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.map.search}
                autoComplete="off"
                className="h-14 w-full rounded-full border-[length:var(--rule-w)] border-rule bg-background pl-12 pr-4 text-lg text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </form>
          <div role="group" aria-label={t.discover.category} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
            {(["all", ...CATEGORIES] as const).map((c) => (
              <Button key={c} type="button" variant="chip" size="sm" aria-pressed={cat === c} onClick={() => setCat(c)} className="shrink-0">
                {c === "all" ? t.map.allCategories : t.cat[c]}
              </Button>
            ))}
          </div>
        </div>

        <div
          id="place-list"
          ref={listRef}
          className={cn("min-h-0 flex-1 overflow-y-auto px-4 pb-6 lg:block lg:px-6", !open && "hidden")}
        >
          {(selPlace || selBarrier || selRamp) && (
            <div className="rise rule-t rule-b relative -mx-4 bg-paper-deep px-4 py-5 lg:-mx-6 lg:px-6" aria-live="polite">
              <button
                type="button"
                onClick={() => setSelected(undefined)}
                aria-label={t.map.close}
                className="tap absolute right-2 top-2 grid place-items-center rounded-full hover:bg-accent"
              >
                <X aria-hidden className="size-5" />
              </button>
              <p className="eyebrow text-muted-foreground">{t.map.selected}</p>
              {selPlace && (
                <div className="mt-2 grid grid-cols-[auto_1fr] items-start gap-x-4">
                  <FitNumeral score={selPlace.score} band={selPlace.band} />
                  <div className="min-w-0 pr-8">
                    <p className="text-sm text-muted-foreground">
                      {t.catOne[selPlace.place.category]} · {selPlace.place.area}
                    </p>
                    <h2 className="text-2xl font-bold">{selPlace.place.name}</h2>
                    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3">
                      <TierMark tier={selPlace.tier} compact />
                      <EvidenceLine e={selPlace.last} />
                    </div>
                  </div>
                  <ul className="col-span-2 mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {topFeatures(selPlace.place, profile, 3).map((f) => (
                      <li key={f.key} className="inline-flex items-center gap-2">
                        <StatusMark status={f.status} withLabel={false} />
                        {t.feature[f.key]}
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="col-span-2 mt-4 w-full sm:w-auto">
                    <Link to="/places/$placeId" params={{ placeId: selPlace.place.id }}>
                      {t.map.open} <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                </div>
              )}
              {selBarrier && (
                <div className="mt-2 flex items-start gap-4 pr-8">
                  <PinGlyph kind={selBarrier.status === "resolved" ? "resolved" : "barrier"} />
                  <div>
                    <h2 className="text-2xl font-bold">{t.barrier[selBarrier.type]}</h2>
                    <p className="mt-1 font-semibold">
                      <span className={cn(selBarrier.severity === "blocking" || selBarrier.severity === "high" ? "text-coral-ink" : "")}>
                        {t.severity[selBarrier.severity]}
                      </span>{" "}
                      · {t.bstatus[selBarrier.status]} · {selBarrier.area}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3">
                      <TierMark tier={tier(selBarrier.evidence)} compact />
                      <EvidenceLine e={selBarrier.evidence} />
                    </div>
                  </div>
                </div>
              )}
              {selRamp && (
                <div className="mt-2 flex items-start gap-4 pr-8">
                  <PinGlyph kind="ramp" />
                  <div>
                    <h2 className="text-2xl font-bold">{selRamp.kind === "ramp" ? t.map.rampKind : t.map.entranceKind}</h2>
                    <p className="text-muted-foreground">{selRamp.area}</p>
                    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3">
                      <TierMark tier={tier(selRamp.evidence)} compact />
                      <EvidenceLine e={selRamp.evidence} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-baseline justify-between pt-5">
            <h2 className="text-2xl font-extrabold">{t.map.nearby}</h2>
            <span className="eyebrow text-muted-foreground">{fmt(t.discover.results, { n: visible.length })}</span>
          </div>
          {visible.length === 0 ? (
            <p className="py-8 text-lg">{t.map.noResults}</p>
          ) : (
            <ul className="divide-y-[length:var(--rule-w)] divide-border">
              {visible.map((s) => (
                <PlaceRow
                  key={s.place.id}
                  item={s}
                  dense
                  selected={selected === `place:${s.place.id}`}
                  onLocate={() => select(`place:${s.place.id}`, s.place.lat, s.place.lng)}
                />
              ))}
            </ul>
          )}
          <p className="mt-4 text-sm text-muted-foreground">{t.app.demoLong}</p>
        </div>
      </section>

      {/* Map */}
      <div className="absolute inset-0 lg:relative">
        <ClientOnly fallback={<MapFallback label={t.map.loading} />}>
          <Suspense fallback={<MapFallback label={t.map.loading} />}>
            <DiraMap
              items={items}
              heat={heat}
              showHeat={layers.heat}
              selectedId={selected}
              onSelect={(it) => select(`${it.group}:${it.id}`, it.lat, it.lng)}
              focus={focus}
              me={here.real ? here : undefined}
              theme={display.theme}
              center={CITY.center}
              zoom={CITY.zoom}
              ariaLabel={t.map.region}
            />
          </Suspense>
        </ClientOnly>

        <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
          <Button variant="default" size="icon" onClick={locate} aria-label={t.map.locate}>
            <LocateFixed aria-hidden />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="default" size="icon" aria-label={t.map.layers}>
                <Layers aria-hidden />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="space-y-4">
              <h2 className="text-lg font-bold">{t.map.layers}</h2>
              <ul className="space-y-1">
                {(
                  [
                    ["places", t.map.layerPlaces],
                    ["barriers", t.map.layerBarriers],
                    ["ramps", t.map.layerRamps],
                    ["heat", t.map.layerHeat],
                  ] as [Layer, string][]
                ).map(([k, label]) => (
                  <li key={k}>
                    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3">
                      <span className="font-medium">{label}</span>
                      <Switch checked={layers[k]} onCheckedChange={(v) => setLayers((l) => ({ ...l, [k]: v }))} />
                    </label>
                  </li>
                ))}
              </ul>
              <div className="rule-t pt-3">
                <h3 className="eyebrow mb-2 text-muted-foreground">{t.map.legend}</h3>
                <Legend />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

function MapFallback({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-paper-deep">
      <p className="eyebrow text-muted-foreground">{label}</p>
    </div>
  );
}
