import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`v144.02 regression failed: ${message}`);
};

const social = read("app/social-channels/page.jsx");
const complete = read("app/social-channels/oauth-complete/page.jsx");
const oauth = read("lib/tiktokOAuth.js");
const start = read("app/api/auth/tiktok/start/route.js");
const callback = read("app/api/auth/tiktok/callback/route.js");
const approve = read("app/api/approve-post/route.js");
const publisher = read("app/api/cron/run-automations/route.js");
const refresh = read("app/api/cron/refresh-tiktok-tokens/route.js");
const media = read("app/api/tiktok/media/route.js");
const compat = read("lib/platformContentCompatibility.js");
const vercel = read("vercel.json");
const migration = read("supabase/v144_02_tiktok_integration.sql");

// Same connection UX as existing channels.
assert(social.includes('key: "tiktok"'), "TikTok social card is missing");
assert(social.includes('if (platformKey === "tiktok") return "/api/auth/tiktok/start"'), "TikTok is not wired into common connect routing");
assert(social.includes("const width = 620") && social.includes("const height = 760"), "common OAuth popup size changed/missing");
assert(social.includes("startOAuthInPopup"), "common OAuth popup flow missing");
assert(complete.includes("spreelo-social-oauth-result"), "common OAuth popup completion postMessage missing");
assert(complete.includes('return "tiktok"'), "TikTok callback errors are not mapped into common popup result UX");

// Login/token lifecycle.
assert(oauth.includes('TIKTOK_SCOPES = ["user.info.basic", "video.publish"]'), "TikTok required scopes missing");
assert(oauth.includes("https://www.tiktok.com/v2/auth/authorize/"), "TikTok Login Kit authorization endpoint missing");
assert(oauth.includes("/v2/oauth/token/"), "TikTok token endpoint missing");
assert(start.includes("buildTikTokAuthorizationUrl"), "TikTok OAuth start route missing authorization URL build");
assert(callback.includes("exchangeTikTokCode") && callback.includes("saveTikTokConnection"), "TikTok OAuth callback does not persist connection");
assert(refresh.includes("getHealthyTikTokAccessToken"), "TikTok token refresh worker missing");
assert(vercel.includes("/api/cron/refresh-tiktok-tokens"), "TikTok token refresh cron missing from Vercel config");

// Customer approval remains mandatory and TikTok-specific requirements are collected there.
assert(approve.includes("isTikTokTarget(post.platform)"), "TikTok customer approval branch missing");
assert(approve.includes('name="privacy_level" required'), "manual TikTok privacy choice missing");
assert(approve.includes('name="privacy_level" required') && approve.includes('<option value="">'), "TikTok privacy must have no preselected value");
assert(approve.includes('name="tiktok_consent"'), "explicit TikTok upload consent missing");
assert(approve.includes("fetchTikTokCreatorInfo"), "fresh TikTok creator info is not queried during approval");
assert(approve.includes("platform_publish_settings: platformPublishSettings"), "TikTok approved choices are not persisted");
assert(approve.includes("TIKTOK public publishing is not enabled") || approve.includes("TikTok public publishing is not enabled"), "public/audit readiness guard missing from approval");

// Production safety: never silently downgrade intended reach to private.
assert(oauth.includes("TIKTOK_PUBLIC_POSTING_READY"), "public-posting readiness flag missing");
assert(oauth.includes("TIKTOK_ALLOW_PRIVATE_TESTING"), "explicit private-test flag missing");
assert(publisher.includes("Complete TikTok audit before customer publishing"), "publisher audit guard missing");
assert(publisher.includes('privacyLevel !== "SELF_ONLY"'), "private test mode is not constrained to SELF_ONLY");

// Publishing formats and duplicate-safe status reconciliation.
assert(compat.includes("tiktok") && compat.includes("photo_post"), "TikTok format compatibility missing");
assert(publisher.includes('targets.push("tiktok")'), "TikTok not included in publish targets");
assert(publisher.includes('if (targets.includes("tiktok"))'), "TikTok publisher branch missing");
assert(publisher.includes("initTikTokPhotoPost") && publisher.includes("initTikTokVideoPost"), "TikTok photo/video Direct Post calls missing");
assert(publisher.includes("loadCarouselSlidesForPublish"), "TikTok multi-photo carousel media path missing");
assert(publisher.includes("persistTikTokProcessingReceipt"), "TikTok publish id is not durably saved before status reconciliation");
assert(publisher.includes("fetchTikTokPostStatus"), "TikTok publish status fetch missing");
assert(publisher.includes("publicaly_available_post_id"), "TikTok public moderation availability is not verified for public posts");
assert(publisher.includes("tiktokRetryableFailure"), "TikTok retryable pull/internal failures are not handled");
assert(publisher.includes('["processing", "awaiting_public"].includes(existingReceipt?.state)'), "TikTok retries do not reconcile an existing publish id");
assert(publisher.includes('target: "tiktok"'), "TikTok final durable published target receipt missing");

// Verified Spreelo media URL proxy for TikTok PULL_FROM_URL.
assert(oauth.includes("createTikTokMediaProxyUrl"), "signed TikTok media URL helper missing");
assert(media.includes("verifyTikTokMediaProxySignature"), "TikTok media proxy signature verification missing");
assert(media.includes("await assertPublicHttpUrl"), "TikTok media proxy SSRF URL validation missing");
assert(media.includes('redirect: "manual"'), "TikTok media proxy does not validate redirects safely");

// Database support.
assert(migration.includes("platform_publish_settings jsonb"), "TikTok per-post publishing settings column migration missing");
assert(migration.includes("'tiktok'"), "TikTok social_connections platform constraint migration missing");

console.log("v144.02 TikTok integration regression checks passed.");
