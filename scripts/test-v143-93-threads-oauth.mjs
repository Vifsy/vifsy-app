import fs from 'node:fs';

const files = {
  lib: fs.readFileSync('lib/threadsOAuth.js', 'utf8'),
  start: fs.readFileSync('app/api/auth/threads/start/route.js', 'utf8'),
  callback: fs.readFileSync('app/api/auth/threads/callback/route.js', 'utf8'),
  uninstall: fs.readFileSync('app/api/auth/threads/uninstall/route.js', 'utf8'),
  deletion: fs.readFileSync('app/api/auth/threads/delete-data/route.js', 'utf8'),
  status: fs.readFileSync('app/api/auth/threads/delete-data/status/route.js', 'utf8'),
  social: fs.readFileSync('app/social-channels/page.jsx', 'utf8'),
  migration: fs.readFileSync('supabase/v143_93_threads_oauth.sql', 'utf8'),
  vercel: fs.readFileSync('vercel.json', 'utf8'),
  publisher: fs.readFileSync('app/api/cron/run-automations/route.js', 'utf8'),
};

const failures = [];
function check(name, condition) {
  if (!condition) failures.push(name);
  console.log(`${condition ? '✓' : '✗'} ${name}`);
}

check('Threads uses dedicated app env', files.lib.includes('THREADS_APP_ID') && files.lib.includes('THREADS_APP_SECRET'));
check('Threads authorize endpoint is official', files.lib.includes('https://threads.com/oauth/authorize'));
check('Threads token exchange endpoint is official', files.lib.includes('https://graph.threads.com/oauth/access_token'));
check('Threads long-lived exchange configured', files.lib.includes('th_exchange_token'));
check('Threads refresh configured', files.lib.includes('th_refresh_token'));
check('Required scopes configured', files.lib.includes('threads_basic') && files.lib.includes('threads_content_publish'));
check('OAuth start has plan-limit protection', files.start.includes('checkSocialConnectionCapacity') && files.start.includes('platform: "threads"'));
check('OAuth callback stores Threads connection', files.callback.includes('saveThreadsConnection') && files.callback.includes('connected=threads'));
check('Uninstall callback verifies signed request', files.uninstall.includes('decodeAndVerifyMetaSignedRequest'));
check('Deletion callback returns confirmation', files.deletion.includes('confirmation_code') && files.deletion.includes('/delete-data/status'));
check('Deletion status endpoint exists', files.status.includes('status: "completed"'));
check('Social channels exposes Threads', files.social.includes('key: "threads"') && files.social.includes('/api/auth/threads/start'));
check('Migration allows Threads', files.migration.includes("'threads'"));
check('Vercel schedules Threads token refresh', files.vercel.includes('/api/cron/refresh-threads-tokens'));
check('Publisher recognizes Threads target', files.publisher.includes('targets.push("threads")'));
check('Publisher creates Threads containers', files.publisher.includes('/threads_publish') && files.publisher.includes('media_type: mediaType'));
check('Publisher supports Threads carousel', files.publisher.includes('mediaType: "CAROUSEL"') && files.publisher.includes('isCarouselItem: true'));
check('Publisher stores Threads receipt', files.publisher.includes('thread_id: String(threadsResult.id)'));

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll v143.93 Threads OAuth checks passed.');
