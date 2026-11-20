import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { usePrefs } from "./prefs";
import { DEFAULT_PROFILE, type AccessProfile } from "./types";

interface AuthCtx {
  user: User | null;
  ready: boolean;
  isAdmin: boolean;
  roleReady: boolean;
  displayName: string;
  saveDisplayName: (name: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

function mergeProfile(p: unknown): AccessProfile | null {
  if (!p || typeof p !== "object") return null;
  const v = p as Partial<AccessProfile>;
  return { ...DEFAULT_PROFILE, ...v, needs: { ...DEFAULT_PROFILE.needs, ...(v.needs ?? {}) } };
}

/** Session state + two-way sync of the access profile with the signed-in account. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleReady, setRoleReady] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const { profile, setProfile, onboarded, setOnboarded, hydrated } = usePrefs();
  const router = useRouter();
  const qc = useQueryClient();
  const synced = useRef<string | null>(null);
  const latest = useRef({ profile, onboarded });
  latest.current = { profile, onboarded };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setUser(session?.user ?? null);
      if (event === "SIGNED_OUT") synced.current = null;
      router.invalidate();
      if (event !== "SIGNED_OUT") qc.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, qc]);

  // On sign-in: pull the saved profile, or push this device's one if the account has none yet.
  const uid = user?.id;
  useEffect(() => {
    if (!uid) {
      setIsAdmin(false);
      setRoleReady(true);
      return;
    }
    let cancelled = false;
    setRoleReady(false);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setIsAdmin(!!data);
          setRoleReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  useEffect(() => {
    if (!uid || !hydrated) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, access_profile")
        .eq("id", uid)
        .maybeSingle();
      if (cancelled) return;
      setDisplayName(data?.display_name ?? "");
      const remote = mergeProfile(data?.access_profile);
      if (remote) {
        synced.current = JSON.stringify(remote);
        setProfile(remote);
        if (!latest.current.onboarded) setOnboarded(true);
      } else if (latest.current.onboarded) {
        const json = JSON.parse(JSON.stringify(latest.current.profile));
        await supabase.from("profiles").update({ access_profile: json }).eq("id", uid);
        synced.current = JSON.stringify(latest.current.profile);
      } else {
        synced.current = JSON.stringify(latest.current.profile);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Later edits on this device go up to the account (debounced).
  useEffect(() => {
    if (!uid || synced.current === null) return;
    const json = JSON.stringify(profile);
    if (json === synced.current) return;
    const t = setTimeout(async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ access_profile: JSON.parse(json) })
        .eq("id", uid);
      if (!error) synced.current = json;
    }, 800);
    return () => clearTimeout(t);
  }, [profile, uid]);

  const saveDisplayName = useCallback(
    async (name: string) => {
      if (!uid) return false;
      const clean = name.trim().slice(0, 60);
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: clean })
        .eq("id", uid);
      if (!error) setDisplayName(clean);
      return !error;
    },
    [uid],
  );

  const signOut = useCallback(async () => {
    await qc.cancelQueries();
    await supabase.auth.signOut();
    setDisplayName("");
  }, [qc]);

  const value = useMemo(
    () => ({ user, ready, isAdmin, roleReady, displayName, saveDisplayName, signOut }),
    [user, ready, isAdmin, roleReady, displayName, saveDisplayName, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
