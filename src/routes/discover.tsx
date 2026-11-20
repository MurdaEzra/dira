import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { usePrefs } from "@/lib/prefs";
import { useScoredPlaces } from "@/lib/use-scored";
import { useCityData, useCityDataStatus } from "@/lib/data";
import { useQueryClient } from "@tanstack/react-query";
import { fmt } from "@/lib/i18n";
import { meetsTier, TIER_ORDER, type Tier } from "@/lib/confidence";
import { CATEGORIES, type Category, type FeatureKey } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlaceRow } from "@/components/dira/place-row";
import { TierMark } from "@/components/dira/marks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover accessible places — DIRA" },
      {
        name: "description",
        content:
          "Find restaurants, hospitals, campuses and transport in Nairobi ranked by how well they fit your access needs.",
      },
      { property: "og:title", content: "Discover accessible places — DIRA" },
      {
        property: "og:description",
        content: "Places in Nairobi ranked by how well they fit your access needs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Discover,
});

const MUST: FeatureKey[] = [
  "step_free_entrance",
  "lift",
  "accessible_toilet",
  "accessible_parking",
  "tactile_signage",
  "hearing_loop",
  "quiet_hours",
];

function Discover() {
  const { t } = usePrefs();
  const navigate = useNavigate();
  const scored = useScoredPlaces();
  const city = useCityData();
  const cityStatus = useCityDataStatus();
  const queryClient = useQueryClient();
  const [cat, setCat] = useState<Category | "all">("all");
  const [must, setMust] = useState<FeatureKey[]>([]);
  const [minTier, setMinTier] = useState<Tier | "any">("any");

  const results = useMemo(
    () =>
      scored.filter(
        (s) =>
          (cat === "all" || s.place.category === cat) &&
          must.every((k) => s.place.features.find((f) => f.key === k)?.status === "yes") &&
          meetsTier(s.tier, minTier),
      ),
    [scored, cat, must, minTier],
  );
  const filtered = cat !== "all" || must.length > 0 || minTier !== "any";

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-nav lg:px-8 lg:pt-14">
      <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <h1 className="text-6xl font-extrabold sm:text-8xl">{t.discover.title}</h1>
          <p className="mt-3 max-w-xl text-xl text-muted-foreground">{t.discover.lede}</p>
        </div>
        <p className="numeral text-7xl text-signal-ink sm:text-8xl" aria-live="polite">
          {results.length}
          <span className="sr-only"> {fmt(t.discover.results, { n: results.length })}</span>
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[18rem_1fr]">
        <aside
          aria-label="Filters"
          className="space-y-8 lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:self-start"
        >
          <fieldset>
            <legend className="eyebrow mb-3 text-muted-foreground">{t.discover.category}</legend>
            <div className="flex flex-wrap gap-2">
              {(["all", ...CATEGORIES] as const).map((c) => (
                <Button
                  key={c}
                  variant="chip"
                  size="sm"
                  aria-pressed={cat === c}
                  onClick={() => setCat(c)}
                >
                  {c === "all" ? t.map.allCategories : t.cat[c]}
                </Button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="eyebrow mb-3 text-muted-foreground">{t.discover.features}</legend>
            <div className="flex flex-wrap gap-2">
              {MUST.map((k) => (
                <Button
                  key={k}
                  variant="chip"
                  size="sm"
                  aria-pressed={must.includes(k)}
                  onClick={() =>
                    setMust((m) => (m.includes(k) ? m.filter((x) => x !== k) : [...m, k]))
                  }
                >
                  {t.feature[k]}
                </Button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="eyebrow mb-3 text-muted-foreground">{t.discover.minTier}</legend>
            <div className="grid gap-1">
              {(["any", ...TIER_ORDER.filter((x) => x !== "outdated")] as const).map((tr) => (
                <label
                  key={tr}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-center gap-3 rounded-full px-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ring",
                    minTier === tr
                      ? "bg-primary text-primary-foreground [&_*]:text-primary-foreground"
                      : "hover:bg-accent",
                  )}
                >
                  <input
                    type="radio"
                    name="min-tier"
                    className="sr-only"
                    checked={minTier === tr}
                    onChange={() => setMinTier(tr)}
                  />
                  {tr === "any" ? (
                    <span className="font-semibold">{t.discover.any}</span>
                  ) : (
                    <TierMark tier={tr} />
                  )}
                </label>
              ))}
            </div>
          </fieldset>

          {filtered && (
            <Button
              variant="outline"
              onClick={() => {
                setCat("all");
                setMust([]);
                setMinTier("any");
              }}
            >
              {t.discover.reset}
            </Button>
          )}
        </aside>

        <section aria-labelledby="results-h">
          <h2 id="results-h" className="sr-only">
            {fmt(t.discover.results, { n: results.length })}
          </h2>
          <p className="eyebrow rule-b pb-3 text-muted-foreground">{t.discover.sortNote}</p>
          {city.source === "empty" ? (
            <div className="space-y-3 py-12" role="status">
              <p>{cityStatus.loading ? t.app.dataLoading : t.app.dataUnavailable}</p>
              {!cityStatus.loading && (
                <Button
                  variant="outline"
                  onClick={() => void queryClient.invalidateQueries({ queryKey: ["city"] })}
                >
                  {t.app.retry}
                </Button>
              )}
            </div>
          ) : city.places.length === 0 ? (
            <p className="py-12 text-xl">{t.app.noData}</p>
          ) : results.length === 0 ? (
            <p className="py-12 text-xl">{t.discover.none}</p>
          ) : (
            <ul className="divide-y-[length:var(--rule-w)] divide-border">
              {results.map((s) => (
                <PlaceRow
                  key={s.place.id}
                  item={s}
                  onLocate={() => navigate({ to: "/", search: { place: s.place.id } })}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
