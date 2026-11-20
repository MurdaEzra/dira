import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { usePrefs } from "@/lib/prefs";
import { Button } from "@/components/ui/button";
import { LimitsFields, MobilityPicker, NeedsFields } from "@/components/dira/profile-fields";
import { LogoMark } from "@/components/dira/wordmark";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your access profile — DIRA" },
      {
        name: "description",
        content: "Tell DIRA how you get around so every place and warning is ranked for you.",
      },
      { property: "og:title", content: "Set up your access profile — DIRA" },
      {
        property: "og:description",
        content: "Tell DIRA how you get around so every place and warning is ranked for you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const { t, profile, setProfile, setOnboarded, announce } = usePrefs();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus();
    window.scrollTo({ top: 0 });
  }, [step]);

  const steps = [
    {
      title: t.onboard.s1title,
      lede: t.onboard.s1lede,
      body: <MobilityPicker value={profile} onChange={setProfile} />,
    },
    {
      title: t.onboard.s2title,
      lede: t.onboard.s2lede,
      body: <LimitsFields value={profile} onChange={setProfile} />,
    },
    {
      title: t.onboard.s3title,
      lede: t.onboard.s3lede,
      body: <NeedsFields value={profile} onChange={setProfile} />,
    },
  ];
  const cur = steps[step] ?? steps[0]!;

  function finish() {
    setOnboarded(true);
    announce(t.onboard.done);
    navigate({ to: "/" });
  }

  return (
    <div className="mx-auto max-w-2xl px-5 pt-8 pb-nav lg:pt-14">
      <div className="flex items-center justify-between">
        <p className="eyebrow text-muted-foreground">
          {t.onboard.step} {step + 1} {t.onboard.of} {steps.length}
        </p>
        <Button variant="link" onClick={finish}>
          {t.onboard.skip}
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2" aria-hidden>
        {steps.map((_, i) => (
          <span
            key={i}
            className={cn("h-2 rounded-full", i <= step ? "bg-signal" : "bg-foreground/15")}
          />
        ))}
      </div>

      <div key={step} className="rise">
        <div className="mt-10 flex items-end gap-4">
          <span className="numeral text-[6.5rem] text-coral sm:text-[8rem]" aria-hidden>
            0{step + 1}
          </span>
          {step === 0 && <LogoMark className="mb-5 h-12 text-foreground sm:h-14" />}
        </div>
        <h1
          ref={heading}
          tabIndex={-1}
          className="mt-2 text-4xl font-extrabold outline-none sm:text-5xl"
        >
          {cur.title}
        </h1>
        <p className="mt-3 max-w-prose text-lg text-muted-foreground">{cur.lede}</p>
        <div className="mt-8">{cur.body}</div>
      </div>

      <div className="mt-10 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => s - 1)}
          className={cn(step === 0 && "invisible")}
        >
          <ArrowLeft aria-hidden /> {t.onboard.back}
        </Button>
        {step < steps.length - 1 ? (
          <Button size="lg" onClick={() => setStep((s) => s + 1)}>
            {t.onboard.next} <ArrowRight aria-hidden />
          </Button>
        ) : (
          <Button size="lg" variant="signal" onClick={finish}>
            {t.onboard.finish} <ArrowRight aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}
