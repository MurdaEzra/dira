/** Strings for routing, reporting, accounts and verification. Same shape in both languages (typed). */
import type { RouteKind } from "./route-types";
import type { Severity } from "./types";

export type More = {
  auth: {
    title: string; lede: string; signIn: string; signUp: string; forgot: string;
    email: string; password: string; name: string; google: string; or: string;
    submitIn: string; submitUp: string; submitForgot: string;
    checkEmail: string; resetSent: string; newPassword: string; setPassword: string; passwordSet: string;
    error: string; badLogin: string; minPw: string; invalidLink: string; working: string; back: string;
  };
  account: {
    title: string; signedOut: string; signInCta: string; name: string; save: string; saved: string;
    email: string; synced: string; signOut: string; deleteTitle: string; deleteBody: string;
    deleteConfirm: string; cancel: string; deleted: string; deleteFailed: string; local: string;
  };
  route: {
    title: string; lede: string; from: string; to: string; myLocation: string; choosePlace: string;
    swap: string; plan: string; planning: string; options: string;
    kind: Record<RouteKind, string>; kindHint: Record<RouteKind, string>;
    score: string; minutes: string; km: string; m: string; effort: string;
    effortLevel: { low: string; moderate: string; high: string };
    flagged: string; flaggedOne: string; noBarriers: string; steep: string;
    approx: string; approxLong: string; steps: string; onTheWay: string;
    start: string; stop: string; active: string; newBarrier: string; rerouting: string; rerouted: string;
    reportHere: string; stuck: string; stuckTitle: string; stuckLede: string; nearestHelp: string;
    replanHere: string; copyLocation: string; copied: string; demos: string; noOptions: string;
    pickBoth: string; choose: string; legendOk: string; legendCaution: string; legendBarrier: string;
    away: string; mapLabel: string; failed: string;
  };
  turn: string[];
  onto: string;
  report: {
    title: string; lede: string; step: string; step1: string; step2: string; step3: string;
    sevHint: Record<Severity, string>;
    where: string; whereHint: string; useGps: string; gpsFail: string; gpsOk: string;
    temporary: string; temporaryHint: string; note: string; notePlaceholder: string;
    photo: string; photoAdd: string; photoHint: string; photoChecking: string; photoReady: string;
    photoNoAi: string; photoRemove: string; facesBlurred: string;
    aiSuggests: string; aiUse: string; aiUnverified: string; aiNoBarrier: string;
    send: string; sending: string; saveLater: string; signInToSend: string;
    sent: string; merged: string; queued: string; photoSkipped: string; rateLimited: string; failed: string;
    another: string; viewMap: string; back: string; next: string; change: string;
    queueCount: string; queueSent: string; pinLabel: string; offline: string;
  };
  verify: {
    barrierPrompt: string; placePrompt: string; stillThere: string; gone: string; accurate: string;
    changed: string; signIn: string; thanks: string; already: string; own: string; rate: string;
    failed: string; whichFeature: string; newStatus: string; submit: string; cancel: string;
  };
  gallery: {
    title: string; lede: string; empty: string; add: string; adding: string; added: string;
    failed: string; noAi: string; privacy: string; aiTag: string; signIn: string; alt: string;
  };
  tags: Record<string, string>;
};

export const MORE_EN: More = {
  auth: {
    title: "Your DIRA account",
    lede: "Sign in to report barriers, confirm what others found, and keep your access needs on every device.",
    signIn: "Sign in", signUp: "Create account", forgot: "Forgot password?",
    email: "Email", password: "Password", name: "Your name (shown on reports)",
    google: "Continue with Google", or: "or",
    submitIn: "Sign in", submitUp: "Create account", submitForgot: "Send reset link",
    checkEmail: "Check your email and tap the link to confirm your account.",
    resetSent: "If that email has an account, a reset link is on its way.",
    newPassword: "New password", setPassword: "Set new password", passwordSet: "Password updated. You're signed in.",
    error: "Something went wrong. Please try again.", badLogin: "That email and password don't match.",
    minPw: "At least 8 characters.", invalidLink: "This reset link has expired. Ask for a new one.",
    working: "One moment…", back: "Back to sign in",
  },
  account: {
    title: "Account", signedOut: "You're using DIRA without an account. Your profile stays on this device.",
    signInCta: "Sign in or create account", name: "Name shown on your reports", save: "Save name", saved: "Name saved",
    email: "Signed in as", synced: "Your access needs sync to your account.", signOut: "Sign out",
    deleteTitle: "Delete account", deleteBody: "This removes your account and profile for good. Barriers you reported stay on the map without your name.",
    deleteConfirm: "Delete my account", cancel: "Keep my account", deleted: "Your account was deleted.",
    deleteFailed: "We couldn't delete the account. Please try again.", local: "Stored on this device",
  },
  route: {
    title: "Plan a route", lede: "Three ways there, each scored for your access profile and checked against reported barriers.",
    from: "From", to: "To", myLocation: "My location", choosePlace: "Choose a place", swap: "Swap start and destination",
    plan: "Find routes", planning: "Finding routes…", options: "Route options",
    kind: { accessible: "Most accessible", balanced: "Balanced", fastest: "Fastest" },
    kindHint: {
      accessible: "Avoids every reported barrier and stays within your limits.",
      balanced: "Avoids trusted serious barriers; a little shorter.",
      fastest: "The shortest walk. Barriers on the way are flagged.",
    },
    score: "access score", minutes: "{n} min", km: "{n} km", m: "{n} m", effort: "Effort",
    effortLevel: { low: "Low effort", moderate: "Moderate effort", high: "High effort" },
    flagged: "{n} barriers on the way", flaggedOne: "1 barrier on the way", noBarriers: "No reported barriers on the way",
    steep: "{n} m steeper than your limit",
    approx: "Approximate line", approxLong: "The routing service didn't answer, so this is an approximate demo line. Check the way before you go.",
    steps: "Turn by turn", onTheWay: "On the way",
    start: "Start this route", stop: "End route", active: "Route in progress",
    newBarrier: "A new barrier was reported on your route.", rerouting: "Finding a new way around it…", rerouted: "Route updated around the new barrier.",
    reportHere: "Report a barrier here", stuck: "I'm stuck", stuckTitle: "Stuck? Here's help nearby",
    stuckLede: "Verified ramps and accessible entrances closest to you.", nearestHelp: "Nearest help",
    replanHere: "Find a new route from here", copyLocation: "Copy my location to share", copied: "Location copied",
    demos: "Try a demo journey", noOptions: "No route could be found between these points.",
    pickBoth: "Choose where you're starting and where you're going.", choose: "Show this route",
    legendOk: "Clear (solid)", legendCaution: "Steep or rough (dashes)", legendBarrier: "Barrier (dots)",
    away: "{n} m away", mapLabel: "Route map", failed: "Couldn't plan the route. Please try again.",
  },
  turn: [
    "Turn left", "Turn right", "Turn sharp left", "Turn sharp right", "Bear left", "Bear right",
    "Continue straight", "Enter the roundabout", "Leave the roundabout", "Turn around",
    "Arrive at your destination", "Head off", "Keep left", "Keep right",
  ],
  onto: " onto {name}",
  report: {
    title: "Report a barrier", lede: "Three taps. Your report helps everyone who comes after you.",
    step: "Step {n} of 3", step1: "What's in the way?", step2: "How bad is it?", step3: "Check and send",
    sevHint: { low: "Slows me down", medium: "Hard, but I can get past", high: "I'd need help to get past", blocking: "Impossible to get past" },
    where: "Where is it?", whereHint: "Drag the pin, tap the map, or use the arrow keys on the pin to move it.",
    useGps: "Use my location", gpsFail: "Couldn't get your location — place the pin by hand.", gpsOk: "Pin moved to your location.",
    temporary: "It's temporary", temporaryHint: "Temporary reports fade after 7 days unless someone confirms them.",
    note: "Note (optional)", notePlaceholder: "e.g. lorry parked across the dropped kerb",
    photo: "Photo (optional)", photoAdd: "Add a photo", photoHint: "Faces and number plates are blurred before anything is shared. Location data is removed.",
    photoChecking: "Checking the photo and blurring faces…", photoReady: "Photo ready", photoNoAi: "We'll check and blur this photo when you're online and signed in.",
    photoRemove: "Remove photo", facesBlurred: "{n} faces or plates blurred",
    aiSuggests: "AI suggestion: {type}, {sev}", aiUse: "Use suggestion", aiUnverified: "Unverified — a person must confirm it",
    aiNoBarrier: "AI didn't spot a barrier in this photo. You know best — send it anyway if it's there.",
    send: "Send report", sending: "Sending…", saveLater: "Save on this device", signInToSend: "Sign in to send your report",
    sent: "Thank you. Your report is on the map.", merged: "Someone already reported this — your report confirmed it.",
    queued: "You're offline. Saved on this device; it will send automatically.",
    photoSkipped: "The photo couldn't be checked for privacy, so it wasn't shared.",
    rateLimited: "That's a lot of reports in an hour. Please wait a little before sending more.",
    failed: "Couldn't send the report. It's saved on this device.",
    another: "Report another", viewMap: "See it on the map", back: "Back", next: "Next", change: "Change",
    queueCount: "{n} reports waiting to send", queueSent: "{n} saved reports were sent", pinLabel: "Barrier location pin",
    offline: "Offline",
  },
  verify: {
    barrierPrompt: "Is it still there?", placePrompt: "Is this still right?",
    stillThere: "Still there", gone: "It's gone", accurate: "Still accurate", changed: "Something changed",
    signIn: "Sign in to confirm", thanks: "Thanks — trust updated.", already: "You already checked this in the last week.",
    own: "You reported this, so someone else needs to confirm it.", rate: "Too many checks in an hour. Try again later.",
    failed: "Couldn't save that. Please try again.", whichFeature: "What changed?", newStatus: "It's now",
    submit: "Send change", cancel: "Cancel",
  },
  gallery: {
    title: "Photos", lede: "From the community. AI labels are suggestions until people confirm them.",
    empty: "No photos yet.", add: "Add a photo", adding: "Checking and blurring…", added: "Photo added. Thank you.",
    failed: "Couldn't add the photo.", noAi: "The privacy check isn't available right now, so the photo wasn't shared.",
    privacy: "Faces and number plates are blurred automatically.", aiTag: "AI", signIn: "Sign in to add photos",
    alt: "Community photo of {place}",
  },
  tags: {
    ramp: "ramp", stairs: "stairs", step: "step", kerb: "kerb", dropped_kerb: "dropped kerb", lift: "lift", door: "door",
    narrow: "narrow", slope: "slope", rough_surface: "rough surface", water: "water", vehicle: "vehicle",
    construction: "construction", handrail: "handrail", tactile_paving: "tactile paving", seating: "seating", toilet_sign: "toilet sign",
  },
};

export const MORE_SW: More = {
  auth: {
    title: "Akaunti yako ya DIRA",
    lede: "Ingia ili kuripoti vizuizi, kuthibitisha walichopata wengine, na kuweka mahitaji yako kwenye kila kifaa.",
    signIn: "Ingia", signUp: "Fungua akaunti", forgot: "Umesahau nenosiri?",
    email: "Barua pepe", password: "Nenosiri", name: "Jina lako (litaonekana kwenye ripoti)",
    google: "Endelea na Google", or: "au",
    submitIn: "Ingia", submitUp: "Fungua akaunti", submitForgot: "Tuma kiungo cha kubadilisha",
    checkEmail: "Angalia barua pepe yako na ubofye kiungo ili kuthibitisha akaunti.",
    resetSent: "Kama barua pepe hiyo ina akaunti, kiungo cha kubadilisha kimetumwa.",
    newPassword: "Nenosiri jipya", setPassword: "Weka nenosiri jipya", passwordSet: "Nenosiri limebadilishwa. Umeingia.",
    error: "Hitilafu imetokea. Tafadhali jaribu tena.", badLogin: "Barua pepe na nenosiri hazilingani.",
    minPw: "Herufi 8 au zaidi.", invalidLink: "Kiungo hiki kimeisha muda. Omba kipya.",
    working: "Subiri kidogo…", back: "Rudi kuingia",
  },
  account: {
    title: "Akaunti", signedOut: "Unatumia DIRA bila akaunti. Wasifu wako unabaki kwenye kifaa hiki.",
    signInCta: "Ingia au fungua akaunti", name: "Jina linaloonekana kwenye ripoti zako", save: "Hifadhi jina", saved: "Jina limehifadhiwa",
    email: "Umeingia kama", synced: "Mahitaji yako ya ufikiaji yanasawazishwa na akaunti yako.", signOut: "Toka",
    deleteTitle: "Futa akaunti", deleteBody: "Hii inaondoa akaunti na wasifu wako kabisa. Vizuizi ulivyoripoti vinabaki kwenye ramani bila jina lako.",
    deleteConfirm: "Futa akaunti yangu", cancel: "Usifute", deleted: "Akaunti yako imefutwa.",
    deleteFailed: "Hatukuweza kufuta akaunti. Tafadhali jaribu tena.", local: "Imehifadhiwa kwenye kifaa hiki",
  },
  route: {
    title: "Panga njia", lede: "Njia tatu za kufika, kila moja imepimwa kwa wasifu wako na kukaguliwa dhidi ya vizuizi vilivyoripotiwa.",
    from: "Kutoka", to: "Kwenda", myLocation: "Mahali nilipo", choosePlace: "Chagua eneo", swap: "Badilisha mwanzo na mwisho",
    plan: "Tafuta njia", planning: "Tunatafuta njia…", options: "Chaguo za njia",
    kind: { accessible: "Inayofikika zaidi", balanced: "Ya wastani", fastest: "Ya haraka zaidi" },
    kindHint: {
      accessible: "Inaepuka kila kizuizi kilichoripotiwa na inabaki ndani ya mipaka yako.",
      balanced: "Inaepuka vizuizi vikubwa vinavyoaminika; fupi kidogo.",
      fastest: "Njia fupi zaidi. Vizuizi njiani vimewekwa alama.",
    },
    score: "alama ya ufikiaji", minutes: "dak {n}", km: "km {n}", m: "m {n}", effort: "Juhudi",
    effortLevel: { low: "Juhudi ndogo", moderate: "Juhudi ya wastani", high: "Juhudi kubwa" },
    flagged: "Vizuizi {n} njiani", flaggedOne: "Kizuizi 1 njiani", noBarriers: "Hakuna vizuizi vilivyoripotiwa njiani",
    steep: "m {n} zenye mteremko kuliko mipaka yako",
    approx: "Mstari wa makadirio", approxLong: "Huduma ya njia haikujibu, kwa hivyo huu ni mstari wa makadirio. Kagua njia kabla ya kwenda.",
    steps: "Hatua kwa hatua", onTheWay: "Njiani",
    start: "Anza njia hii", stop: "Maliza njia", active: "Safari inaendelea",
    newBarrier: "Kizuizi kipya kimeripotiwa kwenye njia yako.", rerouting: "Tunatafuta njia nyingine…", rerouted: "Njia imesasishwa kuepuka kizuizi kipya.",
    reportHere: "Ripoti kizuizi hapa", stuck: "Nimekwama", stuckTitle: "Umekwama? Msaada ulio karibu",
    stuckLede: "Njia panda na milango inayofikika iliyothibitishwa iliyo karibu nawe.", nearestHelp: "Msaada wa karibu",
    replanHere: "Tafuta njia mpya kutoka hapa", copyLocation: "Nakili mahali nilipo ili kushiriki", copied: "Mahali pamenakiliwa",
    demos: "Jaribu safari ya majaribio", noOptions: "Hakuna njia iliyopatikana kati ya maeneo haya.",
    pickBoth: "Chagua unapoanzia na unakokwenda.", choose: "Onyesha njia hii",
    legendOk: "Wazi (mstari kamili)", legendCaution: "Mteremko au uso mbaya (vistari)", legendBarrier: "Kizuizi (nukta)",
    away: "m {n} kutoka hapa", mapLabel: "Ramani ya njia", failed: "Hatukuweza kupanga njia. Tafadhali jaribu tena.",
  },
  turn: [
    "Pinda kushoto", "Pinda kulia", "Pinda kushoto kabisa", "Pinda kulia kabisa", "Elekea kushoto", "Elekea kulia",
    "Endelea moja kwa moja", "Ingia kwenye mzunguko", "Toka kwenye mzunguko", "Geuka urudi",
    "Umefika unakokwenda", "Anza safari", "Kaa kushoto", "Kaa kulia",
  ],
  onto: " kuingia {name}",
  report: {
    title: "Ripoti kizuizi", lede: "Bofya mara tatu. Ripoti yako inamsaidia kila anayekuja baada yako.",
    step: "Hatua {n} kati ya 3", step1: "Nini kinazuia?", step2: "Ni kibaya kiasi gani?", step3: "Kagua na utume",
    sevHint: { low: "Kinanichelewesha", medium: "Ngumu, lakini napita", high: "Ningehitaji msaada kupita", blocking: "Haiwezekani kupita" },
    where: "Kiko wapi?", whereHint: "Buruta pini, gusa ramani, au tumia vitufe vya mishale kwenye pini kuisogeza.",
    useGps: "Tumia mahali nilipo", gpsFail: "Hatukupata mahali ulipo — weka pini kwa mkono.", gpsOk: "Pini imesogezwa mahali ulipo.",
    temporary: "Ni cha muda", temporaryHint: "Ripoti za muda hufifia baada ya siku 7 isipokuwa mtu azithibitishe.",
    note: "Maelezo (si lazima)", notePlaceholder: "mf. lori limeegeshwa kwenye ukingo ulioshushwa",
    photo: "Picha (si lazima)", photoAdd: "Ongeza picha", photoHint: "Nyuso na nambari za magari hufichwa kabla ya kushirikiwa. Taarifa za mahali huondolewa.",
    photoChecking: "Tunakagua picha na kuficha nyuso…", photoReady: "Picha iko tayari", photoNoAi: "Tutakagua na kuficha picha hii ukiwa mtandaoni na umeingia.",
    photoRemove: "Ondoa picha", facesBlurred: "Nyuso au nambari {n} zimefichwa",
    aiSuggests: "Pendekezo la AI: {type}, {sev}", aiUse: "Tumia pendekezo", aiUnverified: "Haijathibitishwa — mtu lazima athibitishe",
    aiNoBarrier: "AI haikuona kizuizi kwenye picha hii. Wewe unajua zaidi — tuma hata hivyo kama kipo.",
    send: "Tuma ripoti", sending: "Inatuma…", saveLater: "Hifadhi kwenye kifaa hiki", signInToSend: "Ingia ili kutuma ripoti yako",
    sent: "Asante. Ripoti yako iko kwenye ramani.", merged: "Mtu ameshakiripoti — ripoti yako imekithibitisha.",
    queued: "Huna mtandao. Imehifadhiwa kwenye kifaa; itatumwa yenyewe.",
    photoSkipped: "Picha haikuweza kukaguliwa kwa faragha, kwa hivyo haikushirikiwa.",
    rateLimited: "Ni ripoti nyingi ndani ya saa moja. Tafadhali subiri kidogo.",
    failed: "Hatukuweza kutuma ripoti. Imehifadhiwa kwenye kifaa hiki.",
    another: "Ripoti kingine", viewMap: "Kiangalie kwenye ramani", back: "Rudi", next: "Endelea", change: "Badilisha",
    queueCount: "Ripoti {n} zinasubiri kutumwa", queueSent: "Ripoti {n} zilizohifadhiwa zimetumwa", pinLabel: "Pini ya mahali pa kizuizi",
    offline: "Nje ya mtandao",
  },
  verify: {
    barrierPrompt: "Bado kipo?", placePrompt: "Hii bado ni sahihi?",
    stillThere: "Bado kipo", gone: "Kimeondoka", accurate: "Bado ni sahihi", changed: "Kuna kilichobadilika",
    signIn: "Ingia ili kuthibitisha", thanks: "Asante — uaminifu umesasishwa.", already: "Umeshakagua hili wiki hii.",
    own: "Wewe ndiye uliyeripoti, kwa hivyo mtu mwingine anahitaji kuthibitisha.", rate: "Ukaguzi mwingi ndani ya saa moja. Jaribu baadaye.",
    failed: "Hatukuweza kuhifadhi. Tafadhali jaribu tena.", whichFeature: "Nini kimebadilika?", newStatus: "Sasa ni",
    submit: "Tuma mabadiliko", cancel: "Ghairi",
  },
  gallery: {
    title: "Picha", lede: "Kutoka kwa jamii. Lebo za AI ni mapendekezo hadi watu wazithibitishe.",
    empty: "Bado hakuna picha.", add: "Ongeza picha", adding: "Tunakagua na kuficha…", added: "Picha imeongezwa. Asante.",
    failed: "Hatukuweza kuongeza picha.", noAi: "Ukaguzi wa faragha haupatikani sasa, kwa hivyo picha haikushirikiwa.",
    privacy: "Nyuso na nambari za magari hufichwa moja kwa moja.", aiTag: "AI", signIn: "Ingia ili kuongeza picha",
    alt: "Picha ya jamii ya {place}",
  },
  tags: {
    ramp: "njia panda", stairs: "ngazi", step: "kidato", kerb: "ukingo", dropped_kerb: "ukingo ulioshushwa", lift: "lifti", door: "mlango",
    narrow: "nyembamba", slope: "mteremko", rough_surface: "uso mbaya", water: "maji", vehicle: "gari",
    construction: "ujenzi", handrail: "reli ya mkono", tactile_paving: "vigae vya kugusa", seating: "viti", toilet_sign: "alama ya choo",
  },
};
