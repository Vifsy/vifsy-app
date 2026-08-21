import { createClient } from "@supabase/supabase-js";
import {
  getDefaultNamespaceLabels,
  interpolateUiText,
} from "../../../lib/i18n/defaultLabels.js";
import {
  getServerTranslations,
  resolveBestServerLocale,
  resolveUiLocaleFromLanguageName,
} from "../../../lib/i18n/serverUiText.js";

import {
  fetchTikTokCreatorInfo,
  getHealthyTikTokAccessToken,
  getTikTokEnv,
} from "../../../lib/tiktokOAuth.js";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.spreelo.com";

function createFallbackTranslator() {
  const labels = {
    ...getDefaultNamespaceLabels("common"),
    ...getDefaultNamespaceLabels("approvePages"),
  };

  return {
    locale: "en",
    t(key, values = {}) {
      return interpolateUiText(labels[key] || key, values);
    },
  };
}

async function getApproveTranslations({ supabase, locale }) {
  if (!supabase) return createFallbackTranslator();

  try {
    return await getServerTranslations({
      supabaseAdmin: supabase,
      locale,
      namespaces: ["approvePages"],
    });
  } catch (error) {
    console.error("Could not load approve page translations", error);
    return createFallbackTranslator();
  }
}

async function getUserAppLanguage(supabase, userId) {
  if (!supabase || !userId) return null;

  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);

    if (error || !data?.user) return null;

    const metadata = data.user.user_metadata || {};

    return (
      metadata.app_language ||
      metadata.appLanguage ||
      metadata.ui_language ||
      metadata.locale ||
      null
    );
  } catch (error) {
    console.error("Could not load user app language for approval page", error);
    return null;
  }
}

function resolveApprovalPageLocale({ request, url, post, brandProfile, userAppLanguage }) {
  const explicitUrlLocale = resolveUiLocaleFromLanguageName(
    url?.searchParams?.get("lang") || url?.searchParams?.get("locale")
  );

  if (explicitUrlLocale) return explicitUrlLocale;

  const userAppLocale = resolveUiLocaleFromLanguageName(userAppLanguage);

  if (userAppLocale) return userAppLocale;

  return resolveBestServerLocale({
    request,
    languageCandidates: [post?.language, brandProfile?.content_language],
  });
}

function createHtmlPage({ title, message, status = "success", t, locale = "en" }) {
  const isSuccess = status === "success";
  const logoUrl = `${APP_URL.replace(/\/$/, "")}/brand/spreelologo.png`;

  return `
<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${title}</title>
    <style>
      :root {
        --spreelo-ink: #0b1724;
        --spreelo-muted: #667085;
        --spreelo-line: #e8e3dc;
        --spreelo-surface: rgba(255, 255, 255, 0.96);
        --spreelo-accent: #ef6849;
        --spreelo-accent-deep: #c84b31;
        --spreelo-accent-soft: #fff0e8;
        --spreelo-bg: #f7f4ef;
      }

      * { box-sizing: border-box; }

      html, body { min-height: 100%; }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
        background:
          radial-gradient(circle at 18% 18%, rgba(239, 104, 73, 0.10), transparent 30%),
          radial-gradient(circle at 84% 80%, rgba(11, 23, 36, 0.07), transparent 28%),
          var(--spreelo-bg);
        color: var(--spreelo-ink);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 28px;
        overflow-x: hidden;
      }

      .page-glow {
        position: fixed;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
      }

      .page-glow::before,
      .page-glow::after {
        content: "";
        position: absolute;
        width: 280px;
        height: 280px;
        border-radius: 999px;
        filter: blur(1px);
        opacity: 0.45;
      }

      .page-glow::before {
        left: -105px;
        top: -115px;
        background: linear-gradient(145deg, rgba(255, 107, 82, 0.26), rgba(239, 62, 47, 0.03));
      }

      .page-glow::after {
        right: -115px;
        bottom: -135px;
        background: linear-gradient(145deg, rgba(11, 23, 36, 0.12), rgba(255, 255, 255, 0));
      }

      .shell {
        width: 100%;
        max-width: 640px;
        position: relative;
        z-index: 1;
      }

      .brand-row {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 18px;
      }

      .brand-row img {
        display: block;
        width: 150px;
        max-width: 46vw;
        height: auto;
      }

      .card {
        position: relative;
        overflow: hidden;
        width: 100%;
        background: var(--spreelo-surface);
        border: 1px solid rgba(11, 23, 36, 0.09);
        border-radius: 26px;
        padding: 42px 42px 36px;
        box-shadow:
          0 28px 70px rgba(11, 23, 36, 0.10),
          0 4px 14px rgba(11, 23, 36, 0.04);
        text-align: center;
        backdrop-filter: blur(14px);
      }

      .card::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 5px;
        background: linear-gradient(90deg, #ff6b52 0%, #ef3e2f 46%, #8b5cf6 100%);
      }

      .status-wrap {
        display: flex;
        justify-content: center;
        margin: 2px 0 22px;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 62px;
        height: 62px;
        border-radius: 20px;
        background: ${isSuccess ? "#effaf4" : "#fff1f0"};
        color: ${isSuccess ? "#16834b" : "#b42318"};
        border: 1px solid ${isSuccess ? "#ccefd9" : "#ffd3ce"};
        box-shadow: 0 10px 28px ${isSuccess ? "rgba(22, 131, 75, 0.12)" : "rgba(180, 35, 24, 0.10)"};
      }

      .badge svg {
        width: 28px;
        height: 28px;
        stroke-width: 2.2;
      }

      .eyebrow {
        margin: 0 0 9px;
        color: var(--spreelo-accent-deep);
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0 auto 12px;
        max-width: 520px;
        font-size: clamp(27px, 5vw, 34px);
        line-height: 1.15;
        letter-spacing: -0.035em;
        font-weight: 850;
      }

      .message {
        margin: 0 auto;
        max-width: 470px;
        color: #526071;
        font-size: 16px;
        line-height: 1.65;
      }

      .button-row {
        display: flex;
        justify-content: center;
        gap: 12px;
        flex-wrap: wrap;
        margin-top: 28px;
      }

      a,
      button {
        min-height: 46px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 20px;
        border-radius: 13px;
        text-decoration: none;
        font-family: inherit;
        font-weight: 800;
        font-size: 14px;
        cursor: pointer;
        transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease, border-color 160ms ease;
      }

      a:hover,
      button:hover {
        transform: translateY(-1px);
      }

      .primary-action {
        background: var(--spreelo-ink);
        color: #ffffff;
        border: 1px solid var(--spreelo-ink);
        box-shadow: 0 10px 24px rgba(11, 23, 36, 0.16);
      }

      .primary-action:hover {
        background: #152437;
        border-color: #152437;
        box-shadow: 0 13px 28px rgba(11, 23, 36, 0.20);
      }

      .secondary-action {
        background: #ffffff;
        color: var(--spreelo-ink);
        border: 1px solid #d9dde3;
        box-shadow: 0 4px 12px rgba(11, 23, 36, 0.04);
      }

      .secondary-action:hover {
        border-color: #bfc6cf;
        background: #fbfbfc;
      }

      .arrow {
        width: 22px;
        height: 22px;
        border-radius: 7px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--spreelo-accent);
        color: white;
        line-height: 1;
        font-size: 15px;
      }

      .divider {
        width: 54px;
        height: 3px;
        margin: 28px auto 15px;
        border-radius: 999px;
        background: var(--spreelo-accent-soft);
      }

      .small-text {
        margin: 0;
        color: #7b8491;
        font-size: 12.5px;
        line-height: 1.55;
      }

      @media (max-width: 560px) {
        body { padding: 18px; }
        .brand-row { margin-bottom: 14px; }
        .brand-row img { width: 132px; }
        .card { padding: 34px 22px 28px; border-radius: 22px; }
        .badge { width: 56px; height: 56px; border-radius: 18px; }
        .message { font-size: 15px; }
        .button-row { flex-direction: column-reverse; }
        a, button { width: 100%; }
      }
    </style>
  </head>
  <body>
    <div class="page-glow" aria-hidden="true"></div>
    <main class="shell">
      <div class="brand-row">
        <img src="${logoUrl}" alt="Spreelo" />
      </div>

      <section class="card">
        <div class="status-wrap">
          <div class="badge" aria-hidden="true">
            ${
              isSuccess
                ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
                : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 8v5" stroke-linecap="round"/><path d="M12 17h.01" stroke-linecap="round"/><circle cx="12" cy="12" r="9"/></svg>`
            }
          </div>
        </div>

        <p class="eyebrow">SPREELO</p>
        <h1>${title}</h1>
        <p class="message">${message}</p>

        ${
          isSuccess
            ? `
              <div class="button-row">
                <button class="secondary-action" type="button" onclick="window.close()">${t("approvePages.closePage")}</button>
                <a class="primary-action" href="${APP_URL}">${t("approvePages.openSpreelo")}<span class="arrow">→</span></a>
              </div>

              <div class="divider"></div>
              <p class="small-text">${t("approvePages.safeClose")}</p>
            `
            : `
              <div class="button-row">
                <a class="primary-action" href="${APP_URL}">${t("approvePages.openSpreelo")}<span class="arrow">→</span></a>
              </div>
            `
        }
      </section>
    </main>
  </body>
</html>
`;
}


function escapeTikTokHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isTikTokTarget(platform) {
  return String(platform || "").toLowerCase().replaceAll(" ", "").includes("tiktok");
}

async function getTikTokApprovalContext({ supabase, post }) {
  const { data: connection, error } = await supabase
    .from("social_connections")
    .select("id, user_id, brand_profile_id, page_id, page_name, page_access_token, token_expires_at, refresh_token, refresh_token_expires_at, permissions, status")
    .eq("user_id", post.user_id)
    .eq("brand_profile_id", post.brand_profile_id)
    .eq("platform", "tiktok")
    .eq("status", "connected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!connection?.id) {
    const reconnectError = new Error("TikTok is no longer connected for this brand. Reconnect TikTok in Spreelo before approving this post.");
    reconnectError.requiresReconnect = true;
    throw reconnectError;
  }
  const healthy = await getHealthyTikTokAccessToken({ supabase, connection });
  const creatorInfo = await fetchTikTokCreatorInfo(healthy.accessToken);
  return { connection: healthy.connection || connection, accessToken: healthy.accessToken, creatorInfo };
}

function getTikTokApprovalSlideMetadata(slide) {
  const metadata = slide?.metadata;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) return metadata;
  if (typeof metadata === "string") {
    try { return JSON.parse(metadata) || {}; } catch { return {}; }
  }
  return {};
}

function createTikTokApprovalHtml({
  post,
  token,
  creatorInfo,
  carouselSlides = [],
  locale = "en",
  publicPostingReady,
  allowPrivateTesting,
  t,
}) {
  const tr = typeof t === "function" ? t : (key) => key;
  const isVideo = Boolean(post.video_url) || String(post.content_format || "") === "animated_video";
  const isCarousel = String(post.content_format || "") === "carousel";
  const mediaOverrides = post?.platform_publish_settings?.tiktok?.media_overrides || {};
  const singlePreviewUrl = isVideo ? post.video_url : (mediaOverrides.image_url || post.image_url);
  const slides = isCarousel
    ? (carouselSlides || []).map((slide) => {
        const metadata = getTikTokApprovalSlideMetadata(slide);
        return {
          imageUrl: metadata.tiktok_image_url || slide?.image_url || "",
          order: Number(slide?.slide_order || 0),
        };
      }).filter((slide) => slide.imageUrl).sort((a,b) => a.order-b.order)
    : [];

  const privacyOptions = Array.isArray(creatorInfo?.privacy_level_options) ? creatorInfo.privacy_level_options : [];
  const labels = {
    PUBLIC_TO_EVERYONE: tr("approvePages.tiktok.visibilityEveryone"),
    MUTUAL_FOLLOW_FRIENDS: tr("approvePages.tiktok.visibilityFriends"),
    FOLLOWER_OF_CREATOR: tr("approvePages.tiktok.visibilityFollowers"),
    SELF_ONLY: tr("approvePages.tiktok.visibilityOnlyMe"),
  };
  const options = privacyOptions.map((value) => `<option value="${escapeTikTokHtml(value)}">${escapeTikTokHtml(labels[value] || value)}</option>`).join("");

  const modeNotice = publicPostingReady
    ? `<div class="mode-notice mode-ok"><span class="mode-icon">✓</span><div><strong>${escapeTikTokHtml(tr("approvePages.tiktok.publicTitle"))}</strong><span>${escapeTikTokHtml(tr("approvePages.tiktok.publicHelp"))}</span></div></div>`
    : allowPrivateTesting
      ? `<div class="mode-notice mode-warn"><span class="mode-icon">i</span><div><strong>${escapeTikTokHtml(tr("approvePages.tiktok.testTitle"))}</strong><span>${escapeTikTokHtml(tr("approvePages.tiktok.testHelp"))}</span></div></div>`
      : `<div class="mode-notice mode-warn"><span class="mode-icon">!</span><div><strong>${escapeTikTokHtml(tr("approvePages.tiktok.notReadyTitle"))}</strong><span>${escapeTikTokHtml(tr("approvePages.tiktok.notReadyHelp"))}</span></div></div>`;

  const canSubmit = publicPostingReady || allowPrivateTesting;
  const media = isCarousel && slides.length
    ? `<div class="carousel-preview" data-count="${slides.length}">
        <div class="carousel-stage">${slides.map((slide,index)=>`<img class="carousel-slide${index===0?" active":""}" data-slide="${index}" src="${escapeTikTokHtml(slide.imageUrl)}" alt="${escapeTikTokHtml(tr("approvePages.tiktok.previewTitle"))}" />`).join("")}</div>
        <div class="carousel-nav"><button type="button" class="nav-btn" id="carouselPrev" aria-label="${escapeTikTokHtml(tr("approvePages.tiktok.previous"))}">←</button><span id="carouselCounter">${escapeTikTokHtml(tr("approvePages.tiktok.slideCounter", { index: 1, count: slides.length }))}</span><button type="button" class="nav-btn" id="carouselNext" aria-label="${escapeTikTokHtml(tr("approvePages.tiktok.next"))}">→</button></div>
        <div class="carousel-dots">${slides.map((_,index)=>`<button type="button" class="dot${index===0?" active":""}" data-dot="${index}" aria-label="${index+1}"></button>`).join("")}</div>
      </div>`
    : singlePreviewUrl
      ? (isVideo
        ? `<video class="single-preview" src="${escapeTikTokHtml(singlePreviewUrl)}" controls playsinline></video>`
        : `<img class="single-preview" src="${escapeTikTokHtml(singlePreviewUrl)}" alt="${escapeTikTokHtml(tr("approvePages.tiktok.previewTitle"))}" />`)
      : `<div class="single-preview preview-empty">${escapeTikTokHtml(tr("approvePages.tiktok.previewUnavailable"))}</div>`;
  const titleMax = isVideo ? 2200 : 4000;
  const logoUrl = `${APP_URL.replace(/\/$/, "")}/brand/spreelologo.png`;

  return `<!doctype html>
<html lang="${escapeTikTokHtml(locale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeTikTokHtml(tr("approvePages.tiktok.pageTitle"))}</title>
<style>
:root{--ink:#102033;--muted:#64748b;--line:#dfe7f1;--surface:#fff;--soft:#f5f8fc;--blue:#1769ff;--pink:#f04b8a;--orange:#ff7957;--green:#13a66b}*{box-sizing:border-box}html,body{min-height:100%}body{margin:0;color:var(--ink);font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;background:#eef3f8}.app-backdrop{position:fixed;inset:0;display:grid;grid-template-columns:220px 1fr;background:#f7f9fc;overflow:hidden}.fake-sidebar{background:#101722;padding:24px 18px}.fake-logo{height:28px;width:116px;background:linear-gradient(90deg,#ff4f88,#7d4cff);border-radius:8px;margin-bottom:34px}.fake-nav{display:grid;gap:11px}.fake-nav i{display:block;height:39px;border-radius:10px;background:rgba(255,255,255,.07)}.fake-nav i:nth-child(2){background:rgba(255,255,255,.14)}.fake-main{padding:24px 34px}.fake-top{height:52px;background:#fff;border:1px solid #e7edf5;border-radius:14px;margin-bottom:24px}.fake-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.fake-card{height:180px;background:#fff;border:1px solid #e7edf5;border-radius:18px}.veil{position:fixed;inset:0;background:rgba(13,24,42,.48);backdrop-filter:blur(5px)}.modal-wrap{position:relative;z-index:2;min-height:100vh;padding:30px 18px;display:flex;align-items:flex-start;justify-content:center}.modal{width:min(1080px,100%);background:rgba(255,255,255,.985);border:1px solid rgba(255,255,255,.75);border-radius:26px;box-shadow:0 34px 90px rgba(10,24,48,.22);overflow:hidden}.modal-head{display:grid;grid-template-columns:1fr auto;gap:22px;padding:28px 32px 24px;border-bottom:1px solid var(--line)}.brandline{display:flex;align-items:center;gap:16px;margin-bottom:16px}.brandline img{width:118px;height:auto}.platform-chip{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border-radius:999px;background:#111;color:#fff;font-size:12px;font-weight:800}.eyebrow{margin:0 0 7px;color:#52637a;font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}.modal h1{margin:0;font-size:32px;line-height:1.08;letter-spacing:-.035em}.intro{max-width:720px;margin:10px 0 0;color:var(--muted);line-height:1.55}.creator{align-self:center;min-width:230px;display:flex;align-items:center;gap:11px;padding:11px 13px;background:var(--soft);border:1px solid var(--line);border-radius:15px}.creator img{width:42px;height:42px;border-radius:50%;object-fit:cover}.creator strong,.creator span{display:block}.creator span{font-size:12px;color:var(--muted);margin-top:2px}.body{padding:24px 32px 30px}.mode-notice{display:flex;align-items:flex-start;gap:11px;padding:13px 15px;border-radius:14px;margin-bottom:20px;font-size:13px;line-height:1.45}.mode-notice strong,.mode-notice span{display:block}.mode-notice strong{margin-bottom:2px}.mode-warn{background:#fff7e8;border:1px solid #f4d8a2}.mode-ok{background:#edfbf4;border:1px solid #c6edd9}.mode-icon{display:grid!important;place-items:center;width:24px;height:24px;border-radius:50%;font-weight:900;background:#fff}.layout{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(360px,.95fr);gap:24px}.panel{background:#fff;border:1px solid var(--line);border-radius:20px;padding:18px}.panel-title{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:14px}.panel-title h2{font-size:17px;margin:0 0 3px}.panel-title p{font-size:12px;color:var(--muted);margin:0;line-height:1.4}.single-preview,.carousel-stage{display:block;width:100%;height:480px;object-fit:contain;background:#0f1115;border-radius:16px}.single-preview{object-fit:contain}.preview-empty{display:grid;place-items:center;color:#a1aab8;background:#f4f6f9}.carousel-stage{position:relative;overflow:hidden}.carousel-slide{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;opacity:0;transform:translateX(12px);transition:.2s ease}.carousel-slide.active{opacity:1;transform:none}.carousel-nav{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:12px;font-size:12px;font-weight:800;color:#52637a}.nav-btn{width:36px;height:36px;border:1px solid var(--line);border-radius:10px;background:#fff;cursor:pointer;font-size:18px}.carousel-dots{display:flex;justify-content:center;gap:6px;margin-top:8px}.dot{width:7px;height:7px;padding:0;border:0;border-radius:50%;background:#ccd5e1;cursor:pointer}.dot.active{background:#1a6cff;transform:scale(1.25)}.field{margin-top:16px}.field:first-child{margin-top:0}.field>label,.section-label{display:block;font-size:13px;font-weight:850;margin-bottom:7px}.field small,.help{display:block;color:var(--muted);font-size:11.5px;line-height:1.45;margin-top:6px}textarea,select{width:100%;border:1px solid #ccd6e3;border-radius:12px;background:#fff;padding:11px 12px;font:inherit;color:var(--ink);outline:none}textarea:focus,select:focus{border-color:#7ca7ff;box-shadow:0 0 0 3px rgba(23,105,255,.09)}textarea{min-height:132px;resize:vertical}.section-box{margin-top:17px;padding-top:16px;border-top:1px solid #e9eef5}.checks{display:grid;gap:9px}.check{display:flex;align-items:flex-start;gap:10px;padding:11px 12px;border:1px solid #e1e7ef;border-radius:12px;background:#fff;cursor:pointer}.check input{margin-top:3px}.check strong,.check small{display:block}.check strong{font-size:13px}.check small{font-size:11.5px;color:var(--muted);line-height:1.4;margin-top:2px}.check.disabled{opacity:.55;background:#f7f8fa;cursor:not-allowed}.commercial-options{display:none;margin-top:9px;gap:8px}.commercial.is-on .commercial-options{display:grid}.consent{margin-top:17px;padding:13px;border:1px solid #d9e4f3;background:#f6f9fd;border-radius:14px}.actions{display:flex;align-items:center;gap:12px;margin-top:18px}.submit{flex:1;min-height:50px;border:0;border-radius:13px;background:linear-gradient(90deg,#132033,#1769ff);color:#fff;font:inherit;font-weight:900;cursor:pointer;box-shadow:0 10px 24px rgba(23,105,255,.18)}.submit:disabled{opacity:.45;cursor:not-allowed}.next-card{margin-top:16px;display:flex;gap:10px;padding:12px 13px;border-radius:13px;background:#f8fafc;border:1px solid #e5ebf3}.next-card strong,.next-card span{display:block}.next-card strong{font-size:12px}.next-card span{font-size:11.5px;color:var(--muted);margin-top:2px;line-height:1.4}.foot{margin:14px 0 0;text-align:center;color:#8491a4;font-size:11px}.translation-note{display:inline-flex;margin-top:12px;padding:6px 9px;border-radius:999px;background:#f2f6fb;color:#6b7890;font-size:10.5px}@media(max-width:900px){.fake-sidebar{display:none}.app-backdrop{grid-template-columns:1fr}.modal-head{grid-template-columns:1fr}.creator{min-width:0}.layout{grid-template-columns:1fr}.single-preview,.carousel-stage{height:min(74vw,500px)}}@media(max-width:600px){.modal-wrap{padding:10px}.modal{border-radius:20px}.modal-head,.body{padding:20px}.modal h1{font-size:27px}.panel{padding:14px}.single-preview,.carousel-stage{height:78vw}.brandline{margin-bottom:12px}.creator{width:100%}}
</style></head><body>
<div class="app-backdrop" aria-hidden="true"><aside class="fake-sidebar"><div class="fake-logo"></div><div class="fake-nav"><i></i><i></i><i></i><i></i><i></i></div></aside><div class="fake-main"><div class="fake-top"></div><div class="fake-grid"><div class="fake-card"></div><div class="fake-card"></div><div class="fake-card"></div><div class="fake-card"></div><div class="fake-card"></div></div></div></div><div class="veil"></div>
<main class="modal-wrap"><section class="modal"><header class="modal-head"><div><div class="brandline"><img src="${escapeTikTokHtml(logoUrl)}" alt="Spreelo"><span class="platform-chip">TikTok</span></div><p class="eyebrow">${escapeTikTokHtml(tr("approvePages.tiktok.eyebrow"))}</p><h1>${escapeTikTokHtml(tr("approvePages.tiktok.title"))}</h1><p class="intro">${escapeTikTokHtml(tr("approvePages.tiktok.intro"))}</p><span class="translation-note">${escapeTikTokHtml(tr("approvePages.tiktok.translationReady"))}</span></div><div class="creator">${creatorInfo?.creator_avatar_url ? `<img src="${escapeTikTokHtml(creatorInfo.creator_avatar_url)}" alt="">` : ""}<div><span>${escapeTikTokHtml(tr("approvePages.tiktok.connectedAccount"))}</span><strong>${escapeTikTokHtml(creatorInfo?.creator_nickname || post?.tiktok_account_name || "TikTok")}</strong><span>@${escapeTikTokHtml(String(creatorInfo?.creator_username || "").replace(/^@/, ""))}</span></div></div></header>
<div class="body">${modeNotice}<div class="layout"><section class="panel"><div class="panel-title"><div><h2>${escapeTikTokHtml(tr("approvePages.tiktok.previewTitle"))}</h2><p>${escapeTikTokHtml(tr("approvePages.tiktok.previewHelp"))}</p></div></div>${media}</section>
<section class="panel"><div class="panel-title"><div><h2>${escapeTikTokHtml(tr("approvePages.tiktok.settingsTitle"))}</h2><p>${escapeTikTokHtml(tr("approvePages.tiktok.settingsHelp"))}</p></div></div><form method="post" action="/api/approve-post"><input type="hidden" name="token" value="${escapeTikTokHtml(token)}"><input type="hidden" name="tiktok" value="1">
<div class="field"><label for="title">${escapeTikTokHtml(tr("approvePages.tiktok.caption"))}</label><textarea id="title" name="title" maxlength="${titleMax}">${escapeTikTokHtml(post.content || "")}</textarea><small>${escapeTikTokHtml(tr("approvePages.tiktok.captionHelp"))}</small></div>
<div class="section-box"><div class="field"><label for="privacy">${escapeTikTokHtml(tr("approvePages.tiktok.visibility"))}</label><select id="privacy" name="privacy_level" required><option value="">${escapeTikTokHtml(tr("approvePages.tiktok.visibilityPlaceholder"))}</option>${options}</select><small>${escapeTikTokHtml(tr("approvePages.tiktok.visibilityHelp"))}</small></div></div>
<div class="section-box"><span class="section-label">${escapeTikTokHtml(tr("approvePages.tiktok.interactions"))}</span><div class="checks"><label class="check ${creatorInfo?.comment_disabled ? "disabled" : ""}"><input type="checkbox" name="allow_comment" value="1" ${creatorInfo?.comment_disabled ? "disabled" : ""}><span><strong>${escapeTikTokHtml(tr("approvePages.tiktok.allowComments"))}</strong><small>${escapeTikTokHtml(tr(creatorInfo?.comment_disabled ? "approvePages.tiktok.disabledByAccount" : "approvePages.tiktok.offUntilChosen"))}</small></span></label>${isVideo ? `<label class="check ${creatorInfo?.duet_disabled ? "disabled" : ""}"><input type="checkbox" name="allow_duet" value="1" ${creatorInfo?.duet_disabled ? "disabled" : ""}><span><strong>${escapeTikTokHtml(tr("approvePages.tiktok.allowDuet"))}</strong><small>${escapeTikTokHtml(tr(creatorInfo?.duet_disabled ? "approvePages.tiktok.disabledByAccount" : "approvePages.tiktok.offUntilChosen"))}</small></span></label><label class="check ${creatorInfo?.stitch_disabled ? "disabled" : ""}"><input type="checkbox" name="allow_stitch" value="1" ${creatorInfo?.stitch_disabled ? "disabled" : ""}><span><strong>${escapeTikTokHtml(tr("approvePages.tiktok.allowStitch"))}</strong><small>${escapeTikTokHtml(tr(creatorInfo?.stitch_disabled ? "approvePages.tiktok.disabledByAccount" : "approvePages.tiktok.offUntilChosen"))}</small></span></label>` : ""}</div></div>
<div id="commercialBox" class="section-box commercial"><span class="section-label">${escapeTikTokHtml(tr("approvePages.tiktok.commercialTitle"))}</span><label class="check"><input id="commercialToggle" type="checkbox" name="commercial_content" value="1"><span><strong>${escapeTikTokHtml(tr("approvePages.tiktok.commercialToggle"))}</strong><small>${escapeTikTokHtml(tr("approvePages.tiktok.commercialHelp"))}</small></span></label><div class="commercial-options"><label class="check"><input type="checkbox" name="brand_organic" value="1"><span><strong>${escapeTikTokHtml(tr("approvePages.tiktok.yourBrand"))}</strong><small>${escapeTikTokHtml(tr("approvePages.tiktok.yourBrandHelp"))}</small></span></label><label class="check"><input type="checkbox" name="brand_content" value="1"><span><strong>${escapeTikTokHtml(tr("approvePages.tiktok.brandedContent"))}</strong><small>${escapeTikTokHtml(tr("approvePages.tiktok.brandedContentHelp"))}</small></span></label></div></div>
<div class="consent"><span class="section-label">${escapeTikTokHtml(tr("approvePages.tiktok.consentTitle"))}</span><label class="check"><input type="checkbox" name="tiktok_consent" value="1" required><span><strong>${escapeTikTokHtml(tr("approvePages.tiktok.consent"))}</strong><small>${escapeTikTokHtml(tr("approvePages.tiktok.consentHelp"))}</small></span></label></div><div class="actions"><button class="submit" type="submit" ${canSubmit ? "" : "disabled"}>${escapeTikTokHtml(tr("approvePages.tiktok.submit"))}</button></div></form><div class="next-card"><span>→</span><div><strong>${escapeTikTokHtml(tr("approvePages.tiktok.nextTitle"))}</strong><span>${escapeTikTokHtml(tr("approvePages.tiktok.nextHelp"))}</span></div></div><p class="foot">${escapeTikTokHtml(tr("approvePages.tiktok.foot"))}</p></section></div></div></section></main>
<script>
const commercialToggle=document.getElementById('commercialToggle');const commercialBox=document.getElementById('commercialBox');commercialToggle?.addEventListener('change',()=>commercialBox.classList.toggle('is-on',commercialToggle.checked));
const slides=[...document.querySelectorAll('.carousel-slide')];const dots=[...document.querySelectorAll('.dot')];const counter=document.getElementById('carouselCounter');let slideIndex=0;const counterTemplate=${JSON.stringify(tr("approvePages.tiktok.slideCounter", { index: "__INDEX__", count: "__COUNT__" }))};function showSlide(next){if(!slides.length)return;slideIndex=(next+slides.length)%slides.length;slides.forEach((el,i)=>el.classList.toggle('active',i===slideIndex));dots.forEach((el,i)=>el.classList.toggle('active',i===slideIndex));if(counter)counter.textContent=counterTemplate.replace('__INDEX__',String(slideIndex+1)).replace('__COUNT__',String(slides.length));}document.getElementById('carouselPrev')?.addEventListener('click',()=>showSlide(slideIndex-1));document.getElementById('carouselNext')?.addEventListener('click',()=>showSlide(slideIndex+1));dots.forEach((el,i)=>el.addEventListener('click',()=>showSlide(i)));
</script></body></html>`;
}

function htmlResponse({ title, message, status = "success", httpStatus = 200, t, locale }) {
  return new Response(
    createHtmlPage({
      title,
      message,
      status,
      t,
      locale,
    }),
    {
      status: httpStatus,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}

export async function GET(request) {
  const requestLocale = resolveBestServerLocale({ request });
  let translator = createFallbackTranslator();

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      translator = await getApproveTranslations({ locale: requestLocale });

      return htmlResponse({
        title: translator.t("approvePages.configurationError.title"),
        message: translator.t("approvePages.configurationError.message"),
        status: "error",
        httpStatus: 500,
        t: translator.t,
        locale: translator.locale,
      });
    }

    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (!token) {
      translator = await getApproveTranslations({
        supabase,
        locale: requestLocale,
      });

      return htmlResponse({
        title: translator.t("approvePages.invalidLink.title"),
        message: translator.t("approvePages.invalidLink.message"),
        status: "error",
        httpStatus: 400,
        t: translator.t,
        locale: translator.locale,
      });
    }

    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id, user_id, status, approval_token, language, brand_profile_id, content_format, platform, content, image_url, video_url, platform_publish_settings")
      .eq("approval_token", token)
      .single();

    let brandProfile = null;

    if (post?.brand_profile_id) {
      const { data: loadedBrandProfile } = await supabase
        .from("brand_profiles")
        .select("id, content_language")
        .eq("id", post.brand_profile_id)
        .maybeSingle();

      brandProfile = loadedBrandProfile || null;
    }

    const userAppLanguage = await getUserAppLanguage(supabase, post?.user_id);
    const postLocale = resolveApprovalPageLocale({
      request,
      url,
      post,
      brandProfile,
      userAppLanguage,
    });

    translator = await getApproveTranslations({
      supabase,
      locale: postLocale,
    });

    if (postError || !post) {
      return htmlResponse({
        title: translator.t("approvePages.notFound.title"),
        message: translator.t("approvePages.notFound.message"),
        status: "error",
        httpStatus: 404,
        t: translator.t,
        locale: translator.locale,
      });
    }

    if (post.status === "approved") {
      return htmlResponse({
        title: translator.t("approvePages.alreadyApproved.title"),
        message: translator.t("approvePages.alreadyApproved.message"),
        status: "success",
        httpStatus: 200,
        t: translator.t,
        locale: translator.locale,
      });
    }

    if (post.status !== "pending_approval") {
      return htmlResponse({
        title: translator.t("approvePages.cannotApprove.title"),
        message: translator.t("approvePages.cannotApprove.message", {
          status: post.status,
        }),
        status: "error",
        httpStatus: 409,
        t: translator.t,
        locale: translator.locale,
      });
    }



    if (isTikTokTarget(post.platform)) {
      try {
        const { creatorInfo } = await getTikTokApprovalContext({ supabase, post });
        const { publicPostingReady, allowPrivateTesting } = getTikTokEnv();
        let carouselSlides = [];
        if (String(post.content_format || "") === "carousel") {
          const { data: loadedSlides, error: slidesError } = await supabase
            .from("post_slides")
            .select("slide_order, image_url, metadata")
            .eq("post_id", post.id)
            .order("slide_order", { ascending: true });
          if (slidesError) throw slidesError;
          carouselSlides = loadedSlides || [];
        }
        return new Response(
          createTikTokApprovalHtml({
            post,
            token,
            creatorInfo,
            carouselSlides,
            locale: translator.locale,
            publicPostingReady,
            allowPrivateTesting,
            t: translator.t,
          }),
          { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      } catch (tiktokError) {
        return htmlResponse({
          title: translator.t("approvePages.tiktok.connectionTitle"),
          message: tiktokError.message || translator.t("approvePages.tiktok.connectionMessage"),
          status: "error",
          httpStatus: tiktokError?.requiresReconnect ? 409 : 502,
          t: translator.t,
          locale: translator.locale,
        });
      }
    }

    const isCarouselPost = post.content_format === "carousel";
    const approvedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("posts")
      .update({
        status: "approved",
        approved_at: approvedAt,
        updated_at: approvedAt,
      })
      .eq("id", post.id);

    if (updateError) {
      return htmlResponse({
        title: translator.t("approvePages.failed.title"),
        message: translator.t("approvePages.failed.message"),
        status: "error",
        httpStatus: 500,
        t: translator.t,
        locale: translator.locale,
      });
    }

    await supabase.from("admin_review_cases").update({
      status: "customer_approved",
      needs_review: false,
      updated_at: approvedAt,
    }).eq("post_id", post.id);

    return htmlResponse({
      title: translator.t(isCarouselPost ? "approvePages.carouselApprovedV2.title" : "approvePages.approved.title"),
      message: translator.t(isCarouselPost ? "approvePages.carouselApprovedV2.message" : "approvePages.approved.message"),
      status: "success",
      httpStatus: 200,
      t: translator.t,
      locale: translator.locale,
    });
  } catch (error) {
    return htmlResponse({
      title: translator.t("approvePages.unexpected.title"),
      message: error.message || translator.t("approvePages.unexpected.message"),
      status: "error",
      httpStatus: 500,
      t: translator.t,
      locale: translator.locale,
    });
  }
}


export async function POST(request) {
  let translator = createFallbackTranslator();
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Spreelo approval configuration is incomplete");
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const form = await request.formData();
    const token = String(form.get("token") || "").trim();
    if (!token) throw new Error("Approval token is missing");

    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id, user_id, brand_profile_id, status, approval_token, language, content_format, platform, content, image_url, video_url, platform_publish_settings")
      .eq("approval_token", token)
      .single();
    if (postError || !post) throw new Error("This approval link is no longer valid");
    translator = await getApproveTranslations({ supabase, locale: post.language || "en" });
    if (!isTikTokTarget(post.platform)) throw new Error("This approval form is only for TikTok posts");
    if (post.status === "approved") {
      return htmlResponse({ title: translator.t("approvePages.alreadyApproved.title"), message: translator.t("approvePages.alreadyApproved.message"), status: "success", t: translator.t, locale: translator.locale });
    }
    if (post.status !== "pending_approval") throw new Error(`This post cannot be approved while its status is ${post.status}`);

    const { creatorInfo } = await getTikTokApprovalContext({ supabase, post });
    const privacyLevel = String(form.get("privacy_level") || "").trim();
    const availablePrivacy = Array.isArray(creatorInfo?.privacy_level_options) ? creatorInfo.privacy_level_options : [];
    if (!privacyLevel || !availablePrivacy.includes(privacyLevel)) throw new Error("Choose one of the visibility options currently allowed by your TikTok account");

    const { publicPostingReady, allowPrivateTesting } = getTikTokEnv();
    if (!publicPostingReady) {
      if (!allowPrivateTesting) throw new Error("TikTok public publishing is not enabled yet. Spreelo must complete TikTok's Content Posting API audit first.");
      if (privacyLevel !== "SELF_ONLY") throw new Error("TikTok test mode can only publish privately until Spreelo's TikTok API client has passed audit.");
    }

    const isVideo = Boolean(post.video_url) || String(post.content_format || "") === "animated_video";
    const allowComment = form.get("allow_comment") === "1" && !creatorInfo?.comment_disabled;
    const allowDuet = isVideo && form.get("allow_duet") === "1" && !creatorInfo?.duet_disabled;
    const allowStitch = isVideo && form.get("allow_stitch") === "1" && !creatorInfo?.stitch_disabled;
    const commercialContent = form.get("commercial_content") === "1";
    const brandOrganic = commercialContent && form.get("brand_organic") === "1";
    const brandContent = commercialContent && form.get("brand_content") === "1";
    if (commercialContent && !brandOrganic && !brandContent) throw new Error("Choose Your brand, Branded content, or both for TikTok's commercial-content disclosure");
    if (brandContent && privacyLevel === "SELF_ONLY") throw new Error("TikTok does not allow Branded content to use private visibility");
    if (form.get("tiktok_consent") !== "1") throw new Error("TikTok publishing requires your explicit upload consent");

    const titleLimit = isVideo ? 2200 : 4000;
    let title = String(form.get("title") || post.content || "").slice(0, titleLimit);
    if (/[\uD800-\uDBFF]$/.test(title)) title = title.slice(0, -1);
    const currentSettings = post.platform_publish_settings && typeof post.platform_publish_settings === "object"
      ? post.platform_publish_settings
      : {};
    const approvedAt = new Date().toISOString();
    const platformPublishSettings = {
      ...currentSettings,
      tiktok: {
        ...((currentSettings?.tiktok && typeof currentSettings.tiktok === "object") ? currentSettings.tiktok : {}),
        title,
        privacy_level: privacyLevel,
        disable_comment: !allowComment,
        disable_duet: isVideo ? !allowDuet : undefined,
        disable_stitch: isVideo ? !allowStitch : undefined,
        brand_content_toggle: Boolean(brandContent),
        brand_organic_toggle: Boolean(brandOrganic),
        is_aigc: isVideo ? true : undefined,
        creator_nickname: creatorInfo?.creator_nickname || null,
        creator_username: creatorInfo?.creator_username || null,
        approved_at: approvedAt,
        explicit_consent: true,
      },
    };

    const { error: updateError } = await supabase
      .from("posts")
      .update({
        status: "approved",
        approved_at: approvedAt,
        platform_publish_settings: platformPublishSettings,
        updated_at: approvedAt,
      })
      .eq("id", post.id);
    if (updateError) throw updateError;

    await supabase.from("admin_review_cases").update({ status: "customer_approved", needs_review: false, updated_at: approvedAt }).eq("post_id", post.id);
    return htmlResponse({
      title: translator.t("approvePages.tiktok.approvedTitle"),
      message: translator.t("approvePages.tiktok.approvedMessage"),
      status: "success",
      t: translator.t,
      locale: translator.locale,
    });
  } catch (error) {
    return htmlResponse({
      title: translator.t("approvePages.tiktok.failedTitle"),
      message: error.message || translator.t("approvePages.tiktok.failedMessage"),
      status: "error",
      httpStatus: 400,
      t: translator.t,
      locale: translator.locale,
    });
  }
}
