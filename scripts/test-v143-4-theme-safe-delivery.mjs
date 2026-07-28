import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getCampaignThemeDeliveryTier,
  resolveCampaignThemeEvidence,
  selectCampaignThemeDeliveryEntries,
} from "../lib/campaignThemeDelivery.js";
import {
  canonicalProductImageAssetKey,
  selectLargestVerifiedProductImage,
} from "../lib/productImageResolver.js";
import { sanitizeCatalogPrice } from "../lib/productEngineV2.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const route = fs.readFileSync(
  path.join(root, "app/api/cron/run-automations/route.js"),
  "utf8"
);
const migration = fs.readFileSync(
  path.join(root, "supabase/v143_4_delivery_safety.sql"),
  "utf8"
);

const christmasProducts = [
  "Christmas sweater",
  "Xmas socks",
  "Christmas boxers",
  "My first Christmas",
  "Family Christmas pyjamas",
].map((title, index) => ({
  item: { title },
  currentThemeMatches: 1,
  contextualApproved: true,
  qualityScore: 100 - index,
}));
const mixedProducts = [
  {
    item: { title: "Pride gift socks" },
    competingThemeMatches: 1,
    contextualApproved: true,
    qualityScore: 500,
    preferredRank: 0,
  },
  {
    item: { title: "Valentine gift" },
    competingThemeMatches: 1,
    contextualApproved: true,
    qualityScore: 500,
    preferredRank: 1,
  },
  {
    item: { title: "Generic bag" },
    qualityScore: 50,
  },
];
const christmasSelection = selectCampaignThemeDeliveryEntries(
  [...mixedProducts, ...christmasProducts],
  { selectedLimit: 5, reserveLimit: 3 }
);
assert.deepEqual(
  christmasSelection.selectedEntries.map((entry) => entry.item.title),
  christmasProducts.map((entry) => entry.item.title),
  "Five direct-current-theme products must beat competing occasions even when the old/senior order preferred the competitors"
);
assert.equal(
  christmasSelection.rankedEntries.length,
  8,
  "Theme ordering must not remove any technically valid delivery fallback"
);

const deliveryBackfill = selectCampaignThemeDeliveryEntries(
  [
    ...christmasProducts.slice(0, 2),
    {
      item: { title: "Natural contextual product" },
      contextualApproved: true,
      qualityScore: 30,
    },
    { item: { title: "Generic product" }, qualityScore: 20 },
    {
      item: { title: "Father's Day product" },
      competingThemeMatches: 1,
      qualityScore: 1000,
    },
  ],
  { selectedLimit: 5, reserveLimit: 3 }
);
assert.equal(
  deliveryBackfill.selectedEntries.length,
  5,
  "Competing occasions must remain usable as a last-resort delivery backfill"
);
assert.deepEqual(
  deliveryBackfill.selectedEntries.map((entry) => entry.deliveryTier),
  ["direct", "direct", "contextual", "generic", "competing"]
);
assert.equal(
  getCampaignThemeDeliveryTier({
    currentThemeMatches: 2,
    competingThemeMatches: 1,
    contextualApproved: false,
  }),
  "direct",
  "Stronger direct evidence for the current campaign must win when both theme families appear"
);
assert.deepEqual(
  resolveCampaignThemeEvidence({
    currentThemeMatches: 1,
    competingThemeMatches: 1,
  }),
  { currentThemeMatches: 0, competingThemeMatches: 1 },
  "A generic overlapping term must not let a competing occasion masquerade as the current theme"
);

const primaryImageUrl = "https://cdn.example.com/mug_400x.png";
const sameMugLarge = "https://cdn.example.com/mug_2400x.png";
const unrelatedShirt = "https://cdn.example.com/dragon-shirt_2400x.png";
const candidates = [
  {
    url: primaryImageUrl,
    source: "selected_product_image",
    roleScore: 125,
    declaredWidth: 400,
    assetKey: canonicalProductImageAssetKey(primaryImageUrl),
  },
  {
    url: unrelatedShirt,
    source: "product_json_ld",
    roleScore: 108,
    declaredWidth: 2400,
    assetKey: canonicalProductImageAssetKey(unrelatedShirt),
  },
  {
    url: sameMugLarge,
    source: "derived:increase_path_width",
    roleScore: 100,
    declaredWidth: 2400,
    assetKey: canonicalProductImageAssetKey(sameMugLarge),
  },
];
const imageMetadata = new Map([
  [
    primaryImageUrl,
    { width: 400, height: 400, fingerprint: [5, 10, 15, 20, 25, 30] },
  ],
  [
    sameMugLarge,
    { width: 2400, height: 2400, fingerprint: [5, 10, 15, 20, 25, 30] },
  ],
  [
    unrelatedShirt,
    {
      width: 3000,
      height: 3000,
      fingerprint: [240, 220, 200, 180, 160, 140],
    },
  ],
]);
const imageSelection = await selectLargestVerifiedProductImage({
  candidates,
  primaryImageUrl,
  inspectImage: async (url) => imageMetadata.get(url),
});
assert.equal(
  imageSelection.selected.url,
  sameMugLarge,
  "A larger unrelated structured-data image must not replace the current product image"
);
assert.equal(imageSelection.selected.identityMethod, "same_primary_asset");

const ordinaryPrice = sanitizeCatalogPrice({
  price: "399 kr",
  source: "visible_product_price",
  html: "Fri frakt vid köp över 799 kr. Produktpris 399 kr.",
});
assert.equal(
  ordinaryPrice.price,
  "399 kr",
  "An ordinary product price near a separate shipping message must remain usable"
);
const actualShippingThreshold = sanitizeCatalogPrice({
  price: "799 kr",
  source: "visible_text",
  html: "Fri frakt vid köp över 799 kr.",
});
assert.equal(actualShippingThreshold.rejectedReason, "shipping_threshold");

assert.match(route, /competingThemeTerms/);
assert.match(
  route,
  /Campaign senior final review skipped because direct theme evidence already fills the delivery set/
);
assert.match(route, /selectCampaignThemeSafeDeliveryProducts\(\{/);
assert.match(route, /insertWebsiteContentHistoryRowsIdempotently/);
assert.match(route, /identityMethod/);
assert.match(route, /candidatesPersisted,/);
assert.doesNotMatch(
  route,
  /\.filter\([^)]{0,300}campaign_competing_theme_matches/,
  "Competing-theme ranking must not become a hard product filter"
);
assert.match(
  migration,
  /unique\s*\(\s*brand_profile_id,\s*automation_rule_id,\s*canonical_product_url\s*\)/i
);
assert.match(
  migration,
  /delete from public\.website_product_candidate_queue older/i
);

console.log("v143.4 theme-safe delivery regression tests passed.");
