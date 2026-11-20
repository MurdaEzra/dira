import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrefs } from "@/lib/prefs";
import { useAuth } from "@/lib/auth";
import { useCityData, nearestArea } from "@/lib/data";
import { BARRIER_TYPES, type BarrierType, type Severity } from "@/lib/types";
import { analyzePhoto } from "@/lib/photo.functions";
import { enqueue, preparePhoto, sendReport, type ReportDraft } from "@/lib/reports";

export const Route = createFileRoute("/report")({ component: ReportPage });

function ReportPage() {
  const { t, here, setHere, announce } = usePrefs();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const city = useCityData();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<BarrierType>("blocked_path");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [lat, setLat] = useState(here.lat);
  const [lng, setLng] = useState(here.lng);
  const [note, setNote] = useState("");
  const [temporary, setTemporary] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoStatus, setPhotoStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [error, setError] = useState("");

  function useLocation() {
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude);
        setLng(p.coords.longitude);
        setHere({ lat: p.coords.latitude, lng: p.coords.longitude, real: true });
        announce(t.report.gpsOk);
      },
      () => setError(t.report.gpsFail),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 12_000_000 || !file.type.startsWith("image/")) {
      setError(t.report.failed);
      return;
    }
    setPhoto(file);
    setPhotoStatus(t.report.photoChecking);
    setError("");
    if (!user) {
      setPhotoStatus(t.report.photoNoAi);
      return;
    }
    const checked = await preparePhoto(file, analyzePhoto);
    setPhotoStatus(checked.ready ? t.report.photoReady : t.report.photoNoAi);
  }

  async function submit(saveOnly = false) {
    if (!user && !saveOnly) {
      setError(t.report.signInToSend);
      return;
    }
    setBusy(true);
    setError("");
    setOutcome("");
    const draft: ReportDraft = {
      clientRef: crypto.randomUUID(),
      type,
      severity,
      lat,
      lng,
      temporary,
      note: note.slice(0, 500),
      area: nearestArea(city, lat, lng),
      createdAt: Date.now(),
    };
    if (photo && user) {
      const checked = await preparePhoto(photo, analyzePhoto);
      draft.photo = { blob: checked.blob, analysis: checked.analysis, ready: checked.ready };
    }
    try {
      if (saveOnly) {
        await enqueue(draft);
        setOutcome(t.report.queued);
      } else {
        const result = await sendReport(draft, analyzePhoto);
        if (result.status === "sent") {
          setOutcome(result.merged ? t.report.merged : t.report.sent);
          await queryClient.invalidateQueries({ queryKey: ["city"] });
        } else if (result.status === "queued") setOutcome(t.report.queued);
        else
          setError(
            result.code === "rate_limited"
              ? t.report.rateLimited
              : result.code === "not_signed_in"
                ? t.report.signInToSend
                : t.report.failed,
          );
      }
    } catch {
      setError(t.report.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 pb-nav lg:px-8 lg:pt-14">
      <header className="mb-8">
        <p className="eyebrow text-signal-ink">{t.report.step.replace("{n}", String(step + 1))}</p>
        <h1 className="mt-2 text-5xl font-extrabold sm:text-7xl">{t.report.title}</h1>
        <p className="mt-3 text-xl text-muted-foreground">{t.report.lede}</p>
      </header>
      <div
        className="mb-6 grid grid-cols-3 gap-2"
        aria-label={t.report.step.replace("{n}", String(step + 1))}
      >
        {[0, 1, 2].map((n) => (
          <div
            key={n}
            className={n <= step ? "h-2 rounded-full bg-primary" : "h-2 rounded-full bg-muted"}
          />
        ))}
      </div>
      {step === 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-extrabold">{t.report.step1}</h2>
          <fieldset>
            <legend className="mb-3 text-lg font-bold">{t.report.step1}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {BARRIER_TYPES.map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={type === v}
                  onClick={() => setType(v)}
                  className={
                    type === v
                      ? "min-h-14 rounded-2xl border-2 border-signal bg-primary px-4 text-left font-bold text-primary-foreground"
                      : "min-h-14 rounded-2xl border-2 border-rule px-4 text-left font-bold"
                  }
                >
                  {t.barrier[v]}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="rounded-2xl bg-paper-deep p-4">
            <h3 className="text-lg font-bold">{t.report.where}</h3>
            <p className="mt-1 text-muted-foreground">{t.report.whereHint}</p>
            <p className="mt-2 font-mono">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm font-bold">
                {t.report.latitude}
                <input
                  type="number"
                  min={-90}
                  max={90}
                  step="0.00001"
                  value={lat}
                  onChange={(e) => setLat(Number(e.target.value))}
                  className="h-12 rounded-xl border-2 border-rule bg-background px-3 font-mono"
                />
              </label>
              <label className="grid gap-1 text-sm font-bold">
                {t.report.longitude}
                <input
                  type="number"
                  min={-180}
                  max={180}
                  step="0.00001"
                  value={lng}
                  onChange={(e) => setLng(Number(e.target.value))}
                  className="h-12 rounded-xl border-2 border-rule bg-background px-3 font-mono"
                />
              </label>
            </div>
            <Button className="mt-3" variant="outline" onClick={useLocation}>
              <MapPin aria-hidden />
              {t.report.useGps}
            </Button>
          </div>
        </section>
      )}
      {step === 1 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-extrabold">{t.report.step2}</h2>
          <fieldset>
            <legend className="mb-3 text-lg font-bold">{t.report.step2}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["low", "medium", "high", "blocking"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={severity === v}
                  onClick={() => setSeverity(v)}
                  className={
                    severity === v
                      ? "min-h-20 rounded-2xl border-2 border-signal bg-primary p-4 text-left text-primary-foreground"
                      : "min-h-20 rounded-2xl border-2 border-rule p-4 text-left"
                  }
                >
                  <span className="block font-bold">{t.severity[v]}</span>
                  <span className="text-sm">{t.report.sevHint[v]}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex min-h-14 items-center gap-3 text-lg">
            <input
              type="checkbox"
              checked={temporary}
              onChange={(e) => setTemporary(e.target.checked)}
              className="size-5"
            />
            <span>
              {t.report.temporary}
              <small className="block text-sm text-muted-foreground">
                {t.report.temporaryHint}
              </small>
            </span>
          </label>
          <label className="grid gap-2 text-lg font-bold">
            {t.report.note}
            <textarea
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.report.notePlaceholder}
              className="min-h-24 rounded-2xl border-2 border-rule bg-background p-4 font-normal"
            />
          </label>
          <label className="grid gap-2 text-lg font-bold">
            {t.report.photo}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onPhoto}
              className="min-h-12 rounded-xl border border-rule p-2"
            />
            <span className="text-sm font-normal text-muted-foreground">{t.report.photoHint}</span>
            {photoStatus && (
              <span role="status" className="text-sm">
                {photoStatus}
              </span>
            )}
          </label>
        </section>
      )}
      {step === 2 && (
        <section className="space-y-5">
          <h2 className="text-2xl font-extrabold">{t.report.step3}</h2>
          <dl className="divide-y divide-border rounded-2xl border-2 border-rule px-5">
            <div className="py-4">
              <dt className="text-sm text-muted-foreground">{t.report.step1}</dt>
              <dd className="text-xl font-bold">{t.barrier[type]}</dd>
            </div>
            <div className="py-4">
              <dt className="text-sm text-muted-foreground">{t.report.step2}</dt>
              <dd className="text-xl font-bold">{t.severity[severity]}</dd>
            </div>
            <div className="py-4">
              <dt className="text-sm text-muted-foreground">{t.report.where}</dt>
              <dd>
                {nearestArea(city, lat, lng)} · {lat.toFixed(5)}, {lng.toFixed(5)}
              </dd>
            </div>
            <div className="py-4">
              <dt className="text-sm text-muted-foreground">{t.report.note}</dt>
              <dd>{note || "—"}</dd>
            </div>
          </dl>
          {!user && (
            <p className="rounded-xl bg-paper-deep p-4">
              {t.report.signInToSend}{" "}
              <Link to="/sign-in" className="underline">
                {t.nav.signIn}
              </Link>
            </p>
          )}
          {outcome && (
            <p role="status" className="rounded-xl bg-primary/10 p-4 font-bold">
              <Check aria-hidden className="mr-2 inline size-5" />
              {outcome}
            </p>
          )}
        </section>
      )}
      {error && (
        <p role="alert" className="mt-5 text-coral-ink">
          {error}
        </p>
      )}
      <div className="mt-8 flex flex-wrap justify-between gap-3">
        {step > 0 ? (
          <Button variant="outline" onClick={() => setStep(step - 1)}>
            <ChevronLeft aria-hidden />
            {t.report.back}
          </Button>
        ) : (
          <span />
        )}
        {step < 2 ? (
          <Button onClick={() => setStep(step + 1)}>
            {t.report.next}
            <ChevronRight aria-hidden />
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => submit(true)} disabled={busy}>
              {t.report.saveLater}
            </Button>
            <Button onClick={() => submit()} disabled={busy}>
              {busy ? t.report.sending : t.report.send}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
