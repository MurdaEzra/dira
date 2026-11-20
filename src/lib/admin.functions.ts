import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { CATEGORIES, FEATURE_KEYS, type FeatureStatus } from "./types";

const surveySchema = z.object({
  name: z.string().trim().min(2).max(100),
  category: z.enum(CATEGORIES),
  area: z.string().trim().min(2).max(100),
  lat: z.number().min(-5.5).max(5.5),
  lng: z.number().min(33.5).max(42.5),
  features: z
    .array(
      z.object({
        feature: z.enum(FEATURE_KEYS),
        status: z.enum(["yes", "partial", "no", "unknown"]),
      }),
    )
    .max(FEATURE_KEYS.length),
});

async function requireAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const loadAdminReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await requireAdmin(context);
    const { data, error } = await admin
      .from("barriers")
      .select(
        "id,type,severity,area,lat,lng,status,source,note,reporter_id,created_at,confirmations",
      )
      .eq("is_demo", false)
      .in("status", ["reported", "ai_triaged"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("admin_load_failed");
    const ids = (data ?? []).map((row) => row.id);
    const media = ids.length
      ? await admin
          .from("report_media")
          .select("id,barrier_id,path,blurred,created_at")
          .eq("blurred", true)
          .in("barrier_id", ids)
      : { data: [], error: null };
    if (media.error) throw new Error("admin_load_failed");
    const signedMedia = await Promise.all(
      (media.data ?? []).map(async (item) => {
        const { data: signed } = await admin.storage
          .from("report-photos")
          .createSignedUrl(item.path, 15 * 60);
        return { ...item, url: signed?.signedUrl ?? null };
      }),
    );
    return { reports: data ?? [], media: signedMedia };
  });

export const approveBarrierReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.string().min(1).max(80).parse(input))
  .handler(async ({ context, data: barrierId }) => {
    const admin = await requireAdmin(context);
    const { data: report, error: readError } = await admin
      .from("barriers")
      .select("id,confirmations")
      .eq("id", barrierId)
      .eq("is_demo", false)
      .in("status", ["reported", "ai_triaged"])
      .maybeSingle();
    if (readError || !report) throw new Error("report_not_pending");
    const { error } = await admin
      .from("barriers")
      .update({
        status: "community_confirmed",
        source: "audited",
        confirmations: Math.max(1, report.confirmations),
        last_confirmed_at: new Date().toISOString(),
      })
      .eq("id", barrierId)
      .eq("is_demo", false);
    if (error) throw new Error("approval_failed");
    return { ok: true as const };
  });

export const addSurveyedPlace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => surveySchema.parse(input))
  .handler(async ({ context, data }) => {
    const admin = await requireAdmin(context);
    const base = data.name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
    const id = `${base || "place"}-${crypto.randomUUID().slice(0, 8)}`;
    const { error: placeError } = await admin.from("places").insert({
      id,
      name: data.name,
      category: data.category,
      area: data.area,
      lat: data.lat,
      lng: data.lng,
      is_demo: false,
    });
    if (placeError) throw new Error("place_insert_failed");

    const features = data.features.map((entry) => ({
      place_id: id,
      feature: entry.feature,
      status: entry.status as FeatureStatus,
      source: "audited",
      confirmations: 1,
      conflicts: 0,
      last_confirmed_at: new Date().toISOString(),
    }));
    if (features.length) {
      const { error } = await admin.from("place_features").insert(features);
      if (error) {
        await admin.from("places").delete().eq("id", id);
        throw new Error("feature_insert_failed");
      }
    }
    return { ok: true as const, id };
  });
