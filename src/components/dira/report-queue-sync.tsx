import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { usePrefs } from "@/lib/prefs";
import { analyzePhoto } from "@/lib/photo.functions";
import { flushQueue } from "@/lib/reports";
import { fmt } from "@/lib/i18n";

/** Resume queued reports after a signed-in session comes online. */
export function ReportQueueSync() {
  const { user } = useAuth();
  const { t, announce } = usePrefs();

  useEffect(() => {
    if (!user) return;
    let active = true;
    const flush = async () => {
      const sent = await flushQueue(analyzePhoto).catch(() => 0);
      if (active && sent > 0) announce(fmt(t.report.queueSent, { n: sent }));
    };
    void flush();
    window.addEventListener("online", flush);
    return () => {
      active = false;
      window.removeEventListener("online", flush);
    };
  }, [user, announce, t.report.queueSent]);

  return null;
}
