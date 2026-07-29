import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getCampaignProductFamilySignature,
  inferCampaignProductType,
  selectDiverseCampaignDeliveryEntries,
} from "../lib/campaignCarouselDiversity.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const route = fs.readFileSync(
  path.join(root, "app/api/cron/run-automations/route.js"),
  "utf8"
);

function entry(title, score, deliveryTier = "direct", extra = {}) {
  return {
    item: {
      title,
      url: `https://example.test/products/${encodeURIComponent(title)}`,
      campaign_fit_score: score,
      ...extra,
    },
    deliveryTier,
    contextualScore: score,
    qualityScore: score,
  };
}

const sportsPool = [
  entry("REGULAR FIT SPORTS SHORTS WITH POCKETS - Träningsshorts - black", 100),
  entry("ESSENTIAL 2in1 SHORTS INSERTED TIGHTS - Träningsshorts - black", 99),
  entry("SPORT DIAMOND - Träningsshorts - black", 98),
  entry("RUN SHORT - Träningsshorts - navy", 97),
  entry("ADIDAS REGULAR PANT - Träningsbyxor - black", 96),
  entry("DEFINE NULU - Träningsjacka - white", 95),
  entry("2 PACK - T-shirt - bas - black/dark blue", 94),
  entry("SUPERSTAR FULL LENGTH LEGGING - Tygbyxor - warm vanilla", 93),
  entry("LONGLINE SPORTS BRA - Topp - beaver fur", 92),
];

const sportsSelection = selectDiverseCampaignDeliveryEntries(sportsPool, {
  selectedLimit: 5,
  reserveLimit: 3,
});
assert.equal(sportsSelection.selectedEntries.length, 5);
assert.equal(
  Object.keys(sportsSelection.diagnostics.selectedTypeCounts).length >= 4,
  true,
  "A broad, equally relevant sports pool should produce at least four product types"
);
assert.equal(
  Number(sportsSelection.diagnostics.selectedTypeCounts.shorts || 0) <= 2,
  true,
  "Four similar shorts must not dominate when strong alternatives exist"
);

assert.equal(
  getCampaignProductFamilySignature({
    title: "TATTOOSWEET EMBROIDERY HEAVYWEIGHT - Luvtröja - black",
  }),
  getCampaignProductFamilySignature({
    title: "TATTOOSWEET EMBROIDERY HEAVYWEIGHT - Luvtröja - off white",
  }),
  "Colour variants of the same named product must share one family signature"
);

const variantSelection = selectDiverseCampaignDeliveryEntries(
  [
    entry("NBA ELEMENTAL BACKPACK - Ryggsäck - black", 88, "contextual"),
    entry("MINECRAFT T-SHIRT AND SHORTS SET - white black", 72, "contextual"),
    entry(
      "TATTOOSWEET EMBROIDERY HEAVYWEIGHT - Luvtröja - black",
      58,
      "contextual"
    ),
    entry(
      "TATTOOSWEET EMBROIDERY HEAVYWEIGHT - Luvtröja - off white",
      56,
      "contextual"
    ),
  ],
  { selectedLimit: 5, reserveLimit: 3 }
);
assert.equal(variantSelection.selectedEntries.length, 3);
assert.equal(variantSelection.diagnostics.familyVariantCountRemoved, 1);
assert.equal(
  variantSelection.selectedEntries.filter(
    (candidate) => inferCampaignProductType(candidate.item) === "hoodie"
  ).length,
  1,
  "A second colour variant must not masquerade as assortment breadth"
);

const specialistPool = Array.from({ length: 5 }, (_, index) =>
  entry(`Specialist running shorts model ${index + 1} - black`, 100 - index)
);
const specialistSelection = selectDiverseCampaignDeliveryEntries(
  specialistPool,
  { selectedLimit: 5, reserveLimit: 3 }
);
assert.equal(
  specialistSelection.selectedEntries.length,
  5,
  "A specialist assortment must still deliver five products when no broader types exist"
);

const tierProtectedSelection = selectDiverseCampaignDeliveryEntries(
  [
    ...specialistPool,
    entry("Generic lifestyle jacket - white", 100, "contextual"),
  ],
  { selectedLimit: 5, reserveLimit: 3 }
);
assert.equal(tierProtectedSelection.selectedEntries.length, 5);
assert.equal(
  tierProtectedSelection.selectedEntries.some(
    (candidate) => candidate.item.title === "Generic lifestyle jacket - white"
  ),
  false,
  "Diversity must not replace five direct matches with a weaker delivery tier"
);

assert.match(route, /selectDiverseCampaignDeliveryEntries/);
assert.match(
  route,
  /selectedProducts: diverseSelection\.selectedEntries\.map\(decorate\)/
);
assert.match(
  route,
  /The runtime can safely deliver a reduced carousel; never invent a weak campaign story/
);
assert.doesNotMatch(
  route,
  /CAMPAIGN_(?:PREPARATION|DISCOVERY|FINAL_REVIEW)_.*143\.9/,
  "The variation patch must not introduce a second timeout budget"
);

console.log("v143.9 bounded carousel set-diversity tests passed.");
