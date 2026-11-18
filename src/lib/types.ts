export type Lang = "en" | "sw";

export const CATEGORIES = [
  "restaurant",
  "hospital",
  "university",
  "shopping",
  "public",
  "transport",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const FEATURE_KEYS = [
  "step_free_entrance",
  "ramp",
  "door_width",
  "automatic_door",
  "lift",
  "accessible_toilet",
  "accessible_parking",
  "wide_aisles",
  "seating",
  "staff_assistance",
  "tactile_signage",
  "hearing_loop",
  "quiet_hours",
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type FeatureStatus = "yes" | "partial" | "no" | "unknown";

/** Where a data point came from — drives its base weight in the confidence formula. */
export type Source = "official" | "audited" | "community3" | "community" | "osm" | "ai";

export interface Evidence {
  source: Source;
  /** Days since the last human or official confirmation. */
  daysAgo: number;
  confirmations: number;
  /** Number of conflicting reports. */
  conflicts: number;
  temporary?: boolean;
}

export interface PlaceFeature {
  key: FeatureKey;
  status: FeatureStatus;
  evidence: Evidence;
}

export interface Place {
  id: string;
  name: string;
  category: Category;
  area: string;
  lat: number;
  lng: number;
  features: PlaceFeature[];
}

export const BARRIER_TYPES = [
  "blocked_path",
  "broken_ramp",
  "no_dropped_kerb",
  "stairs_only",
  "narrow",
  "broken_lift",
  "steep",
  "poor_surface",
  "parked_vehicle",
  "construction",
  "flooding",
  "inaccessible_entrance",
  "other",
] as const;
export type BarrierType = (typeof BARRIER_TYPES)[number];
export type Severity = "low" | "medium" | "high" | "blocking";
export type BarrierStatus =
  | "reported"
  | "ai_triaged"
  | "community_confirmed"
  | "sent_to_authority"
  | "resolved"
  | "reopened";

export interface Barrier {
  id: string;
  type: BarrierType;
  severity: Severity;
  lat: number;
  lng: number;
  area: string;
  status: BarrierStatus;
  evidence: Evidence;
  note?: string | null;
  reporterId?: string | null;
}

export interface AccessPoint {
  id: string;
  kind: "ramp" | "entrance";
  lat: number;
  lng: number;
  area: string;
  evidence: Evidence;
}

export const MOBILITY_TYPES = [
  "manual_wheelchair",
  "powered_wheelchair",
  "walking_aid",
  "blind_low_vision",
  "deaf_hoh",
  "cognitive",
  "older_adult",
  "stroller",
  "temporary",
] as const;
export type MobilityType = (typeof MOBILITY_TYPES)[number];

export interface AccessProfile {
  mobility: MobilityType[];
  maxSlope: number; // percent
  minWidth: number; // cm
  maxKerb: number; // cm
  surface: "smooth" | "some_rough";
  stairs: "never" | "if_no_alt";
  needs: {
    lift: boolean;
    toilet: boolean;
    parking: boolean;
    voiceFirst: boolean;
    captions: boolean;
    highContrast: boolean;
  };
}

export const DEFAULT_PROFILE: AccessProfile = {
  mobility: [],
  maxSlope: 8,
  minWidth: 90,
  maxKerb: 3,
  surface: "some_rough",
  stairs: "if_no_alt",
  needs: {
    lift: false,
    toilet: false,
    parking: false,
    voiceFirst: false,
    captions: false,
    highContrast: false,
  },
};

export type Theme = "light" | "dark" | "hc";
export interface DisplayPrefs {
  theme: Theme;
  textScale: number; // 1..2
  readable: boolean;
  reduceMotion: boolean;
}
export const DEFAULT_DISPLAY: DisplayPrefs = {
  theme: "light",
  textScale: 1,
  readable: false,
  reduceMotion: false,
};
