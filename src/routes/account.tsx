import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { usePrefs } from "@/lib/prefs";
import { useAuth } from "@/lib/auth";
import { deleteMyAccount } from "@/lib/account.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/account")({ component: AccountPage });

function AccountPage() {
  const { t } = usePrefs();
  const { user, displayName, saveDisplayName, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(displayName);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setName(displayName), [displayName]);

  if (!user)
    return (
      <main className="mx-auto max-w-2xl px-4 pt-10 pb-nav">
        <h1 className="text-5xl font-extrabold">{t.account.title}</h1>
        <p className="mt-4 text-xl">{t.account.signedOut}</p>
        <Button asChild className="mt-6">
          <Link to="/sign-in">{t.account.signInCta}</Link>
        </Button>
      </main>
    );

  async function save() {
    setBusy(true);
    setError("");
    const ok = await saveDisplayName(name);
    setMessage(ok ? t.account.saved : t.auth.error);
    setBusy(false);
  }
  async function remove() {
    if (!window.confirm(t.account.deleteBody)) return;
    setBusy(true);
    setError("");
    try {
      const result = await deleteMyAccount();
      if (!result.ok) throw new Error("failed");
      await signOut();
      await navigate({ to: "/" });
    } catch {
      setError(t.account.deleteFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pt-10 pb-nav lg:pt-16">
      <h1 className="text-5xl font-extrabold sm:text-6xl">{t.account.title}</h1>
      <p className="mt-3 text-muted-foreground">{t.account.synced}</p>
      <section className="mt-8 space-y-6 rounded-3xl border-2 border-rule p-5 sm:p-8">
        <p>
          <span className="font-bold">{t.account.email}: </span>
          {user.email}
        </p>
        <label className="grid gap-2 font-bold">
          {t.account.name}
          <input
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            className="h-14 rounded-xl border-2 border-rule bg-background px-4 font-normal"
          />
        </label>
        <Button onClick={save} disabled={busy}>
          {t.account.save}
        </Button>
        {message && <p role="status">{message}</p>}
        <div className="rule-t pt-5">
          <Button variant="outline" onClick={() => void signOut()}>
            {t.account.signOut}
          </Button>
        </div>
        <div className="rule-t pt-5">
          <h2 className="text-xl font-bold">{t.account.deleteTitle}</h2>
          <p className="mt-2 text-muted-foreground">{t.account.deleteBody}</p>
          <Button variant="destructive" className="mt-4" onClick={remove} disabled={busy}>
            {t.account.deleteConfirm}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-coral-ink">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
