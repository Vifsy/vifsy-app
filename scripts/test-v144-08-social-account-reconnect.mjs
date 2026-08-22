import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const tiktok = read("lib/tiktokOAuth.js");
const youtube = read("lib/youtubeOAuth.js");

function functionBody(source, exportName, nextExportName) {
  const start = source.indexOf(`export async function ${exportName}`);
  assert.notEqual(start, -1, `${exportName} must exist`);
  const end = nextExportName
    ? source.indexOf(`export async function ${nextExportName}`, start + 1)
    : source.length;
  assert.notEqual(end, -1, `Could not find end of ${exportName}`);
  return source.slice(start, end);
}

const tiktokSave = functionBody(tiktok, "saveTikTokConnection", "getHealthyTikTokAccessToken");
const youtubeSave = functionBody(youtube, "saveYouTubeConnection", "getHealthyYouTubeAccessToken");

// Force an explicit TikTok authorization step so a stale browser session cannot silently
// select the previously connected account for a different Spreelo brand.
assert.match(tiktok, /disable_auto_auth:\s*"1"/);
assert.doesNotMatch(tiktok, /disable_auto_auth:\s*"0"/);

// Force Google's account chooser while retaining explicit consent/offline refresh-token behavior.
assert.match(youtube, /access_type:\s*"offline"/);
assert.match(youtube, /prompt:\s*"consent select_account"/);

for (const [name, body, platform] of [
  ["TikTok", tiktokSave, "tiktok"],
  ["YouTube", youtubeSave, "youtube"],
]) {
  assert.match(body, new RegExp(`\\.eq\\(\\"platform\\", \\"${platform}\\"\\)`));
  assert.match(body, /\.eq\("page_id", pageId\)/);
  assert.match(body, /const existingExternal = await findExternalConnection\(\);/);
  assert.match(body, /status: "disconnected"/);
  assert.match(body, /String\(inserted\.error\?\.code \|\| ""\) === "23505"/);

  const findStart = body.indexOf("const findExternalConnection");
  const existingStart = body.indexOf("const existingExternal = await findExternalConnection();");
  const disconnectStart = body.indexOf("const { error: disconnectBrandError }");
  assert.ok(findStart >= 0 && existingStart > findStart, `${name} must look up the external account`);
  assert.ok(disconnectStart > existingStart, `${name} must not disconnect the current brand before the external-account lookup succeeds`);

  const finder = body.slice(findStart, existingStart);
  assert.doesNotMatch(
    finder,
    /\.eq\("brand_profile_id", brandProfileId\)/,
    `${name} external-account lookup must be brand-independent`
  );
}

// YouTube must preserve a refresh token stored on the same external channel row when
// Google omits a new refresh token during a reconnect.
assert.match(youtubeSave, /refreshToken \|\| existingExternal\?\.refresh_token \|\| null/);

console.log("v144.08 social account reconnect regression checks passed");
