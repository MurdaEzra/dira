import type {
  BarrierStatus,
  BarrierType,
  Category,
  FeatureKey,
  FeatureStatus,
  MobilityType,
  Severity,
  Source,
} from "./types";
import type { Tier } from "./confidence";
import { MORE_EN, MORE_SW, type More } from "./i18n-more";

type Dict = Base & More;

type Base = {
  app: { tagline: string; demo: string; demoLong: string; skip: string };
  nav: { map: string; discover: string; profile: string; primary: string; route: string; report: string; signIn: string; account: string };
  lang: { label: string; en: string; sw: string };
  cat: Record<Category, string>;
  catOne: Record<Category, string>;
  feature: Record<FeatureKey, string>;
  status: Record<FeatureStatus, string>;
  tier: Record<Tier, string>;
  tierHint: Record<Tier, string>;
  source: Record<Source, string>;
  barrier: Record<BarrierType, string>;
  severity: Record<Severity, string>;
  bstatus: Record<BarrierStatus, string>;
  mobility: Record<MobilityType, string>;
  time: {
    today: string;
    days: string;
    confirmations: string;
    confirmation: string;
    lastConfirmed: string;
    recheck: string;
    expired: string;
  };
  map: {
    search: string;
    searchLabel: string;
    noResults: string;
    locate: string;
    locating: string;
    located: string;
    locateFail: string;
    layers: string;
    layerPlaces: string;
    layerBarriers: string;
    layerRamps: string;
    layerHeat: string;
    nearby: string;
    showList: string;
    hideList: string;
    fit: string;
    open: string;
    rampKind: string;
    entranceKind: string;
    barrierHere: string;
    loading: string;
    legend: string;
    legendGood: string;
    legendPartial: string;
    legendPoor: string;
    legendBarrier: string;
    legendRamp: string;
    close: string;
    allCategories: string;
    selected: string;
    region: string;
    shown: string;
  };
  discover: {
    title: string;
    lede: string;
    category: string;
    features: string;
    minTier: string;
    any: string;
    sortNote: string;
    results: string;
    none: string;
    reset: string;
    away: string;
    onMap: string;
  };
  place: {
    back: string;
    fitFor: string;
    fitExplain: string;
    checklist: string;
    checklistLede: string;
    trust: string;
    trustLede: string;
    source: string;
    noProfile: string;
    setProfile: string;
    viewOnMap: string;
    notFound: string;
    matters: string;
  };
  onboard: {
    step: string;
    of: string;
    skip: string;
    next: string;
    back: string;
    finish: string;
    s1title: string;
    s1lede: string;
    s2title: string;
    s2lede: string;
    s3title: string;
    s3lede: string;
    done: string;
  };
  profile: {
    title: string;
    lede: string;
    access: string;
    display: string;
    maxSlope: string;
    minWidth: string;
    maxKerb: string;
    surface: string;
    surfaceSmooth: string;
    surfaceRough: string;
    stairs: string;
    stairsNever: string;
    stairsAlt: string;
    needs: string;
    lift: string;
    toilet: string;
    parking: string;
    voiceFirst: string;
    captions: string;
    highContrast: string;
    theme: string;
    themeLight: string;
    themeDark: string;
    themeHc: string;
    textSize: string;
    readable: string;
    readableHint: string;
    reduceMotion: string;
    saved: string;
    redo: string;
    privacy: string;
  };
};

const enBase: Base = {
  app: {
    tagline: "Know before you go.",
    demo: "Demo data",
    demoLong: "Demo data — fictional venues in Nairobi. Not a statement about any real place.",
    skip: "Skip to main content",
  },
  nav: { map: "Map", discover: "Discover", profile: "My access", primary: "Main", route: "Route", report: "Report", signIn: "Sign in", account: "Your account" },
  lang: { label: "Language", en: "English", sw: "Kiswahili" },
  cat: {
    restaurant: "Restaurants",
    hospital: "Hospitals",
    university: "Universities",
    shopping: "Shopping centres",
    public: "Public facilities",
    transport: "Transport",
  },
  catOne: {
    restaurant: "Restaurant",
    hospital: "Hospital",
    university: "University",
    shopping: "Shopping centre",
    public: "Public facility",
    transport: "Transport",
  },
  feature: {
    step_free_entrance: "Step-free entrance",
    ramp: "Ramp",
    door_width: "Wide door (90 cm+)",
    automatic_door: "Automatic door",
    lift: "Lift",
    accessible_toilet: "Accessible toilet",
    accessible_parking: "Accessible parking",
    wide_aisles: "Wide aisles",
    seating: "Seating to rest",
    staff_assistance: "Staff assistance",
    tactile_signage: "Tactile / Braille signage",
    hearing_loop: "Hearing loop",
    quiet_hours: "Quiet hours",
  },
  status: { yes: "Yes", partial: "Partly", no: "No", unknown: "Unknown" },
  tier: {
    verified: "Verified",
    community: "Community-confirmed",
    unconfirmed: "Unconfirmed",
    outdated: "Outdated",
  },
  tierHint: {
    verified: "Checked by the venue, an official body or a DIRA audit.",
    community: "Confirmed by 3 or more people independently.",
    unconfirmed: "One report, a map tag or an AI guess. Treat with care.",
    outdated: "Not re-checked for a long time. Things may have changed.",
  },
  source: {
    official: "Venue or official",
    audited: "DIRA audit",
    community3: "3+ community members",
    community: "One community report",
    osm: "OpenStreetMap tag",
    ai: "AI-detected only",
  },
  barrier: {
    blocked_path: "Blocked pathway",
    broken_ramp: "Broken or missing ramp",
    no_dropped_kerb: "No dropped kerb",
    stairs_only: "Stairs only",
    narrow: "Narrow passage",
    broken_lift: "Broken lift",
    steep: "Steep slope",
    poor_surface: "Poor surface",
    parked_vehicle: "Parked vehicle",
    construction: "Construction",
    flooding: "Flooding",
    inaccessible_entrance: "Inaccessible entrance",
    other: "Other barrier",
  },
  severity: { low: "Low", medium: "Medium", high: "High", blocking: "Blocking" },
  bstatus: {
    reported: "Reported",
    ai_triaged: "AI-triaged",
    community_confirmed: "Community-confirmed",
    sent_to_authority: "Sent to authority",
    resolved: "Resolved",
    reopened: "Reopened",
  },
  mobility: {
    manual_wheelchair: "Manual wheelchair",
    powered_wheelchair: "Powered wheelchair",
    walking_aid: "Crutches, cane or walker",
    blind_low_vision: "Blind or low vision",
    deaf_hoh: "Deaf or hard of hearing",
    cognitive: "Cognitive or learning disability",
    older_adult: "Older adult",
    stroller: "Pushing a stroller",
    temporary: "Temporary injury",
  },
  time: {
    today: "today",
    days: "{n} days ago",
    confirmations: "{n} confirmations",
    confirmation: "1 confirmation",
    lastConfirmed: "Last confirmed {when}",
    recheck: "Conflicting reports — needs re-check",
    expired: "Temporary — expired",
  },
  map: {
    search: "Search places or areas",
    searchLabel: "Search places",
    noResults: "No places match that search.",
    locate: "Show my location",
    locating: "Finding your location…",
    located: "Map moved to your location.",
    locateFail: "Couldn't get your location. The map stays on Nairobi.",
    layers: "Map layers",
    layerPlaces: "Accessible places",
    layerBarriers: "Barriers",
    layerRamps: "Verified ramps & entrances",
    layerHeat: "Barrier heatmap",
    nearby: "Places for you",
    showList: "Show list",
    hideList: "Show map",
    fit: "fit",
    open: "Open details",
    rampKind: "Ramp",
    entranceKind: "Accessible entrance",
    barrierHere: "Barrier",
    loading: "Loading map…",
    legend: "Key",
    legendGood: "Good fit (circle)",
    legendPartial: "Partial fit (diamond)",
    legendPoor: "Poor fit (triangle)",
    legendBarrier: "Barrier (octagon)",
    legendRamp: "Ramp / entrance (square)",
    close: "Close",
    allCategories: "All",
    selected: "Selected",
    region: "Accessibility map of Nairobi",
    shown: "{n} places shown",
  },
  discover: {
    title: "Discover",
    lede: "Places ranked by how well they fit you, then by distance.",
    category: "Category",
    features: "Must have",
    minTier: "Minimum trust",
    any: "Any",
    sortNote: "Sorted by fit for your profile, then distance from you.",
    results: "{n} places",
    none: "Nothing matches all those filters. Try removing one.",
    reset: "Clear filters",
    away: "{n} km",
    onMap: "Map",
  },
  place: {
    back: "Back",
    fitFor: "Fit for you",
    fitExplain: "Based on your access profile and how much we trust each detail.",
    checklist: "Access checklist",
    checklistLede: "Every line shows what we know, how sure we are, and when it was last checked.",
    trust: "How trust works",
    trustLede:
      "Each detail earns trust from its source, how recently it was confirmed and how many people agree. Disagreements lower it.",
    source: "Source",
    noProfile: "This score uses general needs.",
    setProfile: "Set your access profile",
    viewOnMap: "View on map",
    notFound: "We couldn't find that place.",
    matters: "Matters to you",
  },
  onboard: {
    step: "Step",
    of: "of",
    skip: "Skip for now",
    next: "Continue",
    back: "Back",
    finish: "Start exploring",
    s1title: "How do you get around?",
    s1lede:
      "Pick everything that applies. This stays on your device and you can change it any time.",
    s2title: "What are your limits?",
    s2lede: "DIRA will warn you, or route around, anything beyond these.",
    s3title: "What do you need at a place?",
    s3lede: "Places that have these rank higher for you.",
    done: "Profile saved. Places are now ranked for you.",
  },
  profile: {
    title: "My access",
    lede: "Your profile shapes every score, warning and ranking in DIRA.",
    access: "Access profile",
    display: "Display",
    maxSlope: "Steepest slope I can manage",
    minWidth: "Narrowest path I can use",
    maxKerb: "Highest kerb I can manage",
    surface: "Surfaces",
    surfaceSmooth: "Smooth only",
    surfaceRough: "Some rough is fine",
    stairs: "Stairs",
    stairsNever: "Never",
    stairsAlt: "Only if there's no other way",
    needs: "Needs",
    lift: "Lift required",
    toilet: "Accessible toilet",
    parking: "Accessible parking",
    voiceFirst: "Voice-first mode",
    captions: "Captions",
    highContrast: "High contrast",
    theme: "Colours",
    themeLight: "Light",
    themeDark: "Dark",
    themeHc: "High contrast",
    textSize: "Text size",
    readable: "Extra-readable font",
    readableHint: "Atkinson Hyperlegible, designed for low vision and dyslexia.",
    reduceMotion: "Reduce motion",
    saved: "Saved",
    redo: "Walk through setup again",
    privacy: "Your profile is stored only on this device.",
  },
};

const swBase: Base = {
  app: {
    tagline: "Jua kabla hujaenda.",
    demo: "Data ya majaribio",
    demoLong: "Data ya majaribio — maeneo ya kubuni jijini Nairobi. Si kauli kuhusu mahali halisi.",
    skip: "Ruka hadi maudhui makuu",
  },
  nav: { map: "Ramani", discover: "Gundua", profile: "Ufikiaji wangu", primary: "Kuu", route: "Njia", report: "Ripoti", signIn: "Ingia", account: "Akaunti yako" },
  lang: { label: "Lugha", en: "English", sw: "Kiswahili" },
  cat: {
    restaurant: "Mikahawa",
    hospital: "Hospitali",
    university: "Vyuo vikuu",
    shopping: "Maduka makubwa",
    public: "Huduma za umma",
    transport: "Usafiri",
  },
  catOne: {
    restaurant: "Mkahawa",
    hospital: "Hospitali",
    university: "Chuo kikuu",
    shopping: "Duka kubwa",
    public: "Huduma ya umma",
    transport: "Usafiri",
  },
  feature: {
    step_free_entrance: "Mlango usio na ngazi",
    ramp: "Njia panda",
    door_width: "Mlango mpana (sm 90+)",
    automatic_door: "Mlango wa kujifungua",
    lift: "Lifti",
    accessible_toilet: "Choo kinachofikika",
    accessible_parking: "Maegesho yanayofikika",
    wide_aisles: "Njia pana ndani",
    seating: "Viti vya kupumzika",
    staff_assistance: "Msaada wa wafanyakazi",
    tactile_signage: "Alama za kugusa / Breli",
    hearing_loop: "Kitanzi cha kusikia",
    quiet_hours: "Saa za utulivu",
  },
  status: { yes: "Ndiyo", partial: "Kiasi", no: "Hapana", unknown: "Haijulikani" },
  tier: {
    verified: "Imethibitishwa",
    community: "Imethibitishwa na jamii",
    unconfirmed: "Haijathibitishwa",
    outdated: "Imepitwa na wakati",
  },
  tierHint: {
    verified: "Imekaguliwa na mhusika, mamlaka rasmi au ukaguzi wa DIRA.",
    community: "Imethibitishwa na watu 3 au zaidi kwa kujitegemea.",
    unconfirmed: "Ripoti moja, alama ya ramani au makisio ya AI. Kuwa mwangalifu.",
    outdated: "Haijakaguliwa kwa muda mrefu. Huenda mambo yamebadilika.",
  },
  source: {
    official: "Mhusika au rasmi",
    audited: "Ukaguzi wa DIRA",
    community3: "Wanajamii 3+",
    community: "Ripoti moja ya jamii",
    osm: "Alama ya OpenStreetMap",
    ai: "Imegunduliwa na AI pekee",
  },
  barrier: {
    blocked_path: "Njia imezibwa",
    broken_ramp: "Njia panda imeharibika au haipo",
    no_dropped_kerb: "Hakuna ukingo ulioshushwa",
    stairs_only: "Ngazi pekee",
    narrow: "Njia nyembamba",
    broken_lift: "Lifti imeharibika",
    steep: "Mteremko mkali",
    poor_surface: "Uso mbaya wa njia",
    parked_vehicle: "Gari limeegeshwa njiani",
    construction: "Ujenzi",
    flooding: "Mafuriko",
    inaccessible_entrance: "Mlango usiofikika",
    other: "Kizuizi kingine",
  },
  severity: { low: "Chini", medium: "Wastani", high: "Juu", blocking: "Kinazuia kabisa" },
  bstatus: {
    reported: "Imeripotiwa",
    ai_triaged: "Imechambuliwa na AI",
    community_confirmed: "Imethibitishwa na jamii",
    sent_to_authority: "Imetumwa kwa mamlaka",
    resolved: "Imetatuliwa",
    reopened: "Imefunguliwa tena",
  },
  mobility: {
    manual_wheelchair: "Kiti cha magurudumu cha mkono",
    powered_wheelchair: "Kiti cha magurudumu cha umeme",
    walking_aid: "Magongo, fimbo au kitembezi",
    blind_low_vision: "Kipofu au uoni hafifu",
    deaf_hoh: "Kiziwi au usikivu hafifu",
    cognitive: "Ulemavu wa kiakili au wa kujifunza",
    older_adult: "Mzee",
    stroller: "Ninasukuma kigari cha mtoto",
    temporary: "Jeraha la muda",
  },
  time: {
    today: "leo",
    days: "siku {n} zilizopita",
    confirmations: "uthibitisho {n}",
    confirmation: "uthibitisho 1",
    lastConfirmed: "Ilithibitishwa mwisho {when}",
    recheck: "Ripoti zinapingana — inahitaji kukaguliwa upya",
    expired: "Ya muda — imeisha",
  },
  map: {
    search: "Tafuta maeneo au mitaa",
    searchLabel: "Tafuta maeneo",
    noResults: "Hakuna eneo linalolingana na utafutaji huo.",
    locate: "Onyesha mahali nilipo",
    locating: "Tunatafuta mahali ulipo…",
    located: "Ramani imehamia mahali ulipo.",
    locateFail: "Hatukuweza kupata mahali ulipo. Ramani inabaki Nairobi.",
    layers: "Tabaka za ramani",
    layerPlaces: "Maeneo yanayofikika",
    layerBarriers: "Vizuizi",
    layerRamps: "Njia panda na milango iliyothibitishwa",
    layerHeat: "Ramani joto ya vizuizi",
    nearby: "Maeneo kwa ajili yako",
    showList: "Onyesha orodha",
    hideList: "Onyesha ramani",
    fit: "ufaafu",
    open: "Fungua maelezo",
    rampKind: "Njia panda",
    entranceKind: "Mlango unaofikika",
    barrierHere: "Kizuizi",
    loading: "Inapakia ramani…",
    legend: "Ufunguo",
    legendGood: "Inakufaa (duara)",
    legendPartial: "Inakufaa kiasi (almasi)",
    legendPoor: "Haikufai (pembetatu)",
    legendBarrier: "Kizuizi (pembenane)",
    legendRamp: "Njia panda / mlango (mraba)",
    close: "Funga",
    allCategories: "Zote",
    selected: "Imechaguliwa",
    region: "Ramani ya ufikiaji ya Nairobi",
    shown: "Maeneo {n} yanaonyeshwa",
  },
  discover: {
    title: "Gundua",
    lede: "Maeneo yamepangwa kwa jinsi yanavyokufaa, kisha kwa umbali.",
    category: "Aina",
    features: "Lazima kuwe na",
    minTier: "Uaminifu wa chini",
    any: "Yoyote",
    sortNote: "Imepangwa kwa ufaafu wa wasifu wako, kisha umbali kutoka kwako.",
    results: "Maeneo {n}",
    none: "Hakuna kinacholingana na vichujio vyote. Jaribu kuondoa kimoja.",
    reset: "Futa vichujio",
    away: "km {n}",
    onMap: "Ramani",
  },
  place: {
    back: "Rudi",
    fitFor: "Ufaafu kwako",
    fitExplain: "Kulingana na wasifu wako wa ufikiaji na jinsi tunavyoamini kila taarifa.",
    checklist: "Orodha ya ufikiaji",
    checklistLede:
      "Kila mstari unaonyesha tunachojua, tuna uhakika kiasi gani, na lini kilikaguliwa mwisho.",
    trust: "Jinsi uaminifu unavyofanya kazi",
    trustLede:
      "Kila taarifa hupata uaminifu kutoka chanzo chake, ilithibitishwa lini, na watu wangapi wanakubali. Kutokubaliana hupunguza uaminifu.",
    source: "Chanzo",
    noProfile: "Alama hii inatumia mahitaji ya jumla.",
    setProfile: "Weka wasifu wako wa ufikiaji",
    viewOnMap: "Tazama kwenye ramani",
    notFound: "Hatukupata eneo hilo.",
    matters: "Ni muhimu kwako",
  },
  onboard: {
    step: "Hatua",
    of: "kati ya",
    skip: "Ruka kwa sasa",
    next: "Endelea",
    back: "Rudi",
    finish: "Anza kugundua",
    s1title: "Unasafiri vipi?",
    s1lede:
      "Chagua yote yanayokuhusu. Hii inabaki kwenye kifaa chako na unaweza kubadilisha wakati wowote.",
    s2title: "Mipaka yako ni ipi?",
    s2lede: "DIRA itakuonya, au kukuelekeza mbali na, chochote kinachozidi haya.",
    s3title: "Unahitaji nini mahali unapoenda?",
    s3lede: "Maeneo yenye haya yatapewa nafasi ya juu kwako.",
    done: "Wasifu umehifadhiwa. Maeneo sasa yamepangwa kwa ajili yako.",
  },
  profile: {
    title: "Ufikiaji wangu",
    lede: "Wasifu wako huunda kila alama, onyo na mpangilio ndani ya DIRA.",
    access: "Wasifu wa ufikiaji",
    display: "Muonekano",
    maxSlope: "Mteremko mkali zaidi ninaoweza",
    minWidth: "Njia nyembamba zaidi ninayoweza kutumia",
    maxKerb: "Ukingo mrefu zaidi ninaoweza",
    surface: "Uso wa njia",
    surfaceSmooth: "Laini pekee",
    surfaceRough: "Kiasi cha ukwaru ni sawa",
    stairs: "Ngazi",
    stairsNever: "Kamwe",
    stairsAlt: "Tu kama hakuna njia nyingine",
    needs: "Mahitaji",
    lift: "Lifti inahitajika",
    toilet: "Choo kinachofikika",
    parking: "Maegesho yanayofikika",
    voiceFirst: "Hali ya sauti kwanza",
    captions: "Manukuu",
    highContrast: "Utofautishaji wa juu",
    theme: "Rangi",
    themeLight: "Mwanga",
    themeDark: "Giza",
    themeHc: "Utofautishaji wa juu",
    textSize: "Ukubwa wa maandishi",
    readable: "Fonti rahisi kusoma",
    readableHint: "Atkinson Hyperlegible, imeundwa kwa uoni hafifu na disleksia.",
    reduceMotion: "Punguza mwendo",
    saved: "Imehifadhiwa",
    redo: "Pitia mipangilio upya",
    privacy: "Wasifu wako umehifadhiwa kwenye kifaa hiki pekee.",
  },
};

const en: Dict = { ...enBase, ...MORE_EN };
const sw: Dict = { ...swBase, ...MORE_SW };

export const DICTS: Record<"en" | "sw", Dict> = { en, sw };
export type { Dict };

export function fmt(s: string, vars: Record<string, string | number>) {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}
