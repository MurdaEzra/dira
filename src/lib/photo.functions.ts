import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AI_BARRIER_TYPES, type PhotoAnalysis } from "./photo-types";

const input = z.object({
  image: z
    .string()
    .startsWith("data:image/jpeg;base64,")
    .max(3_000_000),
});

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["is_barrier", "barrier_type", "severity", "confidence", "summary_en", "summary_sw", "tags", "privacy_regions"],
  properties: {
    is_barrier: { type: "boolean" },
    barrier_type: { type: "string", enum: [...AI_BARRIER_TYPES] },
    severity: { type: "string", enum: ["low", "medium", "high", "blocking"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    summary_en: { type: "string", maxLength: 200 },
    summary_sw: { type: "string", maxLength: 200 },
    tags: {
      type: "array",
      maxItems: 8,
      items: {
        type: "string",
        enum: ["ramp", "stairs", "step", "kerb", "dropped_kerb", "lift", "door", "narrow", "slope", "rough_surface", "water", "vehicle", "construction", "handrail", "tactile_paving", "seating", "toilet_sign"],
      },
    },
    privacy_regions: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "x", "y", "w", "h"],
        properties: {
          kind: { type: "string", enum: ["face", "plate"] },
          x: { type: "number", minimum: 0, maximum: 1 },
          y: { type: "number", minimum: 0, maximum: 1 },
          w: { type: "number", minimum: 0, maximum: 1 },
          h: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
  },
} as const;

const PROMPT = `You assist DIRA, an accessibility map for wheelchair users and people with limited mobility in Nairobi.
Look at the photo and judge whether it shows a physical accessibility barrier on a pavement, road crossing, entrance or building.
- barrier_type: the closest category, or "none" if the photo shows no barrier.
- severity: low (slows people down), medium (hard but passable), high (needs help), blocking (impossible for a wheelchair).
- confidence: 0..1, how sure you are. Be conservative.
- summary_en / summary_sw: one short factual sentence in English and in Kiswahili describing only what is visible.
- tags: visible access features.
- privacy_regions: a generous bounding box (normalised 0..1, x/y = top-left) around EVERY human face and EVERY vehicle number plate, even small or partial ones. Return [] if none.
Never guess identities. Return JSON only.`;

export type AnalyzeResult = { ok: true; analysis: PhotoAnalysis } | { ok: false; error: "unavailable" | "refused" };

export const analyzePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data }): Promise<AnalyzeResult> => {
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: PROMPT },
              { type: "input_image", image_url: data.image, detail: "high" },
            ],
          },
        ],
        text: { format: { type: "json_schema", name: "barrier_photo", strict: true, schema: SCHEMA } },
        max_output_tokens: 1200,
      });
      let text = "";
      for (const item of res.output ?? []) {
        if (item.type !== "message") continue;
        for (const c of item.content) {
          if (c.type === "output_text") text += c.text;
          if (c.type === "refusal") return { ok: false, error: "refused" };
        }
      }
      const parsed = JSON.parse(text) as PhotoAnalysis;
      const clamp = (n: number) => Math.max(0, Math.min(1, n));
      parsed.confidence = clamp(parsed.confidence);
      parsed.privacy_regions = parsed.privacy_regions.map((r) => ({
        kind: r.kind,
        x: clamp(r.x),
        y: clamp(r.y),
        w: clamp(r.w),
        h: clamp(r.h),
      }));
      return { ok: true, analysis: parsed };
    } catch (e) {
      if (e instanceof GatewayError) console.error("photo analysis failed", e.code, e.ids);
      else console.error("photo analysis failed", e);
      return { ok: false, error: "unavailable" };
    }
  });
