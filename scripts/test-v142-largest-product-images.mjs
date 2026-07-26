import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  canonicalProductImageAssetKey,
  collectProductImageCandidates,
  generateGenericHighResolutionImageUrls,
  selectLargestVerifiedProductImage,
} from "../lib/productImageResolver.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routeSource = fs.readFileSync(
  path.join(root, "app/api/cron/run-automations/route.js"),
  "utf8"
);
const resolverSource = fs.readFileSync(
  path.join(root, "lib/productImageResolver.js"),
  "utf8"
);
const browserSource = fs.readFileSync(
  path.join(root, "lib/headlessProductImageBrowser.js"),
  "utf8"
);

const thumbnail =
  "https://images.example-cdn.test/catalog/shoe-blue.jpg?imwidth=156&filter=packshot";
const normal =
  "https://images.example-cdn.test/catalog/shoe-blue.jpg?imwidth=762&filter=packshot";
const zoom =
  "https://images.example-cdn.test/catalog/shoe-blue.jpg?imwidth=1800&filter=packshot";
const unrelated =
  "https://images.example-cdn.test/catalog/other-shoe.jpg?imwidth=2200";

assert.equal(
  canonicalProductImageAssetKey(thumbnail),
  canonicalProductImageAssetKey(zoom),
  "transformed sizes of the same asset must be grouped together"
);
assert.notEqual(
  canonicalProductImageAssetKey(thumbnail),
  canonicalProductImageAssetKey(unrelated),
  "different product assets must not be grouped together"
);

const variants = generateGenericHighResolutionImageUrls(thumbnail);
assert.ok(
  variants.some((candidate) => /imwidth=1800/.test(candidate.url)),
  "generic numeric width parameters must produce a high-resolution candidate"
);
assert.ok(
  variants.some(
    (candidate) =>
      !new URL(candidate.url).searchParams.has("imwidth")
  ),
  "the untransformed source URL must also be checked"
);

const html = `
  <html>
    <head>
      <script type="application/ld+json">
        {"@type":"Product","name":"Blue shoe","image":["${normal}"]}
      </script>
    </head>
    <body>
      <main class="product-gallery">
        <button class="thumbnail"><img src="${thumbnail}" alt="Blue shoe"></button>
        <picture>
          <source srcset="${normal} 762w, ${zoom} 1800w">
          <img src="${normal}" data-zoom-image="${zoom}" alt="Blue shoe">
        </picture>
      </main>
      <section class="recommendations">
        <img src="${unrelated}" alt="Other shoe">
      </section>
    </body>
  </html>
`;
const candidates = collectProductImageCandidates({
  html,
  pageUrl: "https://shop.example.test/products/blue-shoe",
  primaryImageUrl: thumbnail,
  productTitle: "Blue shoe",
});
assert.ok(candidates.some((candidate) => candidate.url === zoom));
assert.ok(
  collectProductImageCandidates({
    pageUrl: "https://shop.example.test/products/extensionless",
    primaryImageUrl:
      "https://media.example.test/assets/opaque-product-id?width=200",
    html:
      '<img src="https://media.example.test/assets/opaque-product-id?width=200" alt="Product">',
  }).length > 0,
  "image attributes with extensionless CDN URLs must remain eligible"
);

const sizeByUrl = new Map([
  [thumbnail, { width: 200, height: 289 }],
  [normal, { width: 800, height: 1155 }],
  [zoom, { width: 1801, height: 2600 }],
  [unrelated, { width: 2200, height: 2200 }],
]);
const inspectImage = async (url) => {
  const direct = sizeByUrl.get(url);
  if (direct) {
    return {
      ...direct,
      fingerprint: url === unrelated
        ? new Array(256).fill(245)
        : new Array(256).fill(80),
    };
  }
  const parsed = new URL(url);
  const requestedWidth = Number(parsed.searchParams.get("imwidth") || 0);
  if (parsed.pathname.endsWith("/shoe-blue.jpg") && requestedWidth) {
    return {
      width: requestedWidth,
      height: Math.round(requestedWidth * 1.444),
      fingerprint: new Array(256).fill(80),
    };
  }
  if (
    parsed.pathname.endsWith("/shoe-blue.jpg") &&
    !parsed.searchParams.has("imwidth")
  ) {
    return {
      width: 2400,
      height: 3466,
      fingerprint: new Array(256).fill(80),
    };
  }
  throw new Error("Fixture URL unavailable");
};

const selection = await selectLargestVerifiedProductImage({
  candidates,
  primaryImageUrl: thumbnail,
  inspectImage,
});
assert.match(selection.selected.url, /shoe-blue\.jpg/);
assert.doesNotMatch(selection.selected.url, /other-shoe/);
assert.ok(selection.selected.width >= 1800);
assert.equal(selection.preferredQuality, true);
assert.equal(selection.usedSmallImageFallback, false);

const smallOnlyCandidates = collectProductImageCandidates({
  pageUrl: "https://shop.example.test/products/small-only",
  primaryImageUrl:
    "https://static.example.test/product-small.png",
});
const smallSelection = await selectLargestVerifiedProductImage({
  candidates: smallOnlyCandidates,
  primaryImageUrl:
    "https://static.example.test/product-small.png",
  inspectImage: async () => ({
    width: 320,
    height: 320,
    fingerprint: new Array(256).fill(100),
  }),
});
assert.equal(smallSelection.usedSmallImageFallback, true);
assert.equal(smallSelection.selected.width, 320);

const resolverCall = routeSource.indexOf(
  "resolveLargestProductImagesBeforeGeneration({"
);
const generationCall = routeSource.indexOf(
  "const rawGeneratedContent = await generateAutomationPostWithProductContractValidation("
);
assert.ok(
  resolverCall > 0 && generationCall > resolverCall,
  "image resolution must finish before the first paid content generation call"
);
assert.match(
  routeSource,
  /usedSmallImageFallback:\s*smallFallback/,
  "small customer images must remain a logged last fallback"
);
assert.match(
  routeSource,
  /Accept:\s*"image\/webp,image\/png,image\/jpeg/,
  "image downloads must avoid explicit AVIF/HEIF negotiation"
);
assert.match(browserSource, /createProductImageBrowserSession/);
assert.match(browserSource, /closest\("button,\[role=button\]"\)/);
assert.match(
  routeSource,
  /const renderCandidates = animatedReelCandidates\.slice\(0, 1\)/,
  "animated rendering must use the preflight-selected product only once"
);
assert.doesNotMatch(
  routeSource,
  /reserveRawContent/,
  "a render fallback must not trigger another paid text generation"
);
assert.doesNotMatch(
  `${resolverSource}\n${browserSource}`,
  /boozt|zalando|ztat/i,
  "the resolver must stay platform and customer independent"
);

const carouselRendererStart = routeSource.indexOf(
  "async function renderCarouselProductSlideImage"
);
const carouselRendererEnd = routeSource.indexOf(
  "\nasync function ",
  carouselRendererStart + 20
);
const carouselRenderer = routeSource.slice(
  carouselRendererStart,
  carouselRendererEnd
);
assert.match(carouselRenderer, /const width = 1080/);
assert.match(carouselRenderer, /const height = 1080/);

console.log("v142 largest-product-image tests passed");
