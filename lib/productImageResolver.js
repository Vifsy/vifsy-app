export const PRODUCT_IMAGE_PREFERRED_WIDTH = 1400;
export const PRODUCT_IMAGE_PREFERRED_AREA = 1_600_000;
export const PRODUCT_IMAGE_MAX_INSPECTIONS = 24;

const IMAGE_URL_PATTERN =
  /\.(?:avif|gif|jpe?g|png|webp)(?:$|[?#])/i;
const RESIZE_QUERY_KEY_PATTERN =
  /^(?:w|width|wid|sw|iw|imgwidth|imagewidth|image_width|imwidth|maxwidth|max_width|resize|size)$/i;
const HEIGHT_QUERY_KEY_PATTERN =
  /^(?:h|height|hei|sh|ih|imgheight|imageheight|image_height|maxheight|max_height)$/i;
const THUMBNAIL_SIGNAL_PATTERN =
  /(?:^|[\s_:/.-])(?:thumb|thumbnail|mini|small|tiny|swatch|preview|tile)(?:$|[\s_:/.-])/i;
const LARGE_IMAGE_SIGNAL_PATTERN =
  /(?:zoom|full(?:screen|size)?|original|large|hires|high[-_ ]?res|gallery|lightbox|magnif)/i;

function decodeHtmlUrl(value) {
  return String(value || "")
    .trim()
    .replace(/&amp;/gi, "&")
    .replace(/&#38;/gi, "&")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u002F/gi, "/")
    .replace(/\\\//g, "/")
    .replace(/&quot;/gi, '"');
}

function resolveHttpUrl(value, pageUrl) {
  const decoded = decodeHtmlUrl(value);
  if (!decoded) return "";

  try {
    const resolved = new URL(decoded, pageUrl || decoded);
    if (!/^https?:$/i.test(resolved.protocol)) return "";
    return resolved.toString();
  } catch {
    return "";
  }
}

function getTagAttribute(tag, attributeName) {
  const escapedName = String(attributeName || "").replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
  const pattern = new RegExp(
    `\\s${escapedName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i"
  );
  const match = String(tag || "").match(pattern);
  return decodeHtmlUrl(match?.[1] || match?.[2] || match?.[3] || "");
}

function parseSrcset(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const parts = entry.split(/\s+/);
      const descriptor = parts.at(-1) || "";
      const widthMatch = descriptor.match(/^(\d+)w$/i);
      return {
        url: widthMatch ? parts.slice(0, -1).join(" ") : parts.join(" "),
        declaredWidth: Number(widthMatch?.[1] || 0),
      };
    })
    .filter((entry) => entry.url);
}

function collectJsonLdProductImages(html, pageUrl) {
  const images = [];
  const scripts =
    String(html || "").match(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi
    ) || [];

  let productIndex = 0;
  const addImageValue = (value, currentProductIndex) => {
    if (typeof value === "string") {
      const resolved = resolveHttpUrl(value, pageUrl);
      if (resolved) {
        images.push({ url: resolved, productIndex: currentProductIndex });
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => addImageValue(entry, currentProductIndex));
      return;
    }
    if (value && typeof value === "object") {
      addImageValue(
        value.url || value.contentUrl || value.image,
        currentProductIndex
      );
    }
  };

  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;

    const typeValues = Array.isArray(value["@type"])
      ? value["@type"]
      : [value["@type"]];
    if (
      typeValues.some((type) =>
        /^(?:Product|IndividualProduct|ProductModel)$/i.test(String(type || ""))
      )
    ) {
      const currentProductIndex = productIndex;
      productIndex += 1;
      addImageValue(value.image, currentProductIndex);
    }

    Object.values(value).forEach(visit);
  };

  for (const script of scripts.slice(0, 20)) {
    const jsonText = script
      .replace(/^<script\b[^>]*>/i, "")
      .replace(/<\/script>$/i, "")
      .trim();
    if (!jsonText) continue;
    try {
      visit(JSON.parse(jsonText));
    } catch {
      // Invalid JSON-LD must not prevent the remaining image discovery paths.
    }
  }

  return images;
}

function inferContextRoleScore({ source, context, url, declaredWidth = 0 }) {
  const combined = `${source || ""} ${context || ""} ${url || ""}`;
  let score = 40;

  if (/primary|selected_product/i.test(source || "")) score = 125;
  if (/json[_ -]?ld/i.test(source || "")) score = Math.max(score, 108);
  if (/og:image|twitter:image/i.test(source || "")) score = Math.max(score, 76);
  if (/srcset|picture:source/i.test(source || "")) score = Math.max(score, 92);
  if (/anchor:image/i.test(source || "")) score = Math.max(score, 112);
  if (LARGE_IMAGE_SIGNAL_PATTERN.test(combined)) score = Math.max(score, 116);
  if (/(?:tabpanel|product[-_ ]?gallery|product[-_ ]?media|main[-_ ]?image)/i.test(combined)) {
    score = Math.max(score, 102);
  }
  if (THUMBNAIL_SIGNAL_PATTERN.test(combined) || /(?:tablist|color[-_ ]?swatch)/i.test(combined)) {
    score -= 65;
  }
  if (/(?:recommend|similar|related|recently|cross[-_ ]?sell|upsell)/i.test(combined)) {
    score -= 55;
  }
  if (/(?:logo|favicon|icon|sprite|badge|avatar|banner|background)/i.test(combined)) {
    score -= 60;
  }
  if (declaredWidth >= 1000) score += 12;
  if (declaredWidth > 0 && declaredWidth <= 320) score -= 35;

  return score;
}

function replaceWidthLikeValue(value, targetWidth) {
  const raw = String(value || "");
  if (/^\d+$/.test(raw)) return String(targetWidth);
  if (/^w\d+$/i.test(raw)) return `w${targetWidth}`;
  if (/^\d+w$/i.test(raw)) return `${targetWidth}w`;
  if (/^\d+x$/i.test(raw)) return `${targetWidth}x`;
  if (/^\d+x\d+$/i.test(raw)) {
    const [width, height] = raw.split("x").map(Number);
    const scaledHeight =
      width > 0 && height > 0
        ? Math.max(1, Math.round((height / width) * targetWidth))
        : targetWidth;
    return `${targetWidth}x${scaledHeight}`;
  }
  return raw;
}

export function canonicalProductImageAssetKey(value) {
  try {
    const parsed = new URL(String(value || ""));
    for (const key of [...parsed.searchParams.keys()]) {
      if (
        RESIZE_QUERY_KEY_PATTERN.test(key) ||
        HEIGHT_QUERY_KEY_PATTERN.test(key) ||
        /^(?:dpr|quality|q|fit|crop)$/i.test(key)
      ) {
        parsed.searchParams.delete(key);
      }
    }
    parsed.hash = "";
    parsed.pathname = parsed.pathname
      .replace(/(?:[_-])w\d{2,5}(?=\.(?:avif|gif|jpe?g|png|webp)$)/i, "")
      .replace(/(?:[_-])\d{2,5}x\d{0,5}(?=\.(?:avif|gif|jpe?g|png|webp)$)/i, "")
      .replace(/\/w_\d{2,5}(?=\/)/gi, "/w_{width}");
    return `${parsed.hostname.toLowerCase()}${parsed.pathname.toLowerCase()}`;
  } catch {
    return String(value || "").trim().toLowerCase();
  }
}

export function generateGenericHighResolutionImageUrls(
  value,
  targetWidths = [2400, 1800, 1400]
) {
  const variants = [];
  const seen = new Set();
  const add = (url, declaredWidth, strategy) => {
    const normalized = String(url || "").trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    variants.push({ url: normalized, declaredWidth, strategy });
  };

  let parsed;
  try {
    parsed = new URL(String(value || ""));
  } catch {
    return variants;
  }

  const resizeKeys = [...parsed.searchParams.keys()].filter((key) =>
    RESIZE_QUERY_KEY_PATTERN.test(key)
  );

  if (resizeKeys.length) {
    const withoutResize = new URL(parsed);
    for (const key of resizeKeys) withoutResize.searchParams.delete(key);
    for (const key of [...withoutResize.searchParams.keys()]) {
      if (HEIGHT_QUERY_KEY_PATTERN.test(key)) withoutResize.searchParams.delete(key);
    }
    add(withoutResize.toString(), Number.MAX_SAFE_INTEGER, "remove_resize_parameters");

    for (const targetWidth of targetWidths) {
      const upgraded = new URL(parsed);
      let changed = false;
      for (const key of resizeKeys) {
        const currentValue = upgraded.searchParams.get(key) || "";
        const replacement = replaceWidthLikeValue(currentValue, targetWidth);
        if (replacement !== currentValue) {
          upgraded.searchParams.set(key, replacement);
          changed = true;
        }
      }
      if (changed) {
        for (const key of [...upgraded.searchParams.keys()]) {
          if (HEIGHT_QUERY_KEY_PATTERN.test(key)) upgraded.searchParams.delete(key);
        }
        add(upgraded.toString(), targetWidth, "increase_resize_parameter");
      }
    }
  }

  const pathname = parsed.pathname;
  for (const targetWidth of targetWidths) {
    const upgraded = new URL(parsed);
    let upgradedPath = pathname
      .replace(/\{\{\s*width\s*\}\}|\{\s*width\s*\}|%7B%7Bwidth%7D%7D/gi, String(targetWidth))
      .replace(/\/w_\d{2,5}(?=\/)/gi, `/w_${targetWidth}`)
      .replace(/([_-])w\d{2,5}(?=\.(?:avif|gif|jpe?g|png|webp)$)/i, `$1w${targetWidth}`)
      .replace(/([_-])\d{2,5}x(?=\.(?:avif|gif|jpe?g|png|webp)$)/i, `$1${targetWidth}x`);
    if (upgradedPath !== pathname) {
      upgraded.pathname = upgradedPath;
      add(upgraded.toString(), targetWidth, "increase_path_width");
    }
  }

  return variants;
}

export function collectProductImageCandidates({
  html = "",
  pageUrl = "",
  primaryImageUrl = "",
  productTitle = "",
  renderedCandidates = [],
}) {
  const candidates = [];
  const seen = new Set();
  const sourceText = String(html || "");

  const add = ({
    url,
    source = "image",
    alt = "",
    context = "",
    declaredWidth = 0,
    roleScore,
    derivedFrom = "",
  }) => {
    const resolved = resolveHttpUrl(url, pageUrl || primaryImageUrl || url);
    if (!resolved) return;
    const sourceCanProveImage =
      /^(?:selected_product_image|product_json_ld|og:image|img:|picture:source:|rendered:)/i.test(
        source
      );
    const urlLooksLikeImage =
      IMAGE_URL_PATTERN.test(resolved) ||
      /[?&](?:format|fm|image-format|auto)=(?:avif|gif|jpe?g|png|webp|format)/i.test(
        resolved
      );
    if (!sourceCanProveImage && !urlLooksLikeImage) return;
    if (seen.has(resolved)) return;
    seen.add(resolved);
    candidates.push({
      url: resolved,
      source,
      alt: String(alt || ""),
      context: String(context || "").slice(0, 700),
      declaredWidth: Number(declaredWidth || 0),
      roleScore: Number.isFinite(Number(roleScore))
        ? Number(roleScore)
        : inferContextRoleScore({
            source,
            context,
            url: resolved,
            declaredWidth,
          }),
      assetKey: canonicalProductImageAssetKey(resolved),
      derivedFrom: derivedFrom || null,
    });
  };

  add({
    url: primaryImageUrl,
    source: "selected_product_image",
    context: "primary selected product image",
    roleScore: 125,
  });

  for (const image of collectJsonLdProductImages(sourceText, pageUrl)) {
    add({
      url: image.url,
      source: "product_json_ld",
      context: `${productTitle} Product JSON-LD`,
      roleScore: image.productIndex === 0 ? 108 : 72,
    });
  }

  const metaPattern =
    /<meta\b[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*>/gi;
  for (const tag of sourceText.match(metaPattern) || []) {
    add({
      url: getTagAttribute(tag, "content"),
      source: "og:image",
      context: tag,
      roleScore: 76,
    });
  }

  const directAttributes = [
    "src",
    "data-src",
    "data-original",
    "data-lazy",
    "data-lazy-src",
    "data-image",
    "data-image-src",
    "data-src-large",
    "data-zoom-image",
    "data-img-zoom-url",
    "data-full",
    "data-large",
    "data-large-image",
    "data-full-image",
    "data-original-src",
  ];
  const srcsetAttributes = [
    "srcset",
    "data-srcset",
    "data-lazy-srcset",
  ];
  const imagePattern = /<img\b[^>]*>/gi;
  let imageMatch;
  while ((imageMatch = imagePattern.exec(sourceText)) !== null) {
    const tag = imageMatch[0];
    const context = sourceText.slice(
      Math.max(0, imageMatch.index - 450),
      Math.min(sourceText.length, imageMatch.index + tag.length + 450)
    );
    const alt = getTagAttribute(tag, "alt");

    for (const attribute of directAttributes) {
      const url = getTagAttribute(tag, attribute);
      if (!url) continue;
      add({
        url,
        source: `img:${attribute}`,
        alt,
        context,
      });
    }

    for (const attribute of srcsetAttributes) {
      for (const entry of parseSrcset(getTagAttribute(tag, attribute))) {
        add({
          url: entry.url,
          source: `img:${attribute}`,
          alt,
          context,
          declaredWidth: entry.declaredWidth,
        });
      }
    }
  }

  const sourcePattern = /<source\b[^>]*>/gi;
  for (const tag of sourceText.match(sourcePattern) || []) {
    const context = tag;
    for (const attribute of srcsetAttributes) {
      for (const entry of parseSrcset(getTagAttribute(tag, attribute))) {
        add({
          url: entry.url,
          source: `picture:source:${attribute}`,
          context,
          declaredWidth: entry.declaredWidth,
        });
      }
    }
  }

  const linkedImagePattern =
    /<a\b[^>]*href=(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>[\s\S]{0,1800}?<img\b[^>]*>[\s\S]{0,500}?<\/a>/gi;
  let linkedMatch;
  while ((linkedMatch = linkedImagePattern.exec(sourceText)) !== null) {
    const href = linkedMatch[1] || linkedMatch[2] || linkedMatch[3] || "";
    if (!IMAGE_URL_PATTERN.test(href)) continue;
    add({
      url: href,
      source: "anchor:image",
      context: linkedMatch[0],
    });
  }

  const cssImagePattern = /url\((['"]?)(https?:[^)'"]+)\1\)/gi;
  let cssMatch;
  while ((cssMatch = cssImagePattern.exec(sourceText)) !== null) {
    add({
      url: cssMatch[2],
      source: "css:background-image",
      context: sourceText.slice(
        Math.max(0, cssMatch.index - 220),
        Math.min(sourceText.length, cssMatch.index + cssMatch[0].length + 220)
      ),
      roleScore: 28,
    });
  }

  const embeddedUrlPattern =
    /https?:\\?\/\\?\/[^"'<>\s)\]]+\.(?:avif|gif|jpe?g|png|webp)(?:\?[^"'<>\s)\]]*)?/gi;
  let embeddedMatch;
  let embeddedCount = 0;
  while (
    embeddedCount < 100 &&
    (embeddedMatch = embeddedUrlPattern.exec(sourceText)) !== null
  ) {
    embeddedCount += 1;
    add({
      url: embeddedMatch[0],
      source: "embedded:image",
      context: sourceText.slice(
        Math.max(0, embeddedMatch.index - 180),
        Math.min(sourceText.length, embeddedMatch.index + embeddedMatch[0].length + 180)
      ),
      roleScore: 30,
    });
  }

  for (const candidate of renderedCandidates || []) {
    add({
      url: candidate?.url,
      source: candidate?.source || "rendered:browser",
      alt: candidate?.alt || "",
      context: candidate?.context || "rendered product gallery",
      declaredWidth: candidate?.declaredWidth || candidate?.naturalWidth || 0,
      roleScore: candidate?.roleScore,
    });
  }

  const basesForVariants = [...candidates]
    .filter(
      (candidate) =>
        candidate.roleScore >= 75 ||
        candidate.assetKey === canonicalProductImageAssetKey(primaryImageUrl)
    )
    .sort((left, right) => right.roleScore - left.roleScore)
    .slice(0, 18);

  for (const base of basesForVariants) {
    for (const variant of generateGenericHighResolutionImageUrls(base.url)) {
      add({
        url: variant.url,
        source: `derived:${variant.strategy}`,
        alt: base.alt,
        context: base.context,
        declaredWidth: variant.declaredWidth,
        roleScore: base.roleScore + 8,
        derivedFrom: base.url,
      });
    }
  }

  return candidates
    .sort((left, right) => {
      if (right.roleScore !== left.roleScore) {
        return right.roleScore - left.roleScore;
      }
      return right.declaredWidth - left.declaredWidth;
    })
    .slice(0, 120);
}

export function productImageFingerprintSimilarity(left, right) {
  if (!left || !right || left.length !== right.length || !left.length) return 0;
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    distance += Math.abs(Number(left[index] || 0) - Number(right[index] || 0));
  }
  return Math.max(0, 1 - distance / (left.length * 255));
}

export function isPreferredProductImage(metadata) {
  const width = Number(metadata?.width || 0);
  const height = Number(metadata?.height || 0);
  return (
    Math.max(width, height) >= PRODUCT_IMAGE_PREFERRED_WIDTH &&
    width * height >= PRODUCT_IMAGE_PREFERRED_AREA
  );
}

async function inspectWithConcurrency(items, inspectImage, concurrency = 4) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.max(1, Math.min(concurrency, items.length || 1)) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        const candidate = items[index];
        try {
          const inspected = await inspectImage(candidate.url);
          results[index] = {
            ...candidate,
            ...inspected,
            width: Number(inspected?.width || 0),
            height: Number(inspected?.height || 0),
            area:
              Number(inspected?.width || 0) * Number(inspected?.height || 0),
          };
        } catch (error) {
          results[index] = {
            ...candidate,
            rejected: true,
            rejectionMessage: error?.message || "Image inspection failed",
          };
        }
      }
    }
  );
  await Promise.all(workers);
  return results;
}

export async function selectLargestVerifiedProductImage({
  candidates = [],
  primaryImageUrl = "",
  inspectImage,
  maximumInspections = PRODUCT_IMAGE_MAX_INSPECTIONS,
}) {
  if (typeof inspectImage !== "function") {
    throw new Error("Product image inspection callback is required");
  }

  const primaryKey = canonicalProductImageAssetKey(primaryImageUrl);
  const sorted = [...candidates].sort((left, right) => {
    const leftSameAsset = left.assetKey && left.assetKey === primaryKey ? 1 : 0;
    const rightSameAsset = right.assetKey && right.assetKey === primaryKey ? 1 : 0;
    if (rightSameAsset !== leftSameAsset) return rightSameAsset - leftSameAsset;
    if (right.roleScore !== left.roleScore) return right.roleScore - left.roleScore;
    return right.declaredWidth - left.declaredWidth;
  });

  const inspectionCandidates = [];
  const seen = new Set();
  for (const candidate of sorted) {
    if (!candidate?.url || seen.has(candidate.url)) continue;
    const samePrimaryAsset =
      Boolean(primaryKey) && candidate.assetKey === primaryKey;
    if (
      !samePrimaryAsset &&
      candidate.roleScore < 70 &&
      inspectionCandidates.length >= 8
    ) {
      continue;
    }
    seen.add(candidate.url);
    inspectionCandidates.push(candidate);
    if (inspectionCandidates.length >= maximumInspections) break;
  }

  const inspected = await inspectWithConcurrency(
    inspectionCandidates,
    inspectImage,
    4
  );
  const accepted = inspected.filter(
    (candidate) =>
      !candidate.rejected && candidate.width > 0 && candidate.height > 0
  );
  const rejected = inspected.filter((candidate) => candidate.rejected);

  if (!accepted.length) {
    const error = new Error("No product image candidate could be downloaded and decoded");
    error.imageCandidateFailures = rejected.slice(0, 12);
    throw error;
  }

  const primaryInspected =
    accepted.find((candidate) => candidate.url === primaryImageUrl) ||
    accepted.find((candidate) => candidate.assetKey === primaryKey) ||
    null;

  for (const candidate of accepted) {
    candidate.samePrimaryAsset =
      Boolean(primaryKey) && candidate.assetKey === primaryKey;
    candidate.fingerprintSimilarity =
      primaryInspected?.fingerprint && candidate?.fingerprint
        ? productImageFingerprintSimilarity(
            primaryInspected.fingerprint,
            candidate.fingerprint
          )
        : 0;
    candidate.identityVerified =
      candidate.samePrimaryAsset ||
      candidate.fingerprintSimilarity >= 0.86 ||
      candidate.roleScore >= 105;
  }

  const verified = accepted.filter((candidate) => candidate.identityVerified);
  const selectionPool = verified.length
    ? verified
    : primaryInspected
      ? [primaryInspected]
      : accepted.filter((candidate) => candidate.roleScore >= 90);
  const safePool = selectionPool.length ? selectionPool : [accepted[0]];

  safePool.sort((left, right) => {
    if (right.area !== left.area) return right.area - left.area;
    if (right.roleScore !== left.roleScore) return right.roleScore - left.roleScore;
    return right.fingerprintSimilarity - left.fingerprintSimilarity;
  });

  const selected = safePool[0];
  return {
    selected,
    inspected: accepted,
    rejected,
    preferredQuality: isPreferredProductImage(selected),
    usedSmallImageFallback: !isPreferredProductImage(selected),
  };
}
