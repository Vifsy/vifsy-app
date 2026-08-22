import assert from "node:assert/strict";
import fs from "node:fs";

const approve = fs.readFileSync("app/api/approve-post/route.js", "utf8");
const cron = fs.readFileSync("app/api/cron/run-automations/route.js", "utf8");
const labels = fs.readFileSync("lib/i18n/defaultLabels.js", "utf8");

// Shared premium approval design across preview, TikTok step and confirmation pages.
assert(approve.includes("function getApprovalExperienceCss"), "Shared approval design system missing");
assert(approve.includes("function getApprovalStepperHtml"), "Shared approval stepper missing");
assert(approve.includes("function getApprovalPlatformChipsHtml"), "Shared platform chips missing");
assert(approve.includes("sp-btn-primary"), "Premium approval primary CTA style missing");
assert(approve.includes("sp-success-card"), "Confirmation page is not using the shared premium design");
assert(approve.includes("sp-tiktok-grid"), "TikTok approval page is not using the shared premium design");
assert(approve.includes("sp-preview-meta"), "General preview does not include the reference-style media details");

// UI strings are English source labels and all approval forms preserve the UI locale.
assert(labels.includes('"approvePages.preview.titleV2": "Your post is ready ✨"'), "English preview source label missing");
assert(labels.includes('"approvePages.tiktok.subtitleV2": "Choose the required TikTok settings before publishing."'), "English TikTok source label missing");
assert(labels.includes('"approvePages.experience.stepCreated": "Created"'), "Approval step translation anchor missing");
assert((approve.match(/name="ui_locale"/g) || []).length >= 2, "Approval forms do not preserve UI locale");
assert(approve.includes('const requestedUiLocale = resolveUiLocaleFromLanguageName(form.get("ui_locale"))'), "POST does not restore approval UI locale");
assert(approve.includes("getUserAppLanguage(supabase, post.user_id)"), "Approval POST does not fall back to Spreelo app language");
assert(!/\b(?:Godkänn|Granska|Publicera|Skapad|Inlägg|Målgrupp|Omgående)\b/.test(approve), "Non-English hardcoded approval UI text remains");

// TikTok video cover: always submit a deliberate cover frame instead of relying on frame zero.
assert(cron.includes("const TIKTOK_VIDEO_COVER_TIMESTAMP_MS = 1000"), "TikTok cover default missing");
assert(cron.includes("video_cover_timestamp_ms: videoCoverTimestampMs"), "TikTok video cover field missing from post_info");
assert(approve.includes("video_cover_timestamp_ms: isVideo ? 1000 : undefined"), "TikTok approval settings do not persist cover timestamp");
assert(cron.includes("TikTok publish: video payload prepared"), "TikTok video cover diagnostics missing");

// Cross-format product variety: broad family/package history now influences single-product ranking.
assert(cron.includes("function getProductDiversityProfile"), "Product diversity classifier missing");
assert(cron.includes("function scoreProductDiversityAgainstRecentHistory"), "Product diversity history scoring missing");
assert(cron.includes("hasMeaningfullyDiverseProductCandidate"), "Store Map diversity continuation missing");
assert(cron.includes("Store Map Product Agent continuing to another shelf for cross-format variety"), "Store Map does not continue beyond repetitive shelf candidates");
assert(cron.includes("recentUsedItems,\n        usedWebsiteImageUrlsThisRun"), "Single-product Store Map does not receive recent cross-format history");
assert(cron.includes("excludeProductUrls: recentProductUrls"), "Focused Store Map discovery does not exclude recent exact products");

// Exact product identity: named volume/weight/pack mismatches are hard variant conflicts.
assert(cron.includes("volume|capacity|pack(?:age)? size|pack count|quantity|count"), "Size/volume/quantity hard-variant guard missing");
assert(cron.includes("591 ml shown for a locked 473 ml product"), "Identity verifier prompt does not explicitly reject volume conflicts");

console.log("v144.06 premium approval + i18n + cross-format variety + TikTok cover checks passed");
