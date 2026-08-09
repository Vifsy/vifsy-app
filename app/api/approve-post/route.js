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
      .select("id, user_id, status, approval_token, language, brand_profile_id, content_format")
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
