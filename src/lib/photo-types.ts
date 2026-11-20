import { BARRIER_TYPES } from "./types";

export const AI_BARRIER_TYPES = [...BARRIER_TYPES, "none"] as const;

/** What the AI says about a photo. Always shown as an unverified suggestion, never as fact. */
export interface PhotoAnalysis {
  is_barrier: boolean;
  barrier_type: (typeof AI_BARRIER_TYPES)[number];
  severity: "low" | "medium" | "high" | "blocking";
  confidence: number;
  summary_en: string;
  summary_sw: string;
  tags: string[];
  privacy_regions: { kind: "face" | "plate"; x: number; y: number; w: number; h: number }[];
}
