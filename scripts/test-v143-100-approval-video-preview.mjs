import fs from 'node:fs';
import assert from 'node:assert/strict';

const cron = fs.readFileSync(new URL('../app/api/cron/run-automations/route.js', import.meta.url), 'utf8');
const preview = fs.readFileSync(new URL('../app/api/preview-post/route.js', import.meta.url), 'utf8');
const poster = fs.readFileSync(new URL('../app/api/preview-poster/route.js', import.meta.url), 'utf8');
const approve = fs.readFileSync(new URL('../app/api/approve-post/route.js', import.meta.url), 'utf8');
const reject = fs.readFileSync(new URL('../app/api/reject-post/route.js', import.meta.url), 'utf8');

assert.match(cron, /api\/preview-post\?token=/, 'approval email should link animated videos to preview page');
assert.match(cron, /api\/preview-poster\?token=/, 'approval email should use play-overlay poster endpoint');
assert.match(cron, /Förhandsgranska & godkänn/, 'Swedish preview CTA should be present');
assert.match(preview, /<video id="spreelo-video"/, 'preview should render the final video');
assert.match(preview, /autoplay muted playsinline controls/, 'preview video should autoplay muted and expose controls');
assert.match(preview, /Godkänn & publicera/, 'preview should include professional approval CTA');
assert.match(preview, /Begär ändring/, 'preview should include request-changes flow');
assert.match(preview, /Avvisa inlägg/, 'preview should include reject flow');
assert.match(preview, /method="post" action="\/api\/approve-post"/, 'approval action should use POST from preview');
assert.match(preview, /method="post" action="\/api\/reject-post"/, 'feedback action should submit from preview');
assert.match(poster, /sharp/, 'email preview poster should be generated with sharp');
assert.match(poster, /<circle/, 'play overlay should include a play circle');
assert.match(approve, /export async function POST\(request\)/, 'approve route should accept POST');
assert.match(reject, /decision_type/, 'reject route should distinguish changes from full rejection');

console.log('v143.100 approval video preview regression checks passed');
