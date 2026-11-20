import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { usePrefs } from "@/lib/prefs";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Chrome } from "lucide-react";

export const Route = createFileRoute("/sign-in")({ component: SignInPage });

type Mode = "in" | "up" | "forgot" | "recovery";

function SignInPage() {
  const { t, announce } = usePrefs();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery"))
      setMode("recovery");
  }, []);
  useEffect(() => {
    if (user) navigate({ to: "/account" });
  }, [user, navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "in") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
      } else if (mode === "up") {
        const { error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim().slice(0, 60) } },
        });
        if (err) throw err;
        setMessage(t.auth.checkEmail);
      } else if (mode === "forgot") {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin + "/sign-in",
        });
        if (err) throw err;
        setMessage(t.auth.resetSent);
      } else {
        if (password.length < 8) {
          setError(t.auth.minPw);
          return;
        }
        const { error: err } = await supabase.auth.updateUser({ password });
        if (err) throw err;
        setMessage(t.auth.passwordSet);
        announce(t.auth.passwordSet);
        setMode("in");
      }
    } catch {
      setError(mode === "in" ? t.auth.badLogin : t.auth.error);
    } finally {
      setBusy(false);
    }
  }

  async function continueWithGoogle() {
    setBusy(true);
    setError("");
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/sign-in" },
      });
      if (oauthError) throw oauthError;
    } catch {
      setError(t.auth.error);
      setBusy(false);
    }
  }

  const title =
    mode === "up"
      ? t.auth.signUp
      : mode === "forgot"
        ? t.auth.forgot
        : mode === "recovery"
          ? t.auth.newPassword
          : t.auth.signIn;

  return (
    <main className="mx-auto max-w-xl px-4 pt-10 pb-nav lg:pt-20">
      <header>
        <h1 className="text-5xl font-extrabold sm:text-6xl">{t.auth.title}</h1>
        <p className="mt-3 text-xl text-muted-foreground">{t.auth.lede}</p>
      </header>
      <form
        onSubmit={submit}
        className="mt-8 space-y-5 rounded-3xl border-2 border-rule p-5 sm:p-8"
      >
        <h2 className="text-2xl font-extrabold">{title}</h2>
        {mode === "in" || mode === "up" ? (
          <>
            <Button
              type="button"
              variant="outline"
              className="h-14 w-full"
              onClick={() => void continueWithGoogle()}
              disabled={busy}
            >
              <Chrome aria-hidden className="size-5" />
              {t.auth.google}
            </Button>
            <p className="text-center text-sm text-muted-foreground">{t.auth.or}</p>
          </>
        ) : null}
        {mode !== "recovery" && (
          <label className="grid gap-2 font-bold">
            {t.auth.email}
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 rounded-xl border-2 border-rule bg-background px-4 font-normal"
            />
          </label>
        )}
        {mode === "up" && (
          <label className="grid gap-2 font-bold">
            {t.auth.name}
            <input
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              className="h-14 rounded-xl border-2 border-rule bg-background px-4 font-normal"
            />
          </label>
        )}
        {mode !== "forgot" && (
          <label className="grid gap-2 font-bold">
            {mode === "recovery" ? t.auth.newPassword : t.auth.password}
            <input
              required
              minLength={8}
              type="password"
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 rounded-xl border-2 border-rule bg-background px-4 font-normal"
            />
          </label>
        )}
        {mode === "in" && (
          <button type="button" onClick={() => setMode("forgot")} className="min-h-11 underline">
            {t.auth.forgot}
          </button>
        )}
        {error && (
          <p role="alert" className="text-coral-ink">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="rounded-xl bg-primary/10 p-4">
            {message}
          </p>
        )}
        <Button className="h-14 w-full" disabled={busy}>
          {busy
            ? t.auth.working
            : mode === "forgot"
              ? t.auth.submitForgot
              : mode === "recovery"
                ? t.auth.setPassword
                : mode === "up"
                  ? t.auth.submitUp
                  : t.auth.submitIn}
        </Button>
        {mode === "in" || mode === "up" ? (
          <p className="text-center">
            {mode === "in" ? t.auth.signUp : t.auth.signIn}{" "}
            <button
              type="button"
              className="font-bold underline"
              onClick={() => setMode(mode === "in" ? "up" : "in")}
            >
              {mode === "in" ? t.auth.submitUp : t.auth.submitIn}
            </button>
          </p>
        ) : (
          <button type="button" className="min-h-11 underline" onClick={() => setMode("in")}>
            {t.auth.back}
          </button>
        )}
      </form>
    </main>
  );
}
