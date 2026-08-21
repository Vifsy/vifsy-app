import assert from "node:assert/strict";
import fs from "node:fs";

const approve = fs.readFileSync("app/api/approve-post/route.js", "utf8");
const publish = fs.readFileSync("app/api/cron/run-automations/route.js", "utf8");

assert(approve.includes("function hasTikTokExplicitApproval"), "TikTok approval state helper missing");
assert(approve.includes("tikTokApprovalMissing"), "TikTok missing-approval recovery gate missing");
assert(approve.includes('post.status === "approved" && tikTokApprovalMissing') || approve.includes('renderTikTokApprovalResponse'), "GET cannot resume missing TikTok approval");
assert(approve.includes('repairableTikTokApproval = !alreadyHasTikTokApproval && ["approved", "failed"].includes(post.status)'), "POST cannot repair already-approved/failed TikTok posts");
assert(approve.includes("publish_locked_until: null"), "TikTok reapproval does not clear publish lock");
assert(approve.includes("next_publish_attempt_at: null"), "TikTok reapproval does not wake publisher immediately");
assert(approve.includes("last_publish_error: null"), "TikTok reapproval does not clear previous failure");
assert(approve.includes('console.log("Approval link opened"'), "Approval diagnostics missing");

const publisherStart = publish.indexOf("async function publishApprovedSocialPosts");
const threadsDone = publish.indexOf("summary.threads_published += 1;", publisherStart);
const youtube = publish.indexOf('if (targets.includes("youtube"))', threadsDone);
const tiktok = publish.indexOf('if (targets.includes("tiktok"))', threadsDone);
assert(threadsDone > publisherStart && youtube > threadsDone && tiktok > youtube, "YouTube must publish before TikTok so TikTok failures cannot block Shorts");

assert(publish.includes('if (activePublishTarget === "youtube") summary.youtube_publish_failed += 1;'), "YouTube failure counter must only count active target");
assert(publish.includes('if (activePublishTarget === "tiktok") summary.tiktok_publish_failed += 1;'), "TikTok failure counter must only count active target");
assert(!publish.includes('if (targets.includes("youtube")) {\n        summary.youtube_publish_failed += 1;\n      }'), "Legacy all-target YouTube failure counting still present");

console.log("v144.04 TikTok approval recovery + YouTube isolation checks passed");
