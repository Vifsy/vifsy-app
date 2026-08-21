import assert from "node:assert/strict";
import fs from "node:fs";

const approve = fs.readFileSync("app/api/approve-post/route.js", "utf8");
const cron = fs.readFileSync("app/api/cron/run-automations/route.js", "utf8");
const labels = fs.readFileSync("lib/i18n/defaultLabels.js", "utf8");

// Email preview/play path and public review modal.
assert(cron.includes("preview=1"), "Approval email preview URL is missing");
assert(cron.includes("isAnimatedVideoPreview"), "Animated approval email play overlay is missing");
assert(approve.includes("function createGeneralApprovalPreviewHtml"), "General public approval preview is missing");
assert(approve.includes('name="general_approval" value="1"'), "Preview approval form does not converge on general approval flow");
assert(approve.includes('const previewRequested = url.searchParams.get("preview") === "1"'), "Preview-only GET path is missing");

// General approval must happen before TikTok's separate required consent.
const markApproval = approve.indexOf("const approvedAt = await markGeneralPostApproved({ supabase, post });");
const renderTikTok = approve.indexOf("return await renderTikTokApprovalResponse", markApproval);
assert(markApproval > 0 && renderTikTok > markApproval, "Direct approval must release ordinary channels before TikTok settings");
assert(approve.includes("publish_locked_until: null"), "General approval must clear publisher lock");
assert(approve.includes("next_publish_attempt_at: null"), "General/TikTok approval must wake publisher");
assert(!approve.includes("const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;\n    const serviceRoleKey"), "Duplicate serviceRoleKey declaration remains");

// TikTok must be last and absence of explicit consent is a wait state, not an error.
const publisher = cron.indexOf("async function publishApprovedSocialPosts");
const youtube = cron.indexOf('if (targets.includes("youtube"))', publisher);
const pinterest = cron.indexOf('if (targets.includes("pinterest"))', youtube);
const tiktok = cron.indexOf('if (targets.includes("tiktok"))', pinterest);
const finalize = cron.indexOf("const allDesiredTargetsPublished", publisher);
assert(youtube > publisher && pinterest > youtube && tiktok > pinterest && tiktok < finalize, "TikTok must run after all ordinary destinations");
assert(cron.includes("TikTok publish deferred awaiting customer approval"), "Missing TikTok consent defer state");
assert(cron.includes("awaitingTikTokCustomerApproval = true"), "Publisher does not track TikTok waiting state");
assert(cron.includes("addHoursIso(new Date(nowIso), 24)"), "TikTok waiting posts are still hot-looped every minute");

// Durable research mismatch must recover rather than terminally fail.
assert(!cron.includes('throw new Error(\n      "The saved campaign research does not match this automation occurrence."'), "Legacy terminal fingerprint mismatch remains");
assert(cron.includes("Campaign research fingerprint changed while durable response exists; resuming occurrence-owned response"), "Durable response resume warning missing");
assert(cron.includes("Campaign research fingerprint changed before response start; refreshing durable job"), "Pre-start fingerprint refresh missing");
assert(cron.includes("request_fingerprint: requestFingerprint"), "Durable job fingerprint refresh is not persisted");

assert(labels.includes('"approvePages.preview.title"'), "Preview translation anchors missing");
assert(labels.includes('"emails.approval.previewMedia"'), "Email play-preview translation anchor missing");

console.log("v144.05 approval orchestration + TikTok isolation + durable research recovery checks passed");
