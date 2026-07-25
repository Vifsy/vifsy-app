import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { classifyCommercePage } from "../lib/productEngineV2.js";
import { detectWebsiteSecurityProvider } from "../lib/websiteSecurity.js";

function headers(values = {}) {
  const normalized = new Map(Object.entries(values).map(([key, value]) => [key.toLowerCase(), String(value)]));
  return { get(name) { return normalized.get(String(name).toLowerCase()) || null; } };
}

const recommendationCards = Array.from({ length: 10 }, (_, index) =>
  `<article class="product-card"><a href="/se/sv/brand/recommended_${33000000 + index}/${230000000 + index}">Recommended ${index}</a></article>`
).join("\n");

const booztProduct = classifyCommercePage({
  url: "https://www.boozt.com/se/sv/the-north-face/b-never-stop-synthetic-jacket_33087387/232310510",
  productSchemaFound: true,
  ecommerceProofFound: true,
  html: `<html><body><h1>B Never Stop Synthetic Jacket</h1><form class="product-form"><button>Add to bag</button></form>${recommendationCards}</body></html>`,
});
assert.equal(booztProduct.pageType, "product");
assert.equal(booztProduct.reason, "product_with_recommendations");

const booztCategory = classifyCommercePage({
  url: "https://www.boozt.com/se/sv/klader-for-kvinnor/jackor/vinterjackor",
  productSchemaFound: false,
  ecommerceProofFound: false,
  html: `<html><body><h1>Vinterjackor</h1>${recommendationCards}</body></html>`,
});
assert.equal(booztCategory.pageType, "category");
assert.equal(booztCategory.reason, "multiple_product_cards");

const cloudflare = detectWebsiteSecurityProvider({
  status: 403,
  headers: headers({ server: "cloudflare", "cf-ray": "1234-ARN" }),
  body: "<title>Attention Required! | Cloudflare</title>",
});
assert.equal(cloudflare.blocked, true);
assert.equal(cloudflare.provider, "cloudflare");
assert.equal(cloudflare.confidence, "high");

const unknown403 = detectWebsiteSecurityProvider({
  status: 403,
  headers: headers({ server: "nginx" }),
  body: "<title>403 Forbidden</title><p>Access denied.</p>",
});
assert.equal(unknown403.provider, "unknown");
assert.equal(unknown403.confidence, "low");

const workerSource = await readFile(new URL("../app/api/cron/run-automations/route.js", import.meta.url), "utf8");
const migrationSource = await readFile(new URL("../supabase/v140_safe_attempts_customer_operations.sql", import.meta.url), "utf8");

assert.match(workerSource, /const attempts = \["best_match", "domain_site_search", "backup_broad"\]/);
assert.match(workerSource, /claimAutomationOccurrenceOnce\([\s\S]*?prepareFocusedPageContextForRule/);
assert.match(workerSource, /This scheduled occurrence already used its one automatic generation attempt/);
assert.match(workerSource, /p_keep_rule_active: keepRuleActive/);
assert.match(migrationSource, /on public\.automation_occurrences \(automation_rule_id, scheduled_for\)[\s\S]*?where attempt_kind = \'automatic\'/i);
assert.match(migrationSource, /create or replace function public\.fail_automation_occurrence_terminal/);
assert.match(migrationSource, /released_after_failure/);
assert.match(migrationSource, /p_keep_rule_active boolean default false/);

console.log("v140 safety, 403 diagnosis and Boozt product-page tests passed.");
