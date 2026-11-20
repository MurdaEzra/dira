import { Link } from "@tanstack/react-router";
import {
  Compass,
  Map as MapIcon,
  UserRound,
  Route as RouteIcon,
  CirclePlus,
  CircleUserRound,
  Images,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { Wordmark } from "./wordmark";
import { useAuth } from "@/lib/auth";

function LangSwitch() {
  const { lang, setLang, t } = usePrefs();
  return (
    <div
      role="group"
      aria-label={t.lang.label}
      className="flex rounded-full border-[length:var(--rule-w)] border-rule p-0.5"
    >
      {(["en", "sw"] as const).map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={lang === l}
          aria-label={t.lang[l]}
          onClick={() => setLang(l)}
          className="h-10 min-w-11 rounded-full px-3 text-sm font-bold uppercase tracking-wider text-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground"
        >
          {l}
        </button>
      ))}
    </div>
  );
}

const NAV = [
  { to: "/", key: "map", Icon: MapIcon },
  { to: "/discover", key: "discover", Icon: Compass },
  { to: "/planner", key: "route", Icon: RouteIcon },
  { to: "/report", key: "report", Icon: CirclePlus },
  { to: "/profile", key: "profile", Icon: UserRound },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = usePrefs();
  const { isAdmin } = useAuth();
  return (
    <div className="min-h-dvh">
      <a href="#main" className="skip-link">
        {t.app.skip}
      </a>
      <header className="sticky top-0 z-40 flex h-[var(--header-h)] items-center gap-4 rule-b bg-background px-4 lg:px-6">
        <Link to="/" className="tap flex items-center rounded-lg" aria-label="DIRA â€” home">
          <Wordmark />
        </Link>
        <span className="hidden font-display text-lg italic text-muted-foreground xl:inline">
          {t.app.tagline}
        </span>
        <nav aria-label={t.nav.primary} className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map(({ to, key, Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  activeOptions={{ exact: to === "/" }}
                  className="flex h-12 items-center gap-2 rounded-full px-4 font-semibold text-foreground hover:bg-accent data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
                >
                  <Icon aria-hidden className="size-5" />
                  {t.nav[key]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-3 lg:ml-2">
          {isAdmin && (
            <Link
              to="/admin"
              aria-label={t.nav.admin}
              className="tap grid place-items-center gap-1 rounded-full px-2 text-sm font-bold hover:bg-accent sm:flex sm:px-3"
            >
              <ShieldCheck aria-hidden className="size-6" />
              <span className="hidden sm:inline">{t.nav.admin}</span>
            </Link>
          )}
          <Link
            to="/photos"
            search={{ place: undefined }}
            aria-label={t.gallery.title}
            className="tap grid place-items-center rounded-full hover:bg-accent"
          >
            <Images aria-hidden className="size-6" />
          </Link>
          <Link
            to="/account"
            aria-label={t.nav.account}
            className="tap grid place-items-center rounded-full hover:bg-accent"
          >
            <CircleUserRound aria-hidden className="size-6" />
          </Link>
          <LangSwitch />
        </div>
      </header>

      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>

      <nav
        aria-label={t.nav.primary}
        className="fixed inset-x-0 bottom-0 z-40 h-[var(--nav-h)] rule-t bg-background lg:hidden"
      >
        <ul className="grid h-full grid-cols-5">
          {NAV.map(({ to, key, Icon }) => (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                className={cn(
                  "group flex h-full flex-col items-center justify-center gap-1 text-sm font-semibold text-muted-foreground",
                  "data-[status=active]:text-foreground",
                )}
              >
                <span className="grid h-8 w-14 place-items-center rounded-full group-data-[status=active]:bg-primary group-data-[status=active]:text-primary-foreground">
                  <Icon aria-hidden className="size-5" />
                </span>
                {t.nav[key]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
