import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Check, MapPin } from "lucide-react";
import { usePrefs } from "@/lib/prefs";
import { topFeatures } from "@/lib/fit";
import { fmt } from "@/lib/i18n";
import type { ScoredPlace } from "@/lib/use-scored";
import { cn } from "@/lib/utils";
import { EvidenceLine, PinGlyph, TierMark } from "./marks";

const BAND_TEXT = { good: "text-signal-ink", partial: "text-foreground", poor: "text-coral-ink" };

export function FitNumeral({
  score,
  band,
  size = "md",
}: {
  score: number;
  band: ScoredPlace["band"];
  size?: "md" | "xl";
}) {
  return (
    <span
      className={cn(
        "numeral tabular-nums",
        BAND_TEXT[band],
        size === "xl" ? "text-[7rem] sm:text-[9rem]" : "text-5xl",
      )}
    >
      {score}
    </span>
  );
}

interface Props {
  item: ScoredPlace;
  onLocate?: () => void;
  selected?: boolean;
  dense?: boolean;
}

export function PlaceRow({ item, onLocate, selected, dense }: Props) {
  const { t, profile } = usePrefs();
  const { place, score, band, tier, last, km } = item;
  const feats = topFeatures(place, profile, 3);
  return (
    <li
      className={cn(
        "group relative grid grid-cols-[4.25rem_1fr] gap-x-4 py-5 sm:grid-cols-[5rem_1fr_auto]",
        selected &&
          "before:absolute before:inset-y-3 before:-left-4 before:w-1.5 before:rounded-full before:bg-signal lg:before:-left-6",
      )}
    >
      <div className="flex flex-col items-start pt-1">
        <FitNumeral score={score} band={band} />
        <span className="eyebrow mt-1 text-muted-foreground">{t.map.fit}</span>
      </div>
      <div className="min-w-0">
        <p className="eyebrow flex items-center gap-2 text-muted-foreground">
          <PinGlyph kind={band} small />
          {t.catOne[place.category]} · {place.area} · {fmt(t.discover.away, { n: km.toFixed(1) })}
        </p>
        <h3 className="mt-1 text-xl font-bold sm:text-2xl">
          <Link
            to="/places/$placeId"
            params={{ placeId: place.id }}
            className="rounded-sm underline-offset-4 after:absolute after:inset-0 hover:underline sm:after:hidden"
          >
            {place.name}
          </Link>
        </h3>
        {feats.length > 0 && (
          <ul className={cn("mt-2 flex flex-wrap gap-x-4 gap-y-1", dense && "text-sm")}>
            {feats.map((f) => (
              <li key={f.key} className="inline-flex items-center gap-1.5">
                <Check
                  aria-hidden
                  className={cn(
                    "size-4",
                    f.status === "yes" ? "text-signal-ink" : "text-muted-foreground",
                  )}
                  strokeWidth={3}
                />
                {t.feature[f.key]}
                {f.status === "partial" && (
                  <span className="text-muted-foreground">({t.status.partial.toLowerCase()})</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <TierMark tier={tier} compact />
          <EvidenceLine e={last} />
        </div>
      </div>
      <div className="relative z-10 col-span-2 mt-3 flex gap-2 sm:col-span-1 sm:mt-0 sm:flex-col sm:items-end">
        {onLocate && (
          <button
            type="button"
            onClick={onLocate}
            aria-label={`${t.discover.onMap}: ${place.name}`}
            className="tap inline-flex items-center justify-center gap-1.5 rounded-full px-3 font-semibold hover:bg-accent"
          >
            <MapPin aria-hidden className="size-5" />
            <span className="sm:sr-only">{t.discover.onMap}</span>
          </button>
        )}
        <Link
          to="/places/$placeId"
          params={{ placeId: place.id }}
          aria-label={`${t.map.open}: ${place.name}`}
          className="tap hidden items-center justify-center rounded-full hover:bg-accent sm:inline-flex"
        >
          <ArrowUpRight aria-hidden className="size-6" />
        </Link>
      </div>
    </li>
  );
}
