import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { addSurveyedPlace, approveBarrierReport, loadAdminReview } from "@/lib/admin.functions";
import { usePrefs } from "@/lib/prefs";
import {
  BARRIER_TYPES,
  CATEGORIES,
  FEATURE_KEYS,
  type Category,
  type FeatureKey,
  type FeatureStatus,
} from "@/lib/types";

export const Route = createFileRoute("/admin")({ component: AdminPage });

type ReviewData = Awaited<ReturnType<typeof loadAdminReview>>;

function AdminPage() {
  const { t, announce } = usePrefs();
  const { user, roleReady, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [review, setReview] = useState<ReviewData>();
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("public");
  const [area, setArea] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [features, setFeatures] = useState<Record<FeatureKey, FeatureStatus>>(
    () =>
      Object.fromEntries(FEATURE_KEYS.map((key) => [key, "unknown"])) as Record<
        FeatureKey,
        FeatureStatus
      >,
  );

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setReview(await loadAdminReview());
    } catch {
      setError(t.admin.approveFailed);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (roleReady && isAdmin) void refresh();
    // refresh is an action wrapper; only load when the authorization state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleReady, isAdmin]);

  async function approve(id: string) {
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      await approveBarrierReport({ data: id });
      setNotice(t.admin.approved);
      await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: ["city"] })]);
      announce(t.admin.approved);
    } catch {
      setError(t.admin.approveFailed);
    } finally {
      setBusyId("");
    }
  }

  function locate() {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLng(position.coords.longitude.toFixed(6));
      },
      () => setError(t.map.locateFail),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function savePlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId("place");
    setError("");
    setNotice("");
    try {
      const created = await addSurveyedPlace({
        data: {
          name: name.trim(),
          category,
          area: area.trim(),
          lat: Number(lat),
          lng: Number(lng),
          features: FEATURE_KEYS.map((feature) => ({ feature, status: features[feature] })),
        },
      });
      if (!created.ok) throw new Error("save failed");
      setNotice(t.admin.placeAdded);
      setName("");
      setArea("");
      await queryClient.invalidateQueries({ queryKey: ["city"] });
    } catch {
      setError(t.admin.placeFailed);
    } finally {
      setBusyId("");
    }
  }

  if (!roleReady || (user && !roleReady))
    return (
      <main className="mx-auto max-w-5xl px-4 py-16" role="status">
        {t.admin.loading}
      </main>
    );
  if (!user || !isAdmin)
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-4xl font-extrabold">{t.admin.title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{t.admin.denied}</p>
        {!user && (
          <Button asChild className="mt-5">
            <Link to="/sign-in">{t.nav.signIn}</Link>
          </Button>
        )}
      </main>
    );

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 pt-8 pb-nav lg:px-8 lg:pt-14">
      <header>
        <p className="eyebrow mb-3 flex items-center gap-2 text-signal-ink">
          <ShieldCheck aria-hidden className="size-4" />
          {t.nav.admin}
        </p>
        <h1 className="text-5xl font-extrabold sm:text-7xl">{t.admin.title}</h1>
        <p className="mt-3 max-w-3xl text-xl text-muted-foreground">{t.admin.lede}</p>
      </header>
      {error && (
        <p role="alert" className="rounded-xl bg-coral/20 p-4 text-coral-ink">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-primary/10 p-4 font-semibold">
          {notice}
        </p>
      )}

      <section aria-labelledby="review-heading">
        <h2 id="review-heading" className="text-3xl font-extrabold">
          {t.admin.queue}
        </h2>
        {loading ? (
          <p role="status" className="mt-4">
            {t.admin.loading}
          </p>
        ) : null}
        {!loading && review?.reports.length === 0 ? (
          <p className="mt-4 text-muted-foreground">{t.admin.queueEmpty}</p>
        ) : null}
        <ul className="mt-5 grid gap-4 md:grid-cols-2">
          {review?.reports.map((report) => (
            <li key={report.id} className="rounded-3xl border-2 border-rule p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-extrabold">
                    {
                      t.barrier[
                        BARRIER_TYPES.includes(report.type as (typeof BARRIER_TYPES)[number])
                          ? (report.type as (typeof BARRIER_TYPES)[number])
                          : "other"
                      ]
                    }
                  </h3>
                  <p className="mt-1">
                    {t.severity[report.severity as keyof typeof t.severity]} · {report.area || "—"}
                  </p>
                </div>
                <span className="rounded-full bg-paper-deep px-3 py-1 text-sm font-bold">
                  {t.bstatus[report.status as keyof typeof t.bstatus]}
                </span>
              </div>
              {report.note && <p className="mt-3 whitespace-pre-wrap">{report.note}</p>}
              <p className="mt-3 font-mono text-sm">
                {report.lat.toFixed(5)}, {report.lng.toFixed(5)}
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {review.media
                  .filter((item) => item.barrier_id === report.id && item.url)
                  .map((item) => (
                    <li key={item.id}>
                      <a href={item.url!} target="_blank" rel="noreferrer">
                        <img
                          src={item.url!}
                          alt={t.gallery.title}
                          className="size-20 rounded-xl object-cover"
                        />
                      </a>
                    </li>
                  ))}
              </ul>
              <Button
                className="mt-4"
                onClick={() => void approve(report.id)}
                disabled={busyId === report.id}
              >
                {busyId === report.id ? t.admin.approving : t.admin.approve}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="survey-heading" className="rounded-3xl bg-paper-deep p-5 sm:p-8">
        <h2 id="survey-heading" className="text-3xl font-extrabold">
          {t.admin.survey}
        </h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">{t.admin.surveyLede}</p>
        <form className="mt-6 space-y-6" onSubmit={(event) => void savePlace(event)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 font-bold">
              {t.admin.name}
              <input
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-xl border-2 border-rule bg-background px-3 font-normal"
              />
            </label>
            <label className="grid gap-2 font-bold">
              {t.admin.category}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="h-12 rounded-xl border-2 border-rule bg-background px-3"
              >
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {t.catOne[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 font-bold sm:col-span-2">
              {t.admin.area}
              <input
                required
                maxLength={100}
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="h-12 rounded-xl border-2 border-rule bg-background px-3 font-normal"
              />
            </label>
            <label className="grid gap-2 font-bold">
              {t.admin.latitude}
              <input
                required
                type="number"
                min={-5.5}
                max={5.5}
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="h-12 rounded-xl border-2 border-rule bg-background px-3 font-mono font-normal"
              />
            </label>
            <label className="grid gap-2 font-bold">
              {t.admin.longitude}
              <input
                required
                type="number"
                min={33.5}
                max={42.5}
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="h-12 rounded-xl border-2 border-rule bg-background px-3 font-mono font-normal"
              />
            </label>
          </div>
          <Button type="button" variant="outline" onClick={locate}>
            <MapPin aria-hidden />
            {t.admin.useLocation}
          </Button>
          <fieldset>
            <legend className="mb-3 text-xl font-bold">{t.admin.featureSurvey}</legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURE_KEYS.map((key) => (
                <label
                  key={key}
                  className="grid gap-1 rounded-xl border border-rule bg-background p-3 text-sm font-semibold"
                >
                  {t.feature[key]}
                  <select
                    value={features[key]}
                    onChange={(e) =>
                      setFeatures((current) => ({
                        ...current,
                        [key]: e.target.value as FeatureStatus,
                      }))
                    }
                    className="h-10 rounded-lg border border-rule bg-background px-2 font-normal"
                  >
                    {(["yes", "partial", "no", "unknown"] as const).map((status) => (
                      <option key={status} value={status}>
                        {t.status[status]}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </fieldset>
          <Button type="submit" disabled={busyId === "place"}>
            {busyId === "place" ? t.admin.saving : t.admin.addPlace}
          </Button>
        </form>
      </section>
    </main>
  );
}
