import assert from "node:assert/strict";
import fs from "node:fs";
import {
  collectProductImageCandidates,
  selectMostLikelyMainProductGalleryImage,
} from "../lib/productImageResolver.js";

const pageUrl =
  "https://shop.example/se/sv/billi-bi/sandals_32792957/229285489";
const opaqueMainImage =
  "https://cdn.example/billi-bi/bbia8635_cfiestarednaplack.webp?size=w900&version=opaque";
const largerRecommendationImage =
  "https://cdn.example/other-brand/sku-999999.webp?size=w2400";

const html = `
  <html>
    <main>
      <section class="product-gallery product-media">
        <img
          src="${opaqueMainImage}"
          alt="Red sandal"
        />
      </section>
      <section class="related-products recommendations">
        <article class="product-card">
          <img
            src="${largerRecommendationImage}"
            alt="Another product"
          />
        </article>
      </section>
    </main>
  </html>
`;

const candidates = collectProductImageCandidates({
  html,
  pageUrl,
  productTitle: "Heeled sandals",
});
const selected = selectMostLikelyMainProductGalleryImage(candidates);

assert.ok(selected, "A verified product gallery should produce an image");
assert.equal(
  selected.url,
  opaqueMainImage,
  "The main gallery image must win even when its opaque CDN filename does not match the title or URL"
);
assert.equal(
  selected.declaredWidth,
  900,
  "Generic width inference should understand resize values such as size=w900"
);
assert.ok(
  !String(selected.source || "").startsWith("derived:"),
  "Early verification must keep a real page image; high-resolution URL derivation happens in the later inspected pass"
);

const route = fs.readFileSync(
  new URL("../app/api/cron/run-automations/route.js", import.meta.url),
  "utf8"
);
const browser = fs.readFileSync(
  new URL("../lib/headlessProductImageBrowser.js", import.meta.url),
  "utf8"
);
const gallerySelectionIndex = route.indexOf(
  "selectMostLikelyMainProductGalleryImage(galleryCandidates)"
);
const filenameFallbackIndex = route.indexOf(
  "imageUrlMatchesProductIdentity(image.url, pageUrl, productTitle)"
);

assert.ok(
  gallerySelectionIndex > 0 && filenameFallbackIndex > gallerySelectionIndex,
  "Structured main-gallery selection must run before filename identity matching"
);
assert.match(
  route,
  /!imageUrl\s*&&\s*directProductProof[\s\S]{0,500}typeof renderProductPage === "function"/,
  "A verified product page without a static image must receive the bounded rendered-page fallback"
);
assert.match(
  route,
  /Product page main-gallery image recovered after rendered verification/
);
assert.match(browser, /displayedArea >= 120_000/);
assert.match(browser, /recommendationRegion/);
assert.match(browser, /displayedArea \* 100 \+ Math\.min\(naturalArea, 5_000_000\)/);

console.log("v142.4 verified-product main-gallery image tests passed.");
