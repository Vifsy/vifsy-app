"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useUiText } from "../../lib/i18n/useUiText";

export default function AdminLayout({ children }) {
  const { t } = useUiText(["admin"]);
  const [access, setAccess] = useState("checking");

  useEffect(() => {
    let cancelled = false;

    async function verifyAdminAccess() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          window.location.replace("/login");
          return;
        }

        const response = await fetch("/api/admin/me", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });

        if (cancelled) return;
        if (!response.ok) {
          setAccess("denied");
          window.location.replace("/");
          return;
        }

        const payload = await response.json().catch(() => ({}));
        if (!payload?.isAdmin) {
          setAccess("denied");
          window.location.replace("/");
          return;
        }

        setAccess("granted");
      } catch {
        if (!cancelled) {
          setAccess("denied");
          window.location.replace("/");
        }
      }
    }

    verifyAdminAccess();
    return () => { cancelled = true; };
  }, []);

  if (access !== "granted") {
    return (
      <main className="admin-route-guard" aria-live="polite">
        <div className="admin-route-guard-card">
          <span><ShieldCheck size={22} /></span>
          <strong>{access === "checking" ? t("admin.accessChecking") : t("admin.accessDenied")}</strong>
          <p>{access === "checking" ? t("admin.accessCheckingText") : t("admin.accessDeniedText")}</p>
        </div>
      </main>
    );
  }

  return children;
}
