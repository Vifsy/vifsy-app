import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("app/api/cron/run-automations/route.js", "utf8");

assert.match(route, /function extractLockedProductObjectFromHtml/);
assert.match(route, /function findExactPageJsonLdProduct/);
assert.match(route, /products\.length === 1 \? products\[0\] : null/,
  "ambiguous multi-product JSON-LD must not guess the main product");
assert.match(route, /json_ld_main_product_object/);
assert.match(route, /page_level_product_metadata/);
assert.match(route, /locked_product_fingerprint/);
assert.match(route, /product_identity_locked: true/);
assert.match(route, /Locked product page object created/);


// Exercise the actual exact-page Product selector. Related/recommended Product
// entities may be present in JSON-LD, but only the Product whose URL is the
// opened canonical page may become the source object.
const exactStart = route.indexOf("function findExactPageJsonLdProduct");
const exactEnd = route.indexOf("function buildLockedProductIdentityFingerprint", exactStart);
const exactSource = route.slice(exactStart, exactEnd);
let mockJsonLdProducts = [];
const findExactPageJsonLdProduct = new Function(
  "getProducts",
  `
  const extractJsonLdObjects = () => getProducts();
  const normalizeJsonLdType = (value) => Array.isArray(value) ? value.map(v => String(v || '').toLowerCase()) : [String(value || '').toLowerCase()];
  const normalizeComparableValue = (value) => { const text=String(value || '').trim().toLowerCase(); return text.endsWith('/') ? text.slice(0,-1) : text; };
  const canonicalizeWebsiteProductUrl = (value, base) => { try { const u = new URL(value, base || value); u.search=''; u.hash=''; if (u.pathname.length > 1 && u.pathname.endsWith('/')) u.pathname=u.pathname.slice(0,-1); return u.toString(); } catch { return null; } };
  const getProductUrlFromJsonLd = (product, pageUrl) => { try { return new URL(product?.url || '', pageUrl).toString(); } catch { return null; } };
  ${exactSource}
  return findExactPageJsonLdProduct;
`
)(() => mockJsonLdProducts);
mockJsonLdProducts = [
  { "@type": "Product", name: "Related backpack", url: "https://shop.test/p/related" },
  { "@type": "Product", name: "Exact pencil case", url: "https://shop.test/p/exact" },
];
assert.equal(
  findExactPageJsonLdProduct("ignored", "https://shop.test/p/exact")?.name,
  "Exact pencil case"
);
mockJsonLdProducts = [
  { "@type": "Product", name: "Related A", url: "https://shop.test/p/a" },
  { "@type": "Product", name: "Related B", url: "https://shop.test/p/b" },
];
assert.equal(
  findExactPageJsonLdProduct("ignored", "https://shop.test/p/exact"),
  null,
  "two unrelated Product entities must never be guessed as the current product"
);

const hydrateStart = route.indexOf("async function hydrateAuthoritativeWebAgentProduct");
const hydrateEnd = route.indexOf("function createCampaignResearchPendingError", hydrateStart);
assert.ok(hydrateStart >= 0 && hydrateEnd > hydrateStart);
const hydrate = route.slice(hydrateStart, hydrateEnd);
assert.match(hydrate, /extractLockedProductObjectFromHtml/);
assert.match(hydrate, /initialResearchImageIgnored/);
assert.match(hydrate, /cachedImageIgnored/);
assert.doesNotMatch(hydrate, /extractBestProductImageFromHtml/,
  "authoritative campaign hydration must not scan generic page images");
assert.doesNotMatch(hydrate, /collectProductImageCandidates/,
  "authoritative campaign hydration must not pull recommendation images into the product object");
assert.match(hydrate, /The exact product page is now authoritative/);
assert.match(hydrate, /price: lockedProduct\.price \|\| ""/,
  "price must come from the locked page object, not from loose research metadata");
assert.doesNotMatch(hydrate, /lockedProduct\.price \|\| String\(candidate\?\.price/,
  "research price must not leak into a different locked product object");

const resolverStart = route.indexOf("async function resolveLargestProductImagesBeforeGeneration");
const resolverEnd = route.indexOf("function normalizeProductBrandIdentity", resolverStart);
const resolver = route.slice(resolverStart, resolverEnd);
assert.match(resolver, /hasLockedProductObject/);
assert.match(resolver, /Product image resolver reused locked main-product asset/);
assert.match(resolver, /Locked product page object rejected without alternate image search/);
assert.match(resolver, /!resolution\.lockedProductObject/,
  "a locked object that fails must not fall into browser/recommendation image search");
assert.match(resolver, /identityMethod: "locked_product_page_object"/);

const semanticStart = route.indexOf("async function reviewResolvedProductImageIdentity");
const semanticEnd = route.indexOf("async function reviewCarouselProductOnlyImages", semanticStart);
const semantic = route.slice(semanticStart, semanticEnd);
assert.match(semantic, /locked identifier:/);
assert.match(semantic, /locked category:/);
assert.match(semantic, /locked colour\/variant:/);
assert.match(semantic, /same-page lock is the primary source of truth/i);
assert.match(route, /current_price and the main image from that same main-product block/);
assert.match(route, /Do not substitute a similar product or a different colour\/size\/style variant/);
assert.match(route, /locked_product_price/);

assert.match(route, /function verifyPinterestPublishedMedia/);
assert.match(route, /mediaType === "multiple_images"/);
assert.match(route, /lastSummary\.imageCount === expected/);
assert.match(route, /Pinterest published media verified/);
assert.match(route, /The post was not marked published/);

// Exercise the actual pure Pinterest response summarizer from route source.
const summaryStart = route.indexOf("function summarizePinterestPinMedia");
const summaryEnd = route.indexOf("async function getPinterestPinById", summaryStart);
const summarySource = route.slice(summaryStart, summaryEnd);
const summarizePinterestPinMedia = new Function(`${summarySource}; return summarizePinterestPinMedia;`)();
assert.deepEqual(
  summarizePinterestPinMedia({ media: { media_type: "multiple_images", items: [{}, {}, {}, {}, {}] } }),
  { mediaType: "multiple_images", imageCount: 5 }
);
assert.deepEqual(
  summarizePinterestPinMedia({ media: { media_type: "image" } }),
  { mediaType: "image", imageCount: 1 }
);

console.log("v143.64 locked product-page object + Pinterest verification tests passed.");
