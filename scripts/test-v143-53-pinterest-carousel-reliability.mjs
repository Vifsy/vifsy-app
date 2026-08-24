import fs from 'node:fs';

const worker = fs.readFileSync('app/api/cron/run-automations/route.js', 'utf8');
const migration = fs.readFileSync('supabase/v143_53_reliable_social_publish_targets.sql', 'utf8');
let passed = 0;
let failed = 0;
function check(name, condition) {
  if (condition) { console.log(`PASS ${name}`); passed += 1; }
  else { console.error(`FAIL ${name}`); failed += 1; }
}

check('Pinterest carousel excludes outro media', worker.includes('outroIncluded: false') && worker.includes(".includes(\"outro\")"));
check('Pinterest carousel caps media at five', worker.includes('.slice(0, 5)'));
check('Pinterest uses multiple_image_urls', worker.includes('source_type: "multiple_image_urls"'));
check('Pinterest timeout/S3 ingestion is transient', worker.includes('_upload_pin_to_s3') && worker.includes('isPinterestTransientPublishError'));
check('Pinterest retry reconciliation lists board Pins', worker.includes('/boards/${encodeURIComponent(String(boardId))}/pins'));
check('Pinterest reconciliation matches unique post UTM id', worker.includes('url.searchParams.get("utm_content") === expected'));
check('Pinterest timeout reconciles before retry', worker.includes('Pinterest timeout reconciled successfully'));
check('Pinterest/TikTok transient retries bypass the ordinary terminal attempt cap', worker.includes('transientPinterestFailure || transientTikTokFailure || publishAttempt < MAX_PUBLISH_ATTEMPTS'));
check('Pinterest transient retry is bounded to hourly backoff', worker.includes('PINTEREST_TRANSIENT_RETRY_MAX_MINUTES'));
check('Published targets are persisted immediately', worker.includes('persistPublishedTarget'));
check('Already published destinations are skipped on retry', worker.includes('desiredTargets.filter((target) => !publishedTargetSet.has(target))'));
check('Publish receipts persist Pinterest Pin id', worker.includes('pin_id: String(pinterestResult.id)'));
check('Final post publish waits for all desired targets', worker.includes('allDesiredTargetsPublished'));
check('Failure update preserves partial target progress', worker.includes('published_targets: Array.from(publishedTargetSet)'));
check('Migration adds published_targets', migration.includes('published_targets text[]'));
check('Migration adds publish_receipts', migration.includes('publish_receipts jsonb'));

if (failed) {
  console.error(`\n${passed} passed, ${failed} failed`);
  process.exit(1);
}
console.log(`\n${passed}/${passed} checks passed`);
