# DIRA roadmap

## Phase 1 — foundations (seeded data)
- [x] Design system, EN + Swahili, onboarding/profile, home map, Discover, place detail, confidence + fit tests

## Phase 2 — routing
- [ ] Lovable Cloud tables + seed (places, features, barriers, ramps); app reads them, seed file as offline fallback
- [ ] Accounts: email + Google sign-in, profile (name + access needs synced), reset password, delete account
- [ ] OpenRouteService wheelchair routing (server) with avoid_polygons + 3 seeded demo journeys as fallback
- [ ] 3 route options (Most accessible / Balanced / Fastest), score, adjusted time, effort, flagged segments with trust
- [ ] Segment-coloured route line with dash patterns, turn-by-turn with access notes
- [ ] Live reroute when a high-severity barrier is reported near the active route; "Report here" + "I'm stuck"

## Phase 3 — reporting + AI
- [ ] 3-tap barrier report (type, severity, send), GPS + adjustable pin, temporary toggle, note
- [ ] Offline queue that syncs later; duplicate merge; rate limit
- [ ] Photo upload (compressed, EXIF stripped), AI photo analysis (strict JSON), privacy blur of faces/plates
- [ ] Verification: "Still there?" / "It's gone" on barriers, "Still accurate" / "Something changed" on places
- [ ] Place photo gallery with AI tags marked unverified

## Phase 4 — voice
- [ ] Mic on every screen, intents, spoken + vibration cues

## Phase 5 — community + ops
- [ ] Contributor profiles, badges, leaderboard, impact dashboard, export
- [ ] Partner portal (claim place), admin moderation, PWA/offline
