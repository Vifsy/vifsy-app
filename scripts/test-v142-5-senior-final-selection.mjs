import assert from "node:assert/strict";
import fs from "node:fs";
import {
  collectProductImageCandidates,
  isReviewOrUserGeneratedProductImageCandidate,
  selectLargestVerifiedProductImage,
} from "../lib/productImageResolver.js";

const productUrl = "https://shop.example/products/personal-pet-poster";
const productImage =
  "https://cdn.example/products/personal-pet-poster_1024x1024.jpg";
const reviewImage =
  "https://judgeme.imgix.net/shop-example/customer-review-original.jpeg?auto=format";
const html = `
  <main>
    <section class="product-gallery product-media">
      <img src="${productImage}" alt="Personal pet poster" />
    </section>
    <section class="jdgm-review review-gallery customer-photos">
      <img src="${reviewImage}" alt="Customer review" />
    </section>
  </main>
`;

const candidates = collectProductImageCandidates({
  html,
  pageUrl: productUrl,
  primaryImageUrl: productImage,
  productTitle: "Personal pet poster",
});
const judgeMeCandidate = candidates.find((candidate) =>
  candidate.url.includes("judgeme.imgix.net")
);

assert.ok(judgeMeCandidate, "The fixture must expose the customer review image");
assert.equal(
  isReviewOrUserGeneratedProductImageCandidate(judgeMeCandidate),
  true,
  "Judge.me customer images must be recognized as review content"
);

const selectedImage = await selectLargestVerifiedProductImage({
  candidates,
  primaryImageUrl: productImage,
  inspectImage: async (url) => {
    if (url.includes("judgeme.imgix.net")) {
      return {
        width: 3024,
        height: 4032,
        fingerprint: [20, 40, 60, 80],
      };
    }
    return {
      width: 1024,
      height: 1024,
      fingerprint: [220, 220, 220, 220],
    };
  },
});

assert.equal(
  selectedImage.selected.url,
  productImage,
  "A larger review photo must never replace the verified product image"
);
assert.ok(
  selectedImage.rejected.some((candidate) =>
    candidate.url.includes("judgeme.imgix.net")
  ),
  "Review images should be recorded among rejected image candidates"
);

const route = fs.readFileSync(
  new URL("../app/api/cron/run-automations/route.js", import.meta.url),
  "utf8"
);
const browser = fs.readFileSync(
  new URL("../lib/headlessProductImageBrowser.js", import.meta.url),
  "utf8"
);

assert.match(
  route,
  /CAMPAIGN_FINAL_REVIEW_SHORTLIST_LIMIT = (?:15|20|30)/
);
assert.match(route, /CAMPAIGN_FINAL_REVIEW_MIN_SCORE = 75/);
assert.match(
  route,
  /async function selectCampaignCarouselProductsWithSeniorFinalReview/
);
assert.match(
  route,
  /A retailer search query is only a discovery clue and is never proof/
);
assert.match(
  route,
  /selectedProducts = finalReview\.selectedProducts/
);
assert.match(
  route,
  /discoverProductsFromStoreMapAgent\(\{[\s\S]{0,500}useSeniorEscalation: false/
);
assert.doesNotMatch(
  route,
  /escalateWhenUncertain: true/,
  "Campaign-carousel discovery must not make extra senior calls before the mandatory final review"
);
assert.match(
  route,
  /stopped by senior final relevance gate/
);
assert.match(
  route,
  /!isCampaignRule[\s\S]{0,100}!productEngineV2ReserveProducts\.length/,
  "Unreviewed catalog products must not be reintroduced as campaign reserves"
);
assert.match(browser, /judgeme\|judge\\\.me\|loox\|yotpo/);

const finalReviewCallIndex = route.indexOf(
  "selectCampaignCarouselProductsWithSeniorFinalReview({"
);
const finalCountGateIndex = route.indexOf(
  "if (selectedProducts.length < CAROUSEL_PRODUCT_SLIDE_TARGET)",
  finalReviewCallIndex
);
assert.ok(
  finalReviewCallIndex > 0 && finalCountGateIndex > finalReviewCallIndex,
  "The senior review must run before the final five-product delivery gate"
);

console.log("v142.5 senior final selection and review-image tests passed.");
