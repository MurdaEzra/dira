## Project ownership (DIRA)

- This repository owns the application, Supabase schema, migrations, and deployment configuration.
- Store secrets in local environment files or the chosen hosting provider; never commit secret values.
- Trust math lives only in `src/lib/confidence.ts` and fit math only in `src/lib/fit.ts` (both covered by tests); UI must call them, never re-derive scores.
- Every status is shown as icon + label + colour via `src/components/dira/marks.tsx`; map pins encode meaning by shape (`pinSvg`) so colour is never the only signal.
- All UI strings go through `src/lib/i18n.ts` (English + Swahili share one typed shape), so a missing translation fails the typecheck.
- Access profile and display prefs are stored client-side in `src/lib/prefs.tsx` and applied to `<html>` before paint by `PREFS_BOOT_SCRIPT` to avoid a theme flash.
- The map (`src/components/map/DiraMap.tsx`) is lazy-loaded behind `ClientOnly`; never import it statically from a route, because maplibre is browser-only.
- MapLibre markers: toggle our classes with `classList`, never overwrite `className` — maplibre's own marker classes position the pin.
