import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const oauth = read("lib/youtubeOAuth.js");
const start = read("app/api/auth/youtube/start/route.js");
const callback = read("app/api/auth/youtube/callback/route.js");
const social = read("app/social-channels/page.jsx");
const complete = read("app/social-channels/oauth-complete/page.jsx");
const publisher = read("app/api/cron/run-automations/route.js");
const compatibility = read("lib/platformContentCompatibility.js");
const vercel = JSON.parse(read("vercel.json"));

assert.match(oauth, /youtube\.upload/);
assert.match(oauth, /youtube\.readonly/);
assert.match(oauth, /access_type:\s*"offline"/);
assert.match(oauth, /prompt:\s*"consent select_account"/);
assert.match(oauth, /refresh_token/);
assert.match(oauth, /uploadType.*resumable/s);
assert.match(oauth, /privacyStatus/);
assert.match(oauth, /96 \* 1024 \* 1024/);

assert.match(start, /platform:\s*"youtube"/);
assert.match(start, /spreelo_youtube_oauth_state/);
assert.match(callback, /fetchYouTubeChannel/);
assert.match(callback, /saveYouTubeConnection/);
assert.match(callback, /connected:\s*"youtube"/);

assert.match(social, /key:\s*"youtube"/);
assert.match(social, /\/api\/auth\/youtube\/start/);
assert.match(social, /social\.youtubeConnectedMessageV2/);
assert.match(complete, /return "youtube"/);

assert.match(publisher, /targets\.includes\("youtube"\)/);
assert.match(publisher, /uploadVideoToYouTube/);
assert.match(publisher, /youtube_publish_checked/);
assert.match(publisher, /youtube_published/);
assert.match(publisher, /target:\s*"youtube"/);

assert.match(compatibility, /youtube:\s*\{/);
assert.match(compatibility, /animated_video:\s*\{\s*mode:\s*"native"\s*\}/);
assert.match(compatibility, /short_video_from_master",\s*spreeloReady:\s*false/);

assert.ok(
  vercel.crons.some((cron) => cron.path === "/api/cron/refresh-youtube-tokens"),
  "YouTube token refresh cron must be configured"
);

const threadsMigration = read("supabase/v143_93_threads_oauth.sql");
assert.match(threadsMigration, /'youtube'/, "Existing social_connections constraint must already allow YouTube");

console.log("v143.98 YouTube Shorts integration regression checks passed");
