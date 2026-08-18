import fs from "node:fs";
import assert from "node:assert/strict";

const oauth = fs.readFileSync(new URL("../lib/youtubeOAuth.js", import.meta.url), "utf8");

const start = oauth.indexOf("export async function saveYouTubeConnection");
const end = oauth.indexOf("export async function getHealthyYouTubeAccessToken", start);
assert.ok(start >= 0 && end > start, "saveYouTubeConnection must exist");
const save = oauth.slice(start, end);

assert.match(save, /\.eq\("user_id", userId\)[\s\S]*?\.eq\("platform", "youtube"\)[\s\S]*?\.eq\("page_id", channelId\)[\s\S]*?\.maybeSingle\(\)/,
  "YouTube must identify an existing connection by user + platform + channel id");
assert.doesNotMatch(save.slice(0, save.indexOf(".eq(\"page_id\", channelId)")), /\.eq\("brand_profile_id", brandProfileId\)/,
  "Existing-channel lookup must not be limited to the current brand");
assert.match(save, /\.update\(\{ status: "disconnected", updated_at: nowIso \}\)[\s\S]*?\.eq\("user_id", userId\)[\s\S]*?\.eq\("brand_profile_id", brandProfileId\)[\s\S]*?\.eq\("platform", "youtube"\)/,
  "The target brand's previous YouTube connection must be disconnected first");
assert.match(save, /if \(existing\?\.id\)[\s\S]*?\.update\(payload\)[\s\S]*?\.eq\("id", existing\.id\)/,
  "An existing YouTube channel row must be updated/moved rather than inserted again");
assert.match(save, /brand_profile_id: brandProfileId/,
  "The existing YouTube row must be moved to the newly selected brand");
assert.match(save, /refreshToken \|\| existing\?\.refresh_token/,
  "Reconnects must preserve the durable refresh token when Google does not rotate it");

console.log("v143.102 YouTube brand handoff regression checks passed");
