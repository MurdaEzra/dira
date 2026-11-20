/** Barrier reports and photos: send now, or keep on the device and send later. Browser-only. */
import { get, set } from "idb-keyval";
import { supabase } from "@/integrations/supabase/client";
import type { BarrierType, Severity } from "./types";
import type { PhotoAnalysis } from "./photo-types";
import { blobToDataUrl, blurRegions, compressImage } from "./photo";
import type { AnalyzeResult } from "./photo.functions";

export type Analyze = (args: { data: { image: string } }) => Promise<AnalyzeResult>;

export interface ReportDraft {
  clientRef: string;
  type: BarrierType;
  severity: Severity;
  lat: number;
  lng: number;
  temporary: boolean;
  note: string;
  area: string;
  /** Already compressed. `ready` = analysed and privacy-blurred, safe to upload. */
  photo?: { blob: Blob; analysis: PhotoAnalysis | null; ready: boolean };
  createdAt: number;
}

export type SendOutcome =
  | { status: "sent"; id: string; merged: boolean; photo: "none" | "uploaded" | "skipped" }
  | { status: "queued" }
  | { status: "error"; code: "rate_limited" | "not_signed_in" | "failed" };

const KEY = "dira:report-queue:v1";

export async function readQueue(): Promise<ReportDraft[]> {
  return ((await get(KEY)) as ReportDraft[] | undefined) ?? [];
}
async function writeQueue(q: ReportDraft[]) {
  await set(KEY, q);
  window.dispatchEvent(new CustomEvent("dira:queue", { detail: q.length }));
}
export async function enqueue(d: ReportDraft) {
  const q = await readQueue();
  await writeQueue([...q.filter((x) => x.clientRef !== d.clientRef), d]);
}

/** Compress → AI check → blur faces/plates. Never returns an unblurred photo as ready. */
export async function preparePhoto(raw: Blob, analyze: Analyze) {
  const blob = await compressImage(raw);
  try {
    const res = await analyze({ data: { image: await blobToDataUrl(blob) } });
    if (!res.ok) return { blob, analysis: null, ready: false };
    const safe = await blurRegions(blob, res.analysis.privacy_regions);
    return { blob: safe, analysis: res.analysis, ready: true };
  } catch {
    return { blob, analysis: null, ready: false };
  }
}

export async function uploadPhoto(opts: {
  blob: Blob;
  analysis: PhotoAnalysis | null;
  userId: string;
  barrierId?: string;
  placeId?: string;
}) {
  const path = `${opts.userId}/${opts.barrierId ?? opts.placeId}/${crypto.randomUUID()}.jpg`;
  const up = await supabase.storage.from("report-photos").upload(path, opts.blob, { contentType: "image/jpeg", upsert: false });
  if (up.error) throw up.error;
  const ins = await supabase.from("report_media").insert({
    user_id: opts.userId,
    path,
    barrier_id: opts.barrierId ?? null,
    place_id: opts.placeId ?? null,
    ai_analysis: opts.analysis ? JSON.parse(JSON.stringify(opts.analysis)) : null,
    blurred: true,
  });
  if (ins.error) throw ins.error;
}

function errCode(e: { message?: string } | null | undefined): "rate_limited" | "not_signed_in" | "failed" {
  const m = e?.message ?? "";
  if (m.includes("rate_limited")) return "rate_limited";
  if (m.includes("not_signed_in") || m.includes("JWT")) return "not_signed_in";
  return "failed";
}

/** Try to send one report. Network trouble queues it; anything else is reported back. */
export async function sendReport(d: ReportDraft, analyze: Analyze): Promise<SendOutcome> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { status: "error", code: "not_signed_in" };
  if (!navigator.onLine) {
    await enqueue(d);
    return { status: "queued" };
  }
  const aiTriaged = !!d.photo?.analysis && d.photo.analysis.is_barrier && d.photo.analysis.barrier_type === d.type;
  const { data, error } = await supabase.rpc("report_barrier", {
    p_type: d.type,
    p_severity: d.severity,
    p_lat: d.lat,
    p_lng: d.lng,
    p_temporary: d.temporary,
    p_note: d.note,
    p_area: d.area,
    p_client_ref: d.clientRef,
    p_ai_triaged: aiTriaged,
  });
  if (error) {
    if (error.message.toLowerCase().includes("fetch")) {
      await enqueue(d);
      return { status: "queued" };
    }
    return { status: "error", code: errCode(error) };
  }
  const res = data as { id: string; merged: boolean };
  let photo: "none" | "uploaded" | "skipped" = "none";
  if (d.photo) {
    let p = d.photo;
    if (!p.ready) p = await preparePhoto(p.blob, analyze);
    if (p.ready) {
      try {
        await uploadPhoto({ blob: p.blob, analysis: p.analysis, userId: u.user.id, barrierId: res.id });
        photo = "uploaded";
      } catch {
        photo = "skipped";
      }
    } else photo = "skipped"; // privacy check unavailable: never upload an unblurred photo
  }
  return { status: "sent", id: res.id, merged: res.merged, photo };
}

let flushing = false;
/** Send everything waiting on this device. Returns how many were sent. */
export async function flushQueue(analyze: Analyze): Promise<number> {
  if (flushing || !navigator.onLine) return 0;
  flushing = true;
  let sent = 0;
  try {
    const q = await readQueue();
    const left: ReportDraft[] = [];
    for (const d of q) {
      const r = await sendReport({ ...d }, analyze).catch(() => ({ status: "queued" }) as SendOutcome);
      if (r.status === "sent") sent++;
      else if (r.status === "error" && r.code === "failed") continue; // drop reports the server rejects
      else left.push(d);
    }
    const now = await readQueue();
    const sentRefs = new Set(q.map((d) => d.clientRef).filter((r) => !left.some((l) => l.clientRef === r)));
    await writeQueue(now.filter((d) => !sentRefs.has(d.clientRef)));
  } finally {
    flushing = false;
  }
  return sent;
}
