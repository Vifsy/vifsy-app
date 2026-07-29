const DELIVERY_TIER_RANK = Object.freeze({
  direct: 0,
  contextual: 1,
  generic: 2,
  competing: 3,
});

const COLOR_WORDS = new Set([
  "beige",
  "black",
  "blue",
  "brown",
  "coral",
  "cream",
  "gold",
  "gray",
  "green",
  "grey",
  "ivory",
  "khaki",
  "lilac",
  "maroon",
  "multi",
  "navy",
  "olive",
  "orange",
  "pink",
  "purple",
  "red",
  "rose",
  "sand",
  "silver",
  "tan",
  "taupe",
  "teal",
  "turquoise",
  "vanilla",
  "white",
  "yellow",
  "beige",
  "bla",
  "blå",
  "brun",
  "gra",
  "grå",
  "gron",
  "grön",
  "gul",
  "lila",
  "marin",
  "rod",
  "röd",
  "rosa",
  "svart",
  "vit",
]);

const COLOR_MODIFIERS = new Set([
  "bright",
  "dark",
  "deep",
  "dusty",
  "light",
  "medium",
  "off",
  "pale",
  "pastel",
  "soft",
  "warm",
  "mork",
  "mörk",
  "ljus",
]);

const PRODUCT_TYPE_PATTERNS = [
  ["backpack", /\b(?:backpack|daypack|rucksack|ryggsack|ryggsäck|skolvaska|skolväska)\b/u],
  ["shorts", /\b(?:shorts|kortbyxor|traningsshorts|träningsshorts)\b/u],
  ["leggings", /\b(?:legging|leggings|tights|lopartights|löpartights)\b/u],
  ["pants", /\b(?:pants|trousers|joggers|sweatpants|byxor|traningsbyxor|träningsbyxor)\b/u],
  ["sleepwear", /\b(?:nightwear|pajama|pajamas|pyjama|pyjamas|nattplagg|nattklader|nattkläder)\b/u],
  ["jacket", /\b(?:jacket|coat|parka|anorak|jacka|kappa|rock|traningsjacka|träningsjacka)\b/u],
  ["hoodie", /\b(?:hoodie|hooded|sweatshirt|luvtroja|luvtröja|huvtroja|huvtröja)\b/u],
  ["tshirt", /\b(?:tshirt|t shirt|tee|troja|tröja)\b/u],
  ["shirt", /\b(?:shirt|skjorta|blouse|blus)\b/u],
  ["sports_top", /\b(?:sports bra|sport bra|sportbeha|sportbehå|tank top|linne|training top|traningstopp|träningstopp)\b/u],
  ["top", /\b(?:top|topp)\b/u],
  ["shoes", /\b(?:shoe|shoes|sneaker|sneakers|trainer|trainers|boot|boots|sandal|sandals|sko|skor|kanga|känga)\b/u],
  ["bag", /\b(?:bag|bags|vaska|väska|gymbag|duffel)\b/u],
  ["dress", /\b(?:dress|klanning|klänning)\b/u],
  ["skirt", /\b(?:skirt|kjol)\b/u],
  ["hat", /\b(?:hat|cap|beanie|mossa|mössa|keps)\b/u],
  ["jewelry", /\b(?:jewelry|jewellery|necklace|earring|bracelet|ring|smycke|smycken|halsband|orhange|örhänge|armband)\b/u],
  ["beauty", /\b(?:perfume|fragrance|cosmetic|makeup|skincare|parfym|smink|hudvard|hudvård)\b/u],
  ["home", /\b(?:blanket|cushion|lamp|vase|mug|filt|kudde|lampa|vas|mugg)\b/u],
  ["toy", /\b(?:toy|toys|game|games|docka|leksak|leksaker|spel)\b/u],
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/gu, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function splitVariantDescriptor(value) {
  return normalizeText(value)
    .split(" ")
    .filter(Boolean);
}

function isLikelyVariantDescriptor(value) {
  const words = splitVariantDescriptor(value);
  if (!words.length || words.length > 5) return false;

  if (
    words.every(
      (word) => COLOR_WORDS.has(word) || COLOR_MODIFIERS.has(word)
    ) &&
    words.some((word) => COLOR_WORDS.has(word))
  ) {
    return true;
  }

  return words.every((word) =>
    /^(?:xxxs|xxs|xs|s|m|l|xl|xxl|xxxl|3xl|4xl|5xl|\d{1,4}(?:[.,]\d+)?(?:mm|cm|m|in|ml|cl|dl|l|g|kg)?)$/u.test(
      word
    )
  );
}

export function getCampaignProductFamilySignature(item) {
  const rawTitle = String(item?.title || item?.item_title || "").trim();
  if (!rawTitle) return "";

  const segments = rawTitle
    .split(/\s+(?:[-–—|])\s+/u)
    .map((segment) => segment.trim())
    .filter(Boolean);

  while (
    segments.length > 1 &&
    isLikelyVariantDescriptor(segments[segments.length - 1])
  ) {
    segments.pop();
  }

  const normalized = normalizeText(segments.join(" "))
    .replace(
      /\b(?:size|storlek|variant|colour|color|farg)\s+(?:xxxs|xxs|xs|s|m|l|xl|xxl|xxxl|3xl|4xl|5xl|\d{1,4}(?:[.,]\d+)?)\b/gu,
      " "
    )
    .replace(/\s+/gu, " ")
    .trim();

  return normalized.length >= 6 ? normalized : "";
}

export function inferCampaignProductType(item) {
  const tags = Array.isArray(item?.tags) ? item.tags.join(" ") : "";
  const source = normalizeText(
    [
      item?.product_type,
      item?.category,
      item?.title,
      item?.item_title,
      tags,
    ]
      .filter(Boolean)
      .join(" ")
  );

  for (const [type, pattern] of PRODUCT_TYPE_PATTERNS) {
    if (pattern.test(source)) return type;
  }

  const category = normalizeText(item?.product_type || item?.category || "");
  if (category.length >= 3 && category.length <= 50) {
    return `category:${category}`;
  }

  return "";
}

function getEntryId(entry, index) {
  const item = entry?.item || {};
  return [
    Number.isInteger(entry?.originalIndex) ? entry.originalIndex : index,
    item?.url || item?.product_url || item?.item_url || "",
    item?.title || item?.item_title || "",
  ].join("|");
}

function getEntryQuality(entry, rankIndex, poolSize) {
  const item = entry?.item || {};
  const scoreCandidates = [
    item?.ai_campaign_fit_senior_score,
    item?.ai_campaign_fit_score,
    entry?.contextualScore,
    item?.campaign_fit_score,
  ];
  const rawScore = scoreCandidates
    .map(Number)
    .find((value) => Number.isFinite(value));
  const normalizedScore = Number.isFinite(rawScore)
    ? Math.max(0, Math.min(100, rawScore))
    : 50;
  const rankBonus = Math.max(0, poolSize - rankIndex) * 5;
  return normalizedScore * 4 + rankBonus;
}

function countValues(values) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) {
    counts.set(value, Number(counts.get(value) || 0) + 1);
  }
  return counts;
}

function scoreCombination(combination, rankedEntries) {
  let score = 0;
  const typeKeys = [];

  for (const candidate of combination) {
    score += getEntryQuality(
      candidate.entry,
      candidate.rankIndex,
      rankedEntries.length
    );
    typeKeys.push(inferCampaignProductType(candidate.entry?.item));
  }

  const typeCounts = countValues(typeKeys);
  score += typeCounts.size * 70;
  for (const count of typeCounts.values()) {
    if (count > 1) {
      score -= (count - 1) * (count - 1) * 85;
    }
  }

  return score;
}

function visitCombinations(candidates, targetSize, visitor) {
  const combination = [];

  function visit(startIndex) {
    if (combination.length === targetSize) {
      visitor([...combination]);
      return;
    }

    const remainingNeeded = targetSize - combination.length;
    for (
      let index = startIndex;
      index <= candidates.length - remainingNeeded;
      index += 1
    ) {
      combination.push(candidates[index]);
      visit(index + 1);
      combination.pop();
    }
  }

  visit(0);
}

function summarizeTypes(entries) {
  return Object.fromEntries(
    countValues(entries.map((entry) => inferCampaignProductType(entry?.item)))
  );
}

export function selectDiverseCampaignDeliveryEntries(
  rankedEntries = [],
  { selectedLimit = 5, reserveLimit = 3 } = {}
) {
  const ranked = Array.isArray(rankedEntries) ? rankedEntries : [];
  const safeSelectedLimit = Math.max(0, Number(selectedLimit || 0));
  const safeReserveLimit = Math.max(0, Number(reserveLimit || 0));
  const originalSelected = ranked.slice(0, safeSelectedLimit);

  if (originalSelected.length <= 1) {
    return {
      selectedEntries: originalSelected,
      reserveEntries: ranked.slice(
        originalSelected.length,
        originalSelected.length + safeReserveLimit
      ),
      diagnostics: {
        applied: false,
        familyVariantCountRemoved: 0,
        originalTypeCounts: summarizeTypes(originalSelected),
        selectedTypeCounts: summarizeTypes(originalSelected),
      },
    };
  }

  const worstSelectedTierRank = originalSelected.reduce(
    (worst, entry) =>
      Math.max(
        worst,
        Number(
          DELIVERY_TIER_RANK[entry?.deliveryTier] ??
            DELIVERY_TIER_RANK.generic
        )
      ),
    DELIVERY_TIER_RANK.direct
  );
  const tierSafeEntries = ranked.filter(
    (entry) =>
      Number(
        DELIVERY_TIER_RANK[entry?.deliveryTier] ??
          DELIVERY_TIER_RANK.generic
      ) <= worstSelectedTierRank
  );

  // Keep the strongest member of each product family. A colour or size
  // variant is not a second product concept for a marketing carousel.
  const strongestFamilyEntry = new Map();
  const uniqueEntries = [];
  let familyVariantCountRemoved = 0;

  tierSafeEntries.forEach((entry, rankIndex) => {
    const familySignature = getCampaignProductFamilySignature(entry?.item);
    const familyKey = familySignature
      ? `family:${familySignature}`
      : `entry:${getEntryId(entry, rankIndex)}`;

    if (strongestFamilyEntry.has(familyKey)) {
      familyVariantCountRemoved += 1;
      return;
    }

    strongestFamilyEntry.set(familyKey, entry);
    uniqueEntries.push({ entry, rankIndex });
  });

  const targetSize = Math.min(safeSelectedLimit, uniqueEntries.length);
  if (!targetSize) {
    return {
      selectedEntries: [],
      reserveEntries: [],
      diagnostics: {
        applied: originalSelected.length > 0,
        familyVariantCountRemoved,
        originalTypeCounts: summarizeTypes(originalSelected),
        selectedTypeCounts: {},
      },
    };
  }

  let bestCombination = uniqueEntries.slice(0, targetSize);
  let bestScore = scoreCombination(bestCombination, ranked);

  // Final-review shortlists are bounded to 15. Keep a defensive ceiling so a
  // future larger pool can never turn this local calculation into a timeout.
  const boundedCandidates = uniqueEntries.slice(0, 18);
  visitCombinations(boundedCandidates, targetSize, (combination) => {
    const score = scoreCombination(combination, ranked);
    if (score > bestScore) {
      bestScore = score;
      bestCombination = combination;
    }
  });

  const selectedIds = new Set(
    bestCombination.map(({ entry, rankIndex }) => getEntryId(entry, rankIndex))
  );
  const selectedEntries = bestCombination
    .sort((left, right) => left.rankIndex - right.rankIndex)
    .map(({ entry }) => entry);
  const reserveEntries = uniqueEntries
    .filter(({ entry, rankIndex }) => !selectedIds.has(getEntryId(entry, rankIndex)))
    .slice(0, safeReserveLimit)
    .map(({ entry }) => entry);
  const originalIds = originalSelected.map((entry, index) =>
    getEntryId(entry, index)
  );
  const finalIds = selectedEntries.map((entry, index) =>
    getEntryId(entry, index)
  );

  return {
    selectedEntries,
    reserveEntries,
    diagnostics: {
      applied:
        familyVariantCountRemoved > 0 ||
        originalIds.length !== finalIds.length ||
        originalIds.some((id, index) => id !== finalIds[index]),
      familyVariantCountRemoved,
      originalTypeCounts: summarizeTypes(originalSelected),
      selectedTypeCounts: summarizeTypes(selectedEntries),
      candidateCount: ranked.length,
      tierSafeCandidateCount: tierSafeEntries.length,
      distinctFamilyCandidateCount: uniqueEntries.length,
    },
  };
}
