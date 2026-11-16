import { BadgeCheck, CircleDashed, History, Users, Check, X, HelpCircle, Contrast } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmt, type Dict } from "@/lib/i18n";
import { needsRecheck, isExpired, type Tier } from "@/lib/confidence";
import type { Evidence, FeatureStatus } from "@/lib/types";
import { usePrefs } from "@/lib/prefs";

const TIER_ICON = { verified: BadgeCheck, community: Users, unconfirmed: CircleDashed, outdated: History };
const TIER_TONE: Record<Tier, string> = {
  verified: "text-signal-ink",
  community: "text-steel",
  unconfirmed: "text-foreground",
  outdated: "text-muted-foreground line-through decoration-1",
};

/** Confidence tier: icon + label + colour, never colour alone. */
export function TierMark({ tier, className, compact }: { tier: Tier; className?: string; compact?: boolean }) {
  const { t } = usePrefs();
  const Icon = TIER_ICON[tier];
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-semibold", className)}>
      <Icon aria-hidden className={cn("size-[1.15em] shrink-0", TIER_TONE[tier].split(" ")[0])} strokeWidth={2.4} />
      <span className={cn(compact && "text-sm", TIER_TONE[tier])}>{t.tier[tier]}</span>
    </span>
  );
}

export function whenText(t: Dict, e: Evidence) {
  const when = e.daysAgo === 0 ? t.time.today : fmt(t.time.days, { n: e.daysAgo });
  return fmt(t.time.lastConfirmed, { when });
}
export function confirmText(t: Dict, e: Evidence) {
  return e.confirmations === 1 ? t.time.confirmation : fmt(t.time.confirmations, { n: e.confirmations });
}

/** "Last confirmed 12 days ago · 3 confirmations" plus re-check / expiry flags. */
export function EvidenceLine({ e, className }: { e: Evidence; className?: string }) {
  const { t } = usePrefs();
  return (
    <span className={cn("text-sm text-muted-foreground", className)}>
      {whenText(t, e)}
      {e.confirmations > 0 && <> · {confirmText(t, e)}</>}
      {isExpired(e) && <span className="ml-1 font-semibold text-foreground">· {t.time.expired}</span>}
      {needsRecheck(e) && (
        <span className="mt-0.5 block font-semibold text-coral-ink">⚠ {t.time.recheck}</span>
      )}
    </span>
  );
}

const STATUS_STYLE: Record<FeatureStatus, { Icon: typeof Check; box: string }> = {
  yes: { Icon: Check, box: "bg-signal text-signal-foreground" },
  partial: { Icon: Contrast, box: "bg-caution text-caution-foreground" },
  no: { Icon: X, box: "hatch text-foreground border-[length:var(--rule-w)] border-coral" },
  unknown: { Icon: HelpCircle, box: "border-[length:var(--rule-w)] border-dashed border-muted-foreground text-muted-foreground" },
};

export function StatusMark({ status, withLabel = true }: { status: FeatureStatus; withLabel?: boolean }) {
  const { t } = usePrefs();
  const { Icon, box } = STATUS_STYLE[status];
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className={cn("grid size-8 shrink-0 place-items-center rounded-lg", box)}>
        <Icon className="size-5" strokeWidth={3} />
      </span>
      {withLabel ? <span className="font-bold">{t.status[status]}</span> : <span className="sr-only">{t.status[status]}</span>}
    </span>
  );
}

/* ---------- Map pin shapes. Shape carries meaning; colour reinforces it. ---------- */
export type PinKind = "good" | "partial" | "poor" | "barrier" | "resolved" | "ramp";

export function pinSvg(kind: PinKind): string {
  const wrap = (body: string) => `<svg viewBox="0 0 36 36" aria-hidden="true" focusable="false">${body}</svg>`;
  switch (kind) {
    case "good":
      return wrap(`<circle class="shape-good" cx="18" cy="18" r="14"/><path class="glyph" d="M11.5 18.5l4.2 4.2 8.8-9"/>`);
    case "partial":
      return wrap(`<rect class="shape-partial" x="7.5" y="7.5" width="21" height="21" rx="3" transform="rotate(45 18 18)"/><path class="glyph-dark" d="M12.5 18h11"/>`);
    case "poor":
      return wrap(`<path class="shape-poor" d="M18 4.5l14 25H4z" stroke-linejoin="round"/><path class="glyph-dark" d="M18 13v7.5M18 24.6v.4"/>`);
    case "barrier":
      return wrap(`<path class="shape-barrier" d="M12.2 4h11.6L32 12.2v11.6L23.8 32H12.2L4 23.8V12.2z"/><path class="glyph" d="M18 10.5v9M18 24.6v.4"/>`);
    case "resolved":
      return wrap(`<path class="shape-resolved" d="M12.2 4h11.6L32 12.2v11.6L23.8 32H12.2L4 23.8V12.2z"/><path class="glyph" d="M11.5 18.5l4.2 4.2 8.8-9"/>`);
    case "ramp":
      return wrap(`<rect class="shape-ramp" x="5" y="5" width="26" height="26" rx="6"/><path class="glyph" d="M10 25h16L10 15z"/>`);
  }
}

export function PinGlyph({ kind, small }: { kind: PinKind; small?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn("dira-pin pointer-events-none inline-grid", small && "is-small")}
      dangerouslySetInnerHTML={{ __html: pinSvg(kind) }}
    />
  );
}

export function Legend() {
  const { t } = usePrefs();
  const items: [PinKind, string][] = [
    ["good", t.map.legendGood],
    ["partial", t.map.legendPartial],
    ["poor", t.map.legendPoor],
    ["barrier", t.map.legendBarrier],
    ["ramp", t.map.legendRamp],
  ];
  return (
    <ul className="grid gap-1.5">
      {items.map(([k, label]) => (
        <li key={k} className="flex items-center gap-3 text-sm">
          <PinGlyph kind={k} small />
          {label}
        </li>
      ))}
    </ul>
  );
}
