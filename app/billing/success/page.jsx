"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import AppLayout from "../../../components/AppLayout";
import { supabase } from "../../../lib/supabaseClient";
import { useUiText } from "../../../lib/i18n/useUiText";

export default function BillingSuccessPage() {
  const { t } = useUiText();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      try {
        const response = await fetch("/api/stripe/status", { headers: { Authorization: `Bearer ${session.access_token}` } });
        const payload = await response.json().catch(() => ({}));
        if (response.ok && payload?.billing) {
          setReady(true);
          clearInterval(timer);
        }
      } catch {}
      if (attempts >= 8) {
        setReady(true);
        clearInterval(timer);
      }
    }, 900);
    return () => clearInterval(timer);
  }, []);

  return (
    <AppLayout active="settings">
      <main className="billing-success-v14377">
        <section>
          <div className="billing-success-icon">{ready ? <CheckCircle2 /> : <LoaderCircle className="billing-spin" />}</div>
          <p className="eyebrow">{t("billing.successEyebrow")}</p>
          <h1>{ready ? t("billing.successTitle") : t("billing.processingTitle")}</h1>
          <p>{ready ? t("billing.successText") : t("billing.processingText")}</p>
          <a className="spreelo-action-v14371 primary" href="/settings">{t("billing.backToSettings")}</a>
        </section>
      </main>
    </AppLayout>
  );
}
