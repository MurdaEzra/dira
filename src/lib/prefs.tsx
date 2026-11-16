import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DICTS, type Dict } from "./i18n";
import {
  DEFAULT_DISPLAY,
  DEFAULT_PROFILE,
  type AccessProfile,
  type DisplayPrefs,
  type Lang,
} from "./types";
import { CITY } from "@/data/seed";

const KEY = "dira:prefs:v1";

interface Stored {
  profile: AccessProfile;
  display: DisplayPrefs;
  lang: Lang;
  onboarded: boolean;
}

const DEFAULTS: Stored = {
  profile: DEFAULT_PROFILE,
  display: DEFAULT_DISPLAY,
  lang: "en",
  onboarded: false,
};

interface Ctx extends Stored {
  hydrated: boolean;
  t: Dict;
  here: { lat: number; lng: number; real: boolean };
  setHere: (h: { lat: number; lng: number; real: boolean }) => void;
  setProfile: (p: AccessProfile) => void;
  setDisplay: (d: Partial<DisplayPrefs>) => void;
  setLang: (l: Lang) => void;
  setOnboarded: (v: boolean) => void;
  announce: (msg: string) => void;
}

const PrefsContext = createContext<Ctx | null>(null);

/** Applied before first paint by the inline script in __root, then kept in sync here. */
export function applyDisplay(d: DisplayPrefs, lang: Lang) {
  const el = document.documentElement;
  el.classList.toggle("dark", d.theme === "dark");
  el.classList.toggle("hc", d.theme === "hc");
  el.classList.toggle("readable", d.readable);
  el.classList.toggle("reduce-motion", d.reduceMotion);
  el.style.setProperty("--text-scale", String(d.textScale));
  el.lang = lang;
}

export const PREFS_BOOT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem("${KEY}")||"null");if(!s)return;var d=s.display||{},e=document.documentElement;if(d.theme==="dark")e.classList.add("dark");if(d.theme==="hc")e.classList.add("hc");if(d.readable)e.classList.add("readable");if(d.reduceMotion)e.classList.add("reduce-motion");if(d.textScale)e.style.setProperty("--text-scale",String(d.textScale));if(s.lang)e.lang=s.lang}catch(_){}})();`;

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Stored>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);
  const [here, setHere] = useState({ ...CITY.center, real: false });
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw) as Partial<Stored>;
        setState({
          profile: { ...DEFAULT_PROFILE, ...s.profile, needs: { ...DEFAULT_PROFILE.needs, ...s.profile?.needs } },
          display: { ...DEFAULT_DISPLAY, ...s.display },
          lang: s.lang === "sw" ? "sw" : "en",
          onboarded: !!s.onboarded,
        });
      }
    } catch {
      /* corrupted storage: fall back to defaults */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify(state));
    applyDisplay(state.display, state.lang);
  }, [state, hydrated]);

  const announce = useCallback((msg: string) => {
    setMessage("");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(msg), 60);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      hydrated,
      t: DICTS[state.lang],
      here,
      setHere,
      setProfile: (profile) =>
        setState((s) => {
          const hcChanged = profile.needs.highContrast !== s.profile.needs.highContrast;
          const display = hcChanged
            ? { ...s.display, theme: profile.needs.highContrast ? ("hc" as const) : ("light" as const) }
            : s.display;
          return { ...s, profile, display };
        }),
      setDisplay: (d) =>
        setState((s) => {
          const display = { ...s.display, ...d };
          const profile = d.theme
            ? { ...s.profile, needs: { ...s.profile.needs, highContrast: d.theme === "hc" } }
            : s.profile;
          return { ...s, display, profile };
        }),
      setLang: (lang) => setState((s) => ({ ...s, lang })),
      setOnboarded: (onboarded) => setState((s) => ({ ...s, onboarded })),
      announce,
    }),
    [state, hydrated, here, announce],
  );

  return (
    <PrefsContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {message}
      </div>
    </PrefsContext.Provider>
  );
}

export function usePrefs() {
  const c = useContext(PrefsContext);
  if (!c) throw new Error("usePrefs must be used inside PrefsProvider");
  return c;
}
