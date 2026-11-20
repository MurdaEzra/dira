import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownUp, Footprints, Route as RouteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrefs } from "@/lib/prefs";
import { cityQuery, useCityData, useCityDataStatus } from "@/lib/data";
import { planRoutes } from "@/lib/routing.functions";
import { assessRoute, avoidPoints, nearestOnLine } from "@/lib/route-score";
import type { RouteKind, RouteOption } from "@/lib/route-types";
import { fmt } from "@/lib/i18n";
import type { MapItem } from "@/components/map/DiraMap";
import { supabase } from "@/integrations/supabase/client";

const DiraMap = lazy(() => import("@/components/map/DiraMap"));

export const Route = createFileRoute("/planner")({ component: RoutePlanner });

function RoutePlanner() {
  const { t, profile, display, announce, here, setHere } = usePrefs();
  const navigate = useNavigate();
  const city = useCityData();
  const cityStatus = useCityDataStatus();
  const queryClient = useQueryClient();
  const [navigating, setNavigating] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number }>();
  const activeRouteRef = useRef<RouteOption | undefined>(undefined);
  const currentLocationRef = useRef<{ lat: number; lng: number } | undefined>(undefined);
  const rerouteRef = useRef<
    (point: { lat: number; lng: number }, barriers?: typeof city.barriers) => Promise<boolean>
  >(async () => false);
  const lastDeviationReroute = useRef(0);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [startOverride, setStartOverride] = useState<{ lat: number; lng: number }>();
  const [stuckAt, setStuckAt] = useState<{ lat: number; lng: number }>();
  const [options, setOptions] = useState<RouteOption[]>([]);
  const [selected, setSelected] = useState<RouteKind>("accessible");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const from = city.places.find((p) => p.id === fromId);
  const to = city.places.find((p) => p.id === toId);
  const assessments = useMemo(
    () => new Map(options.map((o) => [o.kind, assessRoute(o, city.barriers, profile)])),
    [options, city.barriers, profile],
  );

  async function findRoutes(
    fromOverride?: { lat: number; lng: number },
    barriers = city.barriers,
  ): Promise<boolean> {
    if ((!from && !fromOverride) || !to) {
      setError(t.route.pickBoth);
      return false;
    }
    setPending(true);
    setError("");
    try {
      const result = await planRoutes({
        data: {
          from: fromOverride ?? startOverride ?? { lat: from!.lat, lng: from!.lng },
          to: { lat: to.lat, lng: to.lng },
          limits: {
            maxSlope: profile.maxSlope,
            minWidth: profile.minWidth,
            maxKerb: profile.maxKerb,
            smoothOnly: profile.surface === "smooth",
          },
          avoidStrict: avoidPoints(barriers, "strict"),
          avoidBalanced: avoidPoints(barriers, "balanced"),
        },
      });
      setOptions(result.options);
      setSelected(
        result.options.some((o) => o.kind === selected)
          ? selected
          : (result.options[0]?.kind ?? "accessible"),
      );
      announce(result.source === "fallback" ? t.route.approxLong : t.route.options);
      return result.options.length > 0;
    } catch {
      setError(t.route.failed);
      return false;
    } finally {
      setPending(false);
    }
  }

  const chosen = options.find((o) => o.kind === selected);
  activeRouteRef.current = chosen;
  currentLocationRef.current = currentLocation;
  rerouteRef.current = async (point, barriers) => {
    setStartOverride(point);
    return findRoutes(point, barriers ?? city.barriers);
  };
  const assessment = chosen ? assessments.get(chosen.kind) : undefined;
  const routeStart = startOverride ?? (from ? { lat: from.lat, lng: from.lng } : undefined);
  const routePins: MapItem[] =
    routeStart && to
      ? [
          {
            id: "route-start",
            group: "place",
            kind: "good",
            lat: routeStart.lat,
            lng: routeStart.lng,
            label: startOverride ? t.route.myLocation : t.route.from + ": " + (from?.name ?? ""),
          },
          {
            id: "route-destination",
            group: "place",
            kind: "good",
            lat: to.lat,
            lng: to.lng,
            label: t.route.to + ": " + to.name,
          },
        ]
      : [];
  const placeOptions = city.places.map((p) => (
    <option key={p.id} value={p.id}>
      {p.name} · {p.area}
    </option>
  ));

  useEffect(() => {
    if (!navigating) return;
    if (!navigator.geolocation) {
      setError(t.map.locateFail);
      setNavigating(false);
      return;
    }
    const watch = navigator.geolocation.watchPosition(
      (position) => {
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCurrentLocation(point);
        setHere({ ...point, real: true });
        const activeRoute = activeRouteRef.current;
        const now = Date.now();
        if (
          activeRoute &&
          nearestOnLine(activeRoute.coords, point).d > 55 &&
          now - lastDeviationReroute.current > 20_000
        ) {
          lastDeviationReroute.current = now;
          announce(t.route.rerouting);
          void rerouteRef.current(point).then((ok) => {
            if (ok) announce(t.route.rerouted);
          });
        }
      },
      () => setError(t.map.locateFail),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [navigating, announce, setHere, t.map.locateFail, t.route.rerouting, t.route.rerouted]);

  useEffect(() => {
    if (!navigating) return;
    const channel = supabase
      .channel("dira-active-route-barriers")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "barriers" },
        async (payload) => {
          const activeRoute = activeRouteRef.current;
          const barrier = payload.new as { lat?: number; lng?: number };
          if (
            activeRoute &&
            typeof barrier.lat === "number" &&
            typeof barrier.lng === "number" &&
            nearestOnLine(activeRoute.coords, { lat: barrier.lat, lng: barrier.lng }).d <= 25
          ) {
            announce(t.route.newBarrier);
            await queryClient.invalidateQueries({ queryKey: ["city"] });
            const fresh = await queryClient.fetchQuery(cityQuery).catch(() => undefined);
            const point = currentLocationRef.current;
            if (point) {
              announce(t.route.rerouting);
              const ok = await rerouteRef.current(point, fresh?.barriers);
              if (ok) announce(t.route.rerouted);
            }
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [navigating, announce, queryClient, t.route.newBarrier, t.route.rerouting, t.route.rerouted]);

  const routeProgress =
    chosen && currentLocation
      ? Math.round(
          (nearestOnLine(chosen.coords, currentLocation).index /
            Math.max(1, chosen.coords.length - 1)) *
            100,
        )
      : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-nav lg:px-8 lg:pt-14">
      <header className="mb-8">
        <p className="eyebrow mb-3 flex items-center gap-2 text-signal-ink">
          <RouteIcon aria-hidden className="size-4" />
          {t.route.options}
        </p>
        <h1 className="text-5xl font-extrabold sm:text-7xl">{t.route.title}</h1>
        <p className="mt-3 max-w-2xl text-xl text-muted-foreground">{t.route.lede}</p>
        {city.source === "empty" ? (
          <p role="status" className="mt-3 text-muted-foreground">
            {cityStatus.loading ? t.app.dataLoading : t.app.dataUnavailable}
          </p>
        ) : city.places.length === 0 ? (
          <p className="mt-3 text-muted-foreground">{t.app.noData}</p>
        ) : null}
        <Button
          className="mt-5"
          variant="outline"
          onClick={async () => {
            setError("");
            try {
              const point = here.real
                ? { lat: here.lat, lng: here.lng }
                : await new Promise<{ lat: number; lng: number }>((resolve, reject) =>
                    navigator.geolocation.getCurrentPosition(
                      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
                      reject,
                      { enableHighAccuracy: true, timeout: 10000 },
                    ),
                  );
              setStuckAt(point);
              setCurrentLocation(point);
              setHere({ ...point, real: true });
            } catch {
              setError(t.map.locateFail);
            }
          }}
        >
          {t.route.stuck}
        </Button>
        {stuckAt && (
          <section
            className="mt-4 rounded-2xl border-2 border-rule p-4"
            aria-labelledby="stuck-heading"
          >
            <h2 id="stuck-heading" className="text-xl font-bold">
              {t.route.stuckTitle}
            </h2>
            <p className="mt-1 text-muted-foreground">{t.route.stuckLede}</p>
            <ul className="mt-3 space-y-2">
              {city.accessPoints
                .map((a) => ({
                  ...a,
                  d:
                    Math.hypot(
                      a.lat - stuckAt.lat,
                      (a.lng - stuckAt.lng) * Math.cos((stuckAt.lat * Math.PI) / 180),
                    ) * 111320,
                }))
                .sort((a, b) => a.d - b.d)
                .slice(0, 3)
                .map((a) => (
                  <li key={a.id}>
                    {a.kind === "ramp" ? t.map.rampKind : t.map.entranceKind} · {a.area} ·{" "}
                    {fmt(t.route.away, { n: Math.round(a.d) })}
                  </li>
                ))}
            </ul>
            <Button
              className="mt-4"
              onClick={() => {
                setStartOverride(stuckAt);
                void findRoutes(stuckAt);
              }}
            >
              {t.route.replanHere}
            </Button>
          </section>
        )}
      </header>
      <section
        aria-label={t.route.title}
        className="grid gap-4 rounded-3xl bg-paper-deep p-5 sm:grid-cols-[1fr_auto_1fr] sm:items-end sm:p-7"
      >
        <label className="grid gap-2 text-lg font-bold">
          {t.route.from}
          <select
            value={fromId}
            onChange={(e) => {
              setFromId(e.target.value);
              setStartOverride(undefined);
            }}
            className="h-14 w-full rounded-full border border-rule bg-background px-4"
          >
            <option value="">{t.route.choosePlace}</option>
            {placeOptions}
          </select>
        </label>
        <Button
          variant="outline"
          size="icon"
          aria-label={t.route.swap}
          onClick={() => {
            setFromId(toId);
            setToId(fromId);
          }}
        >
          <ArrowDownUp aria-hidden />
        </Button>
        <label className="grid gap-2 text-lg font-bold">
          {t.route.to}
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            className="h-14 w-full rounded-full border border-rule bg-background px-4"
          >
            <option value="">{t.route.choosePlace}</option>
            {placeOptions}
          </select>
        </label>
        <Button className="h-14 sm:col-span-3" onClick={() => void findRoutes()} disabled={pending}>
          {pending ? t.route.planning : t.route.plan}
        </Button>
      </section>
      {error && (
        <p role="alert" className="mt-4 text-coral-ink">
          {error}
        </p>
      )}
      {options.length > 0 && (
        <section className="mt-10" aria-labelledby="routes-heading">
          <h2 id="routes-heading" className="text-3xl font-extrabold">
            {t.route.options}
          </h2>
          {routeStart && to && (
            <div className="relative mt-5 h-[360px] overflow-hidden rounded-3xl border-2 border-rule">
              <ClientOnly
                fallback={
                  <div className="grid h-full place-items-center bg-paper-deep">
                    {t.route.mapLabel}
                  </div>
                }
              >
                <Suspense
                  fallback={
                    <div className="grid h-full place-items-center bg-paper-deep">
                      {t.route.mapLabel}
                    </div>
                  }
                >
                  <DiraMap
                    items={routePins}
                    heat={[]}
                    showHeat={false}
                    routes={options}
                    selectedRoute={selected}
                    me={currentLocation}
                    theme={display.theme}
                    center={{
                      lat: (routeStart.lat + to.lat) / 2,
                      lng: (routeStart.lng + to.lng) / 2,
                    }}
                    zoom={13}
                    ariaLabel={t.route.mapLabel}
                    onSelect={() => {}}
                  />
                </Suspense>
              </ClientOnly>
            </div>
          )}
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {options.map((option) => {
              const a = assessments.get(option.kind)!;
              return (
                <button
                  key={option.kind}
                  type="button"
                  aria-pressed={selected === option.kind}
                  onClick={() => setSelected(option.kind)}
                  className={
                    selected === option.kind
                      ? "min-h-40 rounded-3xl border-2 border-signal bg-primary p-5 text-left text-primary-foreground"
                      : "min-h-40 rounded-3xl border-2 border-rule bg-background p-5 text-left"
                  }
                >
                  <p className="text-xl font-extrabold">{t.route.kind[option.kind]}</p>
                  <p className="mt-1 text-sm opacity-80">{t.route.kindHint[option.kind]}</p>
                  <p className="mt-4 flex items-center gap-2 font-bold">
                    <Footprints aria-hidden className="size-4" />
                    {fmt(t.route.minutes, { n: a.minutes })} ·{" "}
                    {fmt(option.distance >= 1000 ? t.route.km : t.route.m, {
                      n:
                        option.distance >= 1000
                          ? (option.distance / 1000).toFixed(1)
                          : Math.round(option.distance),
                    })}
                  </p>
                  <p className="mt-1">
                    {a.score}/100 {t.route.score}
                  </p>
                </button>
              );
            })}
          </div>
          {chosen && assessment && (
            <article className="mt-6 rounded-3xl border-[length:var(--rule-w)] border-rule p-5 sm:p-7">
              <h3 className="text-2xl font-extrabold">{t.route.kind[chosen.kind]}</h3>
              {navigating ? (
                <div className="mt-4 space-y-3 rounded-2xl bg-paper-deep p-4">
                  <p role="status" className="font-bold">
                    {t.route.active}
                  </p>
                  <div
                    role="progressbar"
                    aria-label={t.route.active}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={routeProgress}
                    className="h-3 overflow-hidden rounded-full bg-background"
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: routeProgress + "%" }}
                    />
                  </div>
                  <p className="text-sm">{routeProgress}%</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => void navigate({ to: "/report" })}>
                      {t.route.reportHere}
                    </Button>
                    <Button variant="outline" onClick={() => setNavigating(false)}>
                      {t.route.stop}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  className="mt-4"
                  onClick={() => {
                    setCurrentLocation(here.real ? { lat: here.lat, lng: here.lng } : undefined);
                    setNavigating(true);
                  }}
                >
                  {t.route.start}
                </Button>
              )}
              {chosen.approx && (
                <p className="mt-3 rounded-xl bg-coral/20 p-4 font-semibold">
                  {t.route.approxLong}
                </p>
              )}
              <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">{t.route.score}</dt>
                  <dd className="numeral text-4xl">{assessment.score}/100</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {t.route.minutes.replace("{n}", "").trim()}
                  </dt>
                  <dd className="numeral text-4xl">
                    {fmt(t.route.minutes, { n: assessment.minutes })}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t.route.effort}</dt>
                  <dd className="mt-2 text-xl font-bold">
                    {t.route.effortLevel[assessment.effort]}
                  </dd>
                </div>
              </dl>
              <h4 className="mt-7 text-xl font-bold">{t.route.onTheWay}</h4>
              {assessment.flagged.length === 0 ? (
                <p className="mt-2">{t.route.noBarriers}</p>
              ) : (
                <ul className="mt-2 list-inside list-disc">
                  {assessment.flagged.map((f) => (
                    <li key={f.barrier.id}>
                      {t.barrier[f.barrier.type]} · {t.severity[f.barrier.severity]} ·{" "}
                      {fmt(t.route.away, { n: Math.round(f.meters) })}
                    </li>
                  ))}
                </ul>
              )}
              <h4 className="mt-7 text-xl font-bold">{t.route.steps}</h4>
              <ol className="mt-2 list-inside list-decimal">
                {chosen.steps.map((step, i) => (
                  <li key={step.type + "-" + i}>
                    {t.turn[step.type] ?? t.turn[6]}
                    {step.name ? " " + t.onto.replace("{name}", step.name) : ""} ·{" "}
                    {Math.round(step.distance)} m
                  </li>
                ))}
              </ol>
            </article>
          )}
        </section>
      )}
    </div>
  );
}
