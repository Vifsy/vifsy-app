import fs from 'node:fs';
import assert from 'node:assert/strict';

const preview = fs.readFileSync('app/api/preview-post/route.js', 'utf8');
const youtube = fs.readFileSync('lib/youtubeOAuth.js', 'utf8');
const worker = fs.readFileSync('app/api/cron/run-automations/route.js', 'utf8');
const social = fs.readFileSync('app/social-channels/page.jsx', 'utf8');
const sql = fs.readFileSync('supabase/v143_104_youtube_audience.sql', 'utf8');

assert.match(youtube, /selfDeclaredMadeForKids:\s*Boolean\(madeForKids\)/);
assert.match(worker, /youtube_made_for_kids/);
assert.match(worker, /madeForKids:\s*Boolean\(youtubeConnectionForPost\.youtube_made_for_kids\)/);
assert.match(social, /youtubeAudienceTitle/);
assert.match(social, /youtube_made_for_kids/);
assert.match(sql, /youtube_made_for_kids boolean not null default false/);

assert.match(preview, /\/brand\/spreelologo\.png/);
assert.match(preview, /autoplay muted loop playsinline controls/);
assert.doesNotMatch(preview, /class="autoplay-hint"/);
assert.doesNotMatch(preview, /class="avatar"/);
assert.doesNotMatch(preview, /openFeedback\('changes'\)/);
assert.doesNotMatch(preview, /class="action-card change"/);
assert.match(preview, /class="reject-link"/);
assert.match(preview, /width:min\(100%,430px\)/);
assert.match(preview, /margin:0 auto/);
assert.match(preview, /overflow:hidden/);

console.log('v143.104 YouTube audience + approval preview polish regression checks passed');
