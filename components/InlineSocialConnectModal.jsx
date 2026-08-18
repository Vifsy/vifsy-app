"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  Send,
  X,
} from "lucide-react";
import PlanLimitModal from "./PlanLimitModal";
import { supabase } from "../lib/supabaseClient";
import { useUiText } from "../lib/i18n/useUiText";

const SOCIAL_OAUTH_MESSAGE_TYPE = "spreelo-social-oauth-result";

const INLINE_SOCIAL_PLATFORMS = [
  {
    key: "facebook",
    label: "Facebook",
    iconSrc: "/social-icons/facebook.png",
    connectKey: "social.connectFacebook",
    connectingKey: "social.connectingFacebook",
  },
  {
    key: "instagram",
    label: "Instagram",
    iconSrc: "/social-icons/instagram.png",
    connectKey: "social.connectInstagram",
    connectingKey: "social.connectingInstagram",
  },
  {
    key: "threads",
    label: "Threads",
    iconSrc: "/social-icons/threads.svg",
    connectKey: "social.connectThreads",
    connectingKey: "social.connectingThreads",
  },
  {
    key: "pinterest",
    label: "Pinterest",
    iconSrc: "/social-icons/pinterest.png",
    connectKey: "social.connectPinterest",
    connectingKey: "social.connectingPinterest",
  },
  {
    key: "youtube",
    label: "YouTube",
    iconSrc: "/social-icons/youtube.png",
    connectKey: "social.connectYouTube",
    connectingKey: "social.connectingYouTube",
  },
];

function getConnectEndpoint(platformKey) {
  if (platformKey === "instagram") return "/api/auth/instagram/start";
  if (platformKey === "pinterest") return "/api/auth/pinterest/start";
  if (platformKey === "threads") return "/api/auth/threads/start";
  if (platformKey === "youtube") return "/api/auth/youtube/start";
  return "/api/meta/connect";
}

function getOAuthPopupFeatures() {
  const width = 620;
  const height = 760;
  const left = Math.max(0, Math.round((window.screen.width - width) / 2));
  const top = Math.max(0, Math.round((window.screen.height - height) / 2));

  return [
    "popup=yes",
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    "resizable=yes",
    "scrollbars=yes",
  ].join(",");
}

export default function InlineSocialConnectModal({
  open,
  brandProfileId,
  brandName = "",
  connectedPlatforms = [],
  onClose,
  onConnected,
}) {
  const { t } = useUiText(["automation", "social"]);
  const [connectingPlatform, setConnectingPlatform] = useState("");
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState("info");
  const [planLimitDetails, setPlanLimitDetails] = useState(null);
  const popupRef = useRef(null);
  const popupPollRef = useRef(null);
  const oauthResultReceivedRef = useRef(false);
  const onConnectedRef = useRef(onConnected);
  const onCloseRef = useRef(onClose);

  onConnectedRef.current = onConnected;
  onCloseRef.current = onClose;

  const connectedKeys = useMemo(
    () => new Set((connectedPlatforms || []).map((item) => String(item?.value || item || "").toLowerCase())),
    [connectedPlatforms]
  );

  useEffect(() => {
    if (!open) {
      setConnectingPlatform("");
      setMessage("");
      setMessageKind("info");
      setPlanLimitDetails(null);
    }
  }, [open]);

  useEffect(() => {
    function clearPopupPoll() {
      if (popupPollRef.current) {
        window.clearInterval(popupPollRef.current);
        popupPollRef.current = null;
      }
    }

    async function handleOAuthMessage(event) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== SOCIAL_OAUTH_MESSAGE_TYPE) return;

      const platformKey = String(event.data?.platform || "").trim().toLowerCase();
      if (!platformKey) return;

      oauthResultReceivedRef.current = true;
      clearPopupPoll();
      try { popupRef.current?.close(); } catch {}
      popupRef.current = null;
      setConnectingPlatform("");

      if (!event.data?.success) {
        setMessage(t("automation.inlineChannel.connectError"));
        setMessageKind("error");
        return;
      }

      setMessage(t("automation.inlineChannel.connectedSuccess", {
        platform: INLINE_SOCIAL_PLATFORMS.find((item) => item.key === platformKey)?.label || platformKey,
      }));
      setMessageKind("success");

      try {
        await onConnectedRef.current?.(platformKey);
      } catch (error) {
        setMessage(error?.message || t("automation.inlineChannel.refreshError"));
        setMessageKind("error");
      }
    }

    window.addEventListener("message", handleOAuthMessage);
    return () => {
      window.removeEventListener("message", handleOAuthMessage);
      clearPopupPoll();
      try { popupRef.current?.close(); } catch {}
      popupRef.current = null;
    };
  }, [t]);

  if (!open) return null;

  function closeModal() {
    if (popupPollRef.current) {
      window.clearInterval(popupPollRef.current);
      popupPollRef.current = null;
    }
    try { popupRef.current?.close(); } catch {}
    popupRef.current = null;
    setConnectingPlatform("");
    setMessage("");
    onCloseRef.current?.();
  }

  async function connectPlatform(platform) {
    if (!platform?.key || !brandProfileId || connectingPlatform) return;

    setMessage("");
    setMessageKind("info");
    setConnectingPlatform(platform.key);
    oauthResultReceivedRef.current = false;

    const popup = window.open(
      "about:blank",
      `spreelo_inline_oauth_${platform.key}`,
      getOAuthPopupFeatures()
    );
    popupRef.current = popup;

    if (!popup) {
      setConnectingPlatform("");
      setMessage(t("automation.inlineChannel.popupBlocked"));
      setMessageKind("error");
      return;
    }

    try {
      popup.document.title = "Spreelo";
      popup.document.body.innerHTML = `<div style="font-family:Arial,sans-serif;display:grid;place-items:center;min-height:80vh;background:#f7f8fb;color:#17243a"><div style="text-align:center"><strong style="font-size:22px">Spreelo</strong><p style="color:#6b7280">Preparing secure sign-in…</p></div></div>`;
    } catch {}

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        try { popup.close(); } catch {}
        popupRef.current = null;
        setConnectingPlatform("");
        setMessage(t("automation.inlineChannel.sessionExpired"));
        setMessageKind("error");
        return;
      }

      const response = await fetch(getConnectEndpoint(platform.key), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ brand_profile_id: brandProfileId }),
      });
      const payload = await response.json().catch(() => ({}));

      if (payload?.planLimit) {
        try { popup.close(); } catch {}
        popupRef.current = null;
        setConnectingPlatform("");
        setPlanLimitDetails(payload.planLimit);
        return;
      }

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || t("automation.inlineChannel.connectError"));
      }

      popup.location.href = payload.url;
      try { popup.focus(); } catch {}

      if (popupPollRef.current) window.clearInterval(popupPollRef.current);
      popupPollRef.current = window.setInterval(() => {
        const currentPopup = popupRef.current;
        if (!currentPopup || currentPopup.closed) {
          window.clearInterval(popupPollRef.current);
          popupPollRef.current = null;
          popupRef.current = null;

          if (!oauthResultReceivedRef.current) {
            setConnectingPlatform("");
            setMessage(t("automation.inlineChannel.popupClosed"));
            setMessageKind("info");
          }
        }
      }, 500);
    } catch (error) {
      if (popupPollRef.current) {
        window.clearInterval(popupPollRef.current);
        popupPollRef.current = null;
      }
      try { popup.close(); } catch {}
      popupRef.current = null;
      setConnectingPlatform("");
      setMessage(error?.message || t("automation.inlineChannel.connectError"));
      setMessageKind("error");
    }
  }

  return (
    <>
      <div className="inline-social-connect-backdrop" role="presentation" onMouseDown={closeModal}>
        <section
          className="inline-social-connect-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inline-social-connect-title"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="inline-social-connect-close"
            onClick={closeModal}
            aria-label={t("automation.inlineChannel.close")}
          >
            <X size={20} aria-hidden="true" />
          </button>

          <header className="inline-social-connect-header">
            <span className="inline-social-connect-header-icon"><Send size={22} aria-hidden="true" /></span>
            <div>
              <p>{t("automation.inlineChannel.eyebrow")}</p>
              <h2 id="inline-social-connect-title">{t("automation.inlineChannel.title")}</h2>
              <span>{t("automation.inlineChannel.text")}</span>
            </div>
          </header>

          {brandName ? (
            <div className="inline-social-connect-brand">
              <span>{t("automation.inlineChannel.brandLabel")}</span>
              <strong>{brandName}</strong>
            </div>
          ) : null}

          {message ? (
            <div className={`inline-social-connect-notice ${messageKind}`} role="status">
              {messageKind === "success" ? <CheckCircle2 size={17} /> : <LockKeyhole size={17} />}
              <span>{message}</span>
            </div>
          ) : null}

          <div className="inline-social-connect-grid">
            {INLINE_SOCIAL_PLATFORMS.map((platform) => {
              const isConnected = connectedKeys.has(platform.key);
              const isConnecting = connectingPlatform === platform.key;

              return (
                <article key={platform.key} className={`inline-social-connect-card ${isConnected ? "is-connected" : ""}`}>
                  <div className="inline-social-connect-identity">
                    <span className="inline-social-connect-platform-icon">
                      <img src={platform.iconSrc} alt="" aria-hidden="true" />
                    </span>
                    <div>
                      <strong>{platform.label}</strong>
                      <span>{isConnected ? t("social.status.connected") : t("social.status.notConnected")}</span>
                    </div>
                  </div>

                  {isConnected ? (
                    <span className="inline-social-connect-connected"><Check size={16} /> {t("social.status.connected")}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => connectPlatform(platform)}
                      disabled={Boolean(connectingPlatform)}
                      aria-busy={isConnecting}
                    >
                      {isConnecting ? <LoaderCircle size={16} className="inline-social-connect-spin" /> : <ExternalLink size={15} />}
                      {isConnecting ? t(platform.connectingKey) : t(platform.connectKey)}
                    </button>
                  )}
                </article>
              );
            })}
          </div>

          <footer className="inline-social-connect-footer">
            <div><LockKeyhole size={16} aria-hidden="true" /><span>{t("automation.inlineChannel.security")}</span></div>
            <button type="button" onClick={closeModal}>{t("automation.inlineChannel.cancel")}</button>
          </footer>
        </section>
      </div>

      <PlanLimitModal details={planLimitDetails} onClose={() => setPlanLimitDetails(null)} />
    </>
  );
}
