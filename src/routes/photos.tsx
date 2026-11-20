import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrefs } from "@/lib/prefs";
import { useAuth } from "@/lib/auth";
import { useCityData } from "@/lib/data";
import { analyzePhoto } from "@/lib/photo.functions";
import { preparePhoto, uploadPhoto } from "@/lib/reports";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/photos")({
  validateSearch: (search: Record<string, unknown>) => ({
    place: typeof search["place"] === "string" ? search["place"] : undefined,
  }),
  component: PhotoGallery,
});

type PhotoRow = {
  id: string;
  path: string;
  user_id: string;
  barrier_id: string | null;
  place_id: string | null;
  url: string;
};

function PhotoGallery() {
  const { t } = usePrefs();
  const { user } = useAuth();
  const city = useCityData();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [rows, setRows] = useState<PhotoRow[]>([]);
  const [barrierId, setBarrierId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const query = supabase
      .from("report_media")
      .select("id,path,user_id,barrier_id,place_id,blurred")
      .eq("blurred", true)
      .order("created_at", { ascending: false })
      .limit(50);
    const { data } = search.place ? await query.eq("place_id", search.place) : await query;
    const items = await Promise.all(
      (data ?? []).map(async (row) => {
        const { data: signed } = await supabase.storage
          .from("report-photos")
          .createSignedUrl(row.path, 3600);
        return signed?.signedUrl
          ? {
              id: row.id,
              path: row.path,
              user_id: row.user_id,
              barrier_id: row.barrier_id,
              place_id: row.place_id,
              url: signed.signedUrl,
            }
          : null;
      }),
    );
    setRows(items.filter((item): item is PhotoRow => item !== null));
  }, [search.place]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function addPhoto() {
    if (!user) {
      await navigate({ to: "/sign-in" });
      return;
    }
    if (!file || !barrierId) {
      setError(t.gallery.failed);
      return;
    }
    setBusy(true);
    setError("");
    setMessage(t.gallery.adding);
    try {
      const checked = await preparePhoto(file, analyzePhoto);
      if (!checked.ready) {
        setError(t.gallery.noAi);
        setMessage("");
        return;
      }
      await uploadPhoto({
        blob: checked.blob,
        analysis: checked.analysis,
        userId: user.id,
        barrierId,
      });
      setMessage(t.gallery.added);
      setFile(null);
      await refresh();
    } catch {
      setError(t.gallery.failed);
      setMessage("");
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto(row: PhotoRow) {
    if (!user || row.user_id !== user.id) return;
    setBusy(true);
    setError("");
    try {
      const { error: rowError } = await supabase
        .from("report_media")
        .delete()
        .eq("id", row.id)
        .eq("user_id", user.id);
      if (rowError) throw rowError;
      await supabase.storage.from("report-photos").remove([row.path]);
      await refresh();
    } catch {
      setError(t.gallery.failed);
    } finally {
      setBusy(false);
    }
  }

  const placeName = search.place
    ? (city.places.find((p) => p.id === search.place)?.name ?? "")
    : "DIRA";
  return (
    <main className="mx-auto max-w-5xl px-4 pt-8 pb-nav lg:px-8 lg:pt-14">
      <header className="mb-8">
        <h1 className="text-5xl font-extrabold sm:text-7xl">{t.gallery.title}</h1>
        <p className="mt-3 max-w-2xl text-xl text-muted-foreground">{t.gallery.lede}</p>
      </header>
      {user ? (
        <section className="mb-8 grid gap-4 rounded-3xl bg-paper-deep p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="grid gap-2 font-bold">
            {t.gallery.add}
            <select
              value={barrierId}
              onChange={(e) => setBarrierId(e.target.value)}
              className="h-12 rounded-xl border-2 border-rule bg-background px-3"
            >
              <option value="">{t.report.where}</option>
              {city.barriers.map((b) => (
                <option key={b.id} value={b.id}>
                  {t.barrier[b.type]} · {b.area}
                </option>
              ))}
            </select>
          </label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            aria-label={t.report.photo}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="min-h-12 rounded-xl border border-rule bg-background p-2"
          />
          <Button onClick={addPhoto} disabled={busy || !file || !barrierId}>
            {busy ? t.gallery.adding : t.gallery.add}
          </Button>
        </section>
      ) : (
        <p className="mb-8 rounded-2xl bg-paper-deep p-4">
          {t.gallery.signIn}{" "}
          <Link to="/sign-in" className="underline">
            {t.nav.signIn}
          </Link>
        </p>
      )}
      <p className="mb-5 text-sm text-muted-foreground">{t.gallery.privacy}</p>
      {error && (
        <p role="alert" className="mb-4 text-coral-ink">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mb-4">
          {message}
        </p>
      )}
      {rows.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-rule p-10 text-center text-xl">
          {t.gallery.empty}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const barrier = city.barriers.find((b) => b.id === row.barrier_id);
            return (
              <li key={row.id} className="overflow-hidden rounded-2xl border-2 border-rule">
                <img
                  src={row.url}
                  alt={t.gallery.alt.replace("{place}", barrier?.area ?? placeName)}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="flex items-center justify-between gap-3 p-4">
                  <span className="font-semibold">
                    {barrier ? t.barrier[barrier.type] + " · " + barrier.area : placeName}
                  </span>
                  {row.user_id === user?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t.gallery.remove}
                      onClick={() => void removePhoto(row)}
                      disabled={busy}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
