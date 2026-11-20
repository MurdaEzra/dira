import { Check } from "lucide-react";
import { useId } from "react";
import { usePrefs } from "@/lib/prefs";
import { MOBILITY_TYPES, type AccessProfile } from "@/lib/types";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface P {
  value: AccessProfile;
  onChange: (p: AccessProfile) => void;
}

export function MobilityPicker({ value, onChange }: P) {
  const { t } = usePrefs();
  return (
    <fieldset>
      <legend className="sr-only">{t.onboard.s1title}</legend>
      <ul className="divide-y-[length:var(--rule-w)] divide-border rule-t rule-b">
        {MOBILITY_TYPES.map((m) => {
          const on = value.mobility.includes(m);
          return (
            <li key={m}>
              <label className="group flex min-h-16 cursor-pointer items-center gap-4 py-3 text-lg font-semibold hover:bg-accent/60 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ring">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={() =>
                    onChange({
                      ...value,
                      mobility: on ? value.mobility.filter((x) => x !== m) : [...value.mobility, m],
                    })
                  }
                />
                <span
                  aria-hidden
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg border-[length:var(--rule-w)] border-rule",
                    on && "bg-primary text-primary-foreground",
                  )}
                >
                  {on && <Check className="size-5" strokeWidth={3} />}
                </span>
                {t.mobility[m]}
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (n: number) => void;
}) {
  const id = useId();
  return (
    <div className="py-5">
      <div className="flex items-baseline justify-between gap-4">
        <label id={id} className="text-lg font-semibold">
          {label}
        </label>
        <output className="numeral text-4xl" aria-hidden>
          {value}
          <span className="ml-1 text-lg font-bold">{unit}</span>
        </output>
      </div>
      <Slider
        aria-labelledby={id}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v ?? value)}
        className="mt-2"
      />
      <div className="flex justify-between text-sm text-muted-foreground" aria-hidden>
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="py-5">
      <legend className="text-lg font-semibold">{legend}</legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map(([v, label]) => (
          <label
            key={v}
            className={cn(
              "flex min-h-14 cursor-pointer items-center gap-3 rounded-full border-[length:var(--rule-w)] border-rule px-5 font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
              value === v && "bg-primary text-primary-foreground",
            )}
          >
            <input
              type="radio"
              className="sr-only"
              checked={value === v}
              onChange={() => onChange(v)}
            />
            <span
              aria-hidden
              className={cn(
                "size-4 rounded-full border-2 border-current",
                value === v && "bg-current",
              )}
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function LimitsFields({ value, onChange }: P) {
  const { t } = usePrefs();
  return (
    <div className="divide-y-[length:var(--rule-w)] divide-border">
      <SliderRow
        label={t.profile.maxSlope}
        value={value.maxSlope}
        min={2}
        max={12}
        step={1}
        unit="%"
        onChange={(n) => onChange({ ...value, maxSlope: n })}
      />
      <SliderRow
        label={t.profile.minWidth}
        value={value.minWidth}
        min={60}
        max={150}
        step={5}
        unit="cm"
        onChange={(n) => onChange({ ...value, minWidth: n })}
      />
      <SliderRow
        label={t.profile.maxKerb}
        value={value.maxKerb}
        min={0}
        max={10}
        step={1}
        unit="cm"
        onChange={(n) => onChange({ ...value, maxKerb: n })}
      />
      <Segmented
        legend={t.profile.surface}
        value={value.surface}
        options={[
          ["smooth", t.profile.surfaceSmooth],
          ["some_rough", t.profile.surfaceRough],
        ]}
        onChange={(surface) => onChange({ ...value, surface })}
      />
      <Segmented
        legend={t.profile.stairs}
        value={value.stairs}
        options={[
          ["never", t.profile.stairsNever],
          ["if_no_alt", t.profile.stairsAlt],
        ]}
        onChange={(stairs) => onChange({ ...value, stairs })}
      />
    </div>
  );
}

export function NeedsFields({ value, onChange }: P) {
  const { t } = usePrefs();
  const keys = ["lift", "toilet", "parking", "voiceFirst", "captions", "highContrast"] as const;
  return (
    <ul className="divide-y-[length:var(--rule-w)] divide-border rule-t rule-b">
      {keys.map((k) => (
        <li key={k}>
          <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 py-3 text-lg font-semibold">
            {t.profile[k]}
            <Switch
              checked={value.needs[k]}
              onCheckedChange={(v) => onChange({ ...value, needs: { ...value.needs, [k]: v } })}
            />
          </label>
        </li>
      ))}
    </ul>
  );
}
