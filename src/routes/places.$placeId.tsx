import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, MapPin } from "lucide-react";
import { getPlace } from "@/data/seed";
import { usePrefs } from "@/lib/prefs";
import { distanceKm, featureWeights, fitBand, fitScore } from "@/lib/fit";
import { lastVerified, placeTier } from "@/lib/place";
import { fmt } from "@/lib/i18n";
import { SOURCE_WEIGHTS, TIER_ORDER, tier } from "@/lib/confidence";
import { Button } from "@/components/ui/button";
import { EvidenceLine, StatusMark, TierMark } from "@/components/dira/marks";
import { FitNumeral } from "@/components/dira/place-row";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/places/$placeId")({
  loader: ({ params }) => {
    const place = getPlace(params.placeId);
    if (!place) throw notFound();
    return { place };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.place.name ?? "Place";
    const desc = `Step-free access, lifts, toilets and more at ${name} — every detail with how much you can trust it.`;
    return {
      meta: [
        { title: `${name} accessibility — DIRA` },
        { name: "description", content: desc },
        { property: "og:title", content: `${name} accessibility — DIRA` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: NotFoundPlace,
  component: PlaceDetail,
});

function NotFoundPlace() {
  const { t } = usePrefs();
  return (
    <div className="mx-auto max-w-2xl px-5 py-20">
      <h1 className="text-4xl font-extrabold">{t.place.notFound}</h1>
      <Button asChild className="mt-6">
        <Link to="/discover">{t.nav.discover}</Link>
      </Button>
    </div>
  );
}

function PlaceDetail() {
  const { place } = Route.useLoaderData();
  const { t, profile, here } = usePrefs();
  const score = fitScore(place, profile);
  const band = fitBand(score);
  const weights = featureWeights(profile);
  const last = lastVerified(place);
  const hasProfile = profile.mobility.length > 0;

  const ordered = [...place.features].sort((a, b) => (weights[b.key] ?? 0) - (weights[a.key] ?? 0));

  return (
    <article className="mx-auto max-w-5xl px-4 pt-6 pb-nav lg:px-8 lg:pt-10">
      <Button asChild variant="ghost" className="-ml-3">
        <Link to="/discover">
          <ArrowLeft aria-hidden /> {t.place.back}
        </Link>
      </Button>

      <header className="mt-6">
        <p className="eyebrow text-muted-foreground">
          {t.catOne[place.category]} · {place.area} · {fmt(t.discover.away, { n: distanceKm(here, place).toFixed(1) })}
        </p>
        <h1 className="mt-3 max-w-4xl text-5xl font-extrabold sm:text-7xl">{place.name}</h1>
        <p className="mt-3 inline-block rounded-full bg-coral px-3 py-1 text-sm font-bold text-coral-foreground">{t.app.demo}</p>
      </header>

      {/* Fit — set like a platform number, no box */}
      <section aria-labelledby="fit-h" className="mt-10 grid gap-6 rule-t pt-6 sm:grid-cols-[auto_1fr] sm:items-end sm:gap-10">
        <div className="flex items-end gap-3">
          <FitNumeral score={score} band={band} size="xl" />
          <span className="mb-4 font-display text-2xl font-bold text-muted-foreground">/100</span>
        </div>
        <div className="pb-3">
          <h2 id="fit-h" className="text-3xl font-extrabold">
            {t.place.fitFor}
          </h2>
          <p className="mt-2 max-w-md text-lg text-muted-foreground">{t.place.fitExplain}</p>
          {!hasProfile && (
            <p className="mt-2">
              {t.place.noProfile}{" "}
              <Link to="/onboarding" className="font-semibold underline decoration-2 underline-offset-4">
                {t.place.setProfile}
              </Link>
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <TierMark tier={placeTier(place)} />
            <EvidenceLine e={last} />
          </div>
          <Button asChild variant="outline" className="mt-5">
            <Link to="/" search={{ place: place.id }}>
              <MapPin aria-hidden /> {t.place.viewOnMap}
            </Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="check-h" className="mt-14">
        <div className="rule-b pb-4">
          <h2 id="check-h" className="text-4xl font-extrabold">
            {t.place.checklist}
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">{t.place.checklistLede}</p>
        </div>
        <ul className="divide-y-[length:var(--rule-w)] divide-border">
          {ordered.map((f) => {
            const important = (weights[f.key] ?? 0) >= 2;
            return (
              <li
                key={f.key}
                className={cn(
                  "relative grid gap-x-6 gap-y-2 py-5 sm:grid-cols-[minmax(0,1.2fr)_8rem_minmax(0,1.4fr)] sm:items-center",
                  important && "before:absolute before:inset-y-4 before:-left-4 before:w-1.5 before:rounded-full before:bg-signal",
                )}
              >
                <div>
                  <h3 className="text-xl font-bold">{t.feature[f.key]}</h3>
                  {important && <p className="eyebrow mt-1 text-signal-ink">● {t.profile.needs}</p>}
                </div>
                <StatusMark status={f.status} />
                <div>
                  <TierMark tier={tier(f.evidence)} compact />
                  <div>
                    <EvidenceLine e={f.evidence} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t.place.source}: {t.source[f.evidence.source]}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="trust-h" className="mt-16 grid gap-8 rule-t pt-8 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <h2 id="trust-h" className="text-3xl font-extrabold">
            {t.place.trust}
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">{t.place.trustLede}</p>
          <p className="mt-5 font-mono text-sm leading-relaxed">
            confidence = source × recency × corroboration × (1 − conflict)
          </p>
          <ul className="mt-4 space-y-1 font-mono text-sm text-muted-foreground">
            {Object.entries(SOURCE_WEIGHTS).map(([k, w]) => (
              <li key={k} className="flex justify-between gap-4 border-b border-border py-1">
                <span>{t.source[k as keyof typeof SOURCE_WEIGHTS]}</span>
                <span className="tabular-nums">{w.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
        <dl className="divide-y-[length:var(--rule-w)] divide-border">
          {TIER_ORDER.map((tr) => (
            <div key={tr} className="py-4">
              <dt>
                <TierMark tier={tr} className="text-xl" />
              </dt>
              <dd className="mt-1 text-muted-foreground">{t.tierHint[tr]}</dd>
            </div>
          ))}
        </dl>
      </section>
    </article>
  );
}
