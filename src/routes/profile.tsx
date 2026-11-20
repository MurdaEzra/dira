import { Link, createFileRoute } from "@tanstack/react-router";
import { RotateCcw, ShieldCheck } from "lucide-react";
import { useEffect, useRef } from "react";
import { usePrefs } from "@/lib/prefs";
import { LimitsFields, MobilityPicker, NeedsFields } from "@/components/dira/profile-fields";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { Theme } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My access profile & display — DIRA" },
      {
        name: "description",
        content: "Edit your mobility, limits, needs, colours, text size and language in DIRA.",
      },
      { property: "og:title", content: "My access profile & display — DIRA" },
      {
        property: "og:description",
        content: "Edit your mobility, limits, needs, colours, text size and language.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Profile,
});

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section
      aria-labelledby={`s-${n}`}
      className="grid gap-6 rule-t pt-6 lg:grid-cols-[14rem_1fr] lg:gap-12"
    >
      <div className="flex items-baseline gap-3 lg:flex-col lg:gap-1">
        <span className="numeral text-6xl text-coral" aria-hidden>
          {n}
        </span>
        <h2 id={`s-${n}`} className="text-2xl font-extrabold">
          {title}
        </h2>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10 last:mb-0">
      <h3 className="eyebrow mb-3 text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function Profile() {
  const { t, profile, setProfile, display, setDisplay, lang, setLang, announce, hydrated } =
    usePrefs();
  const ready = useRef(false);

  // Confirm every change for screen-reader users.
  useEffect(() => {
    if (!hydrated) return;
    if (!ready.current) {
      ready.current = true;
      return;
    }
    announce(t.profile.saved);
  }, [profile, display, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const themes: [Theme, string][] = [
    ["light", t.profile.themeLight],
    ["dark", t.profile.themeDark],
    ["hc", t.profile.themeHc],
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-nav lg:px-8 lg:pt-14">
      <header className="mb-12">
        <h1 className="text-6xl font-extrabold sm:text-8xl">{t.profile.title}</h1>
        <p className="mt-3 max-w-xl text-xl text-muted-foreground">{t.profile.lede}</p>
        <p className="mt-4 inline-flex items-center gap-2 font-semibold">
          <ShieldCheck aria-hidden className="size-5 text-signal-ink" /> {t.profile.privacy}
        </p>
      </header>

      <div className="space-y-16">
        <Section n="01" title={t.profile.access}>
          <Sub title={t.onboard.s1title}>
            <MobilityPicker value={profile} onChange={setProfile} />
          </Sub>
          <Sub title={t.onboard.s2title}>
            <LimitsFields value={profile} onChange={setProfile} />
          </Sub>
          <Sub title={t.profile.needs}>
            <NeedsFields value={profile} onChange={setProfile} />
          </Sub>
          <Button asChild variant="outline">
            <Link to="/onboarding">
              <RotateCcw aria-hidden /> {t.profile.redo}
            </Link>
          </Button>
        </Section>

        <Section n="02" title={t.profile.display}>
          <Sub title={t.profile.theme}>
            <div
              role="radiogroup"
              aria-label={t.profile.theme}
              className="grid gap-3 sm:grid-cols-3"
            >
              {themes.map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={display.theme === v}
                  onClick={() => setDisplay({ theme: v })}
                  className={cn(
                    "flex min-h-20 flex-col items-start justify-between gap-3 rounded-2xl border-[length:var(--rule-w)] p-4 text-left font-bold",
                    display.theme === v ? "border-signal ring-[3px] ring-signal" : "border-rule",
                    v === "light" && "swatch-light",
                    v === "dark" && "swatch-dark",
                    v === "hc" && "swatch-hc",
                  )}
                >
                  <span aria-hidden className="flex gap-1">
                    <span className="size-4 rounded-full bg-current" />
                    <span className="size-4 rounded-full dot-teal" />
                    <span className="size-4 rounded-full dot-coral" />
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </Sub>

          <Sub title={t.profile.textSize}>
            <div className="flex items-baseline justify-between">
              <label id="ts-label" className="text-lg font-semibold">
                {t.profile.textSize}
              </label>
              <output className="numeral text-4xl" aria-hidden>
                {Math.round(display.textScale * 100)}%
              </output>
            </div>
            <Slider
              aria-labelledby="ts-label"
              aria-valuetext={`${Math.round(display.textScale * 100)}%`}
              value={[Math.round(display.textScale * 100)]}
              min={100}
              max={200}
              step={10}
              onValueChange={([v]) => setDisplay({ textScale: (v ?? 100) / 100 })}
            />
            <p className="mt-2 font-display text-2xl font-bold" aria-hidden>
              Aa — {t.app.tagline}
            </p>
          </Sub>

          <ul className="divide-y-[length:var(--rule-w)] divide-border rule-t rule-b">
            <li>
              <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 py-3">
                <span>
                  <span className="block text-lg font-semibold">{t.profile.readable}</span>
                  <span className="block text-muted-foreground">{t.profile.readableHint}</span>
                </span>
                <Switch
                  checked={display.readable}
                  onCheckedChange={(v) => setDisplay({ readable: v })}
                />
              </label>
            </li>
            <li>
              <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 py-3 text-lg font-semibold">
                {t.profile.reduceMotion}
                <Switch
                  checked={display.reduceMotion}
                  onCheckedChange={(v) => setDisplay({ reduceMotion: v })}
                />
              </label>
            </li>
          </ul>
        </Section>

        <Section n="03" title={t.lang.label}>
          <div role="radiogroup" aria-label={t.lang.label} className="grid gap-3 sm:grid-cols-2">
            {(["en", "sw"] as const).map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                lang={l}
                aria-checked={lang === l}
                onClick={() => setLang(l)}
                className={cn(
                  "flex min-h-16 items-center justify-between rounded-full border-[length:var(--rule-w)] border-rule px-6 text-xl font-bold",
                  lang === l && "bg-primary text-primary-foreground",
                )}
              >
                {t.lang[l]}
                <span className="eyebrow">{l}</span>
              </button>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
