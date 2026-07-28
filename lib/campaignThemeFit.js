function normalizeVerdict(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/gu, " ");
}

const weakThemeRoots = new Set([
  "and",
  "att",
  "den",
  "det",
  "dit",
  "din",
  "for",
  "med",
  "och",
  "per",
  "pre",
  "pro",
  "the",
  "til",
  "till",
]);

function normalizeThemeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function getCommonPrefix(values) {
  const normalized = (values || []).filter(Boolean);
  if (!normalized.length) return "";
  let prefix = normalized[0];

  for (const value of normalized.slice(1)) {
    while (prefix && !value.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
    }
    if (!prefix) break;
  }

  return prefix;
}

function isUsefulThemeRoot(value) {
  return (
    value.length >= 3 &&
    value.length <= 12 &&
    !/^\d+$/u.test(value) &&
    !weakThemeRoots.has(value)
  );
}

export function deriveSharedCampaignThemeRoots(terms) {
  const normalizedTerms = Array.from(
    new Set(
      (Array.isArray(terms) ? terms : [])
        .map(normalizeThemeText)
        .filter(Boolean)
    )
  );
  const words = normalizedTerms.flatMap((term) => term.split(" "));
  const roots = [];

  // A short term explicitly supplied by the semantic theme contract is safe
  // to retain as-is. It is not inferred from an arbitrary product title.
  for (const term of normalizedTerms) {
    if (!term.includes(" ") && term.length <= 6 && isUsefulThemeRoot(term)) {
      roots.push(term);
    }
  }

  const grouped = new Map();
  for (const word of words.filter((value) => value.length >= 5)) {
    const key = word.slice(0, 3);
    if (!isUsefulThemeRoot(key)) continue;
    if (!grouped.has(key)) grouped.set(key, new Set());
    grouped.get(key).add(word);
  }

  for (const group of grouped.values()) {
    const variants = Array.from(group);
    if (variants.length < 2) continue;
    const commonPrefix = getCommonPrefix(variants);
    if (!isUsefulThemeRoot(commonPrefix)) continue;

    // Three-character roots are useful for compact themes such as Swedish
    // compound words, but require three independent contract variants to
    // prevent a coincidental pair from creating a broad match.
    if (commonPrefix.length === 3 && variants.length < 3) continue;
    roots.push(commonPrefix);
  }

  return Array.from(new Set(roots)).slice(0, 8);
}

export function expandCampaignThemeTerms(terms) {
  const normalizedTerms = (Array.isArray(terms) ? terms : [])
    .map(normalizeThemeText)
    .filter(Boolean);

  return Array.from(
    new Set([
      ...deriveSharedCampaignThemeRoots(normalizedTerms),
      ...normalizedTerms,
    ])
  ).slice(0, 24);
}

export function hasCampaignThemeFamilyMatch(value, terms) {
  const text = normalizeThemeText(value);
  const tokens = text.split(" ").filter(Boolean);

  return expandCampaignThemeTerms(terms).some((term) => {
    if (text === term || text.includes(` ${term} `) || text.startsWith(`${term} `) || text.endsWith(` ${term}`)) {
      return true;
    }

    if (term.length <= 6) {
      return tokens.some(
        (token) => token === term || (token.startsWith(term) && token.length >= term.length + 2)
      );
    }

    return tokens.some((token) => {
      if (token === term) return true;
      const minimumLength = Math.min(token.length, term.length);
      const commonLength = getCommonPrefix([token, term]).length;
      return (
        commonLength >= Math.min(7, minimumLength) ||
        commonLength >= Math.ceil(minimumLength * 0.8)
      );
    });
  });
}

export function evaluateCampaignFallbackEligibility({
  explicitlyRejected = false,
  hasAiEvaluation = false,
  hasAiApproval = false,
  hasDirectThemeEvidence = false,
  productPageVerified = false,
  contextualProductMatches = 0,
  trustedCampaignSearch = false,
} = {}) {
  const hasVerifiedContextualEvidence =
    productPageVerified === true &&
    Number(contextualProductMatches || 0) > 0 &&
    trustedCampaignSearch === true;
  const approved = explicitlyRejected
    ? false
    : hasAiEvaluation
      ? hasAiApproval === true
      : hasDirectThemeEvidence === true || hasVerifiedContextualEvidence;

  return {
    approved,
    hasVerifiedContextualEvidence,
  };
}

export function evaluateSimpleCampaignThemeFit({
  fitsTheme = null,
  verdict = "",
  score = null,
} = {}) {
  const explicitDecision =
    fitsTheme === true ? true : fitsTheme === false ? false : null;
  const normalizedVerdict = normalizeVerdict(verdict);
  const rejected =
    explicitDecision === false ||
    /^(?:weak|reject|rejected|does_not_fit|does not fit|not_fit|unrelated)$/i.test(
      normalizedVerdict
    );
  const approved =
    !rejected &&
    (explicitDecision === true ||
      /^(?:fits|fit|strong|excellent|approved|pass|good)$/i.test(
        normalizedVerdict
      ) ||
      (explicitDecision === null &&
        Number.isFinite(Number(score)) &&
        Number(score) >= 55));

  return {
    approved,
    rejected,
    explicitDecision,
    verdict: normalizedVerdict,
  };
}

export function selectThemeFittingProducts(candidates, limit = 5) {
  return (Array.isArray(candidates) ? candidates : [])
    .map((candidate, index) => ({
      ...candidate,
      themeFit: evaluateSimpleCampaignThemeFit(candidate),
      _inputIndex: index,
    }))
    .filter((candidate) => candidate.themeFit.approved)
    .sort((left, right) => {
      if (Boolean(left.directThemeEvidence) !== Boolean(right.directThemeEvidence)) {
        return left.directThemeEvidence ? -1 : 1;
      }
      const scoreDelta = Number(right.score || 0) - Number(left.score || 0);
      if (scoreDelta !== 0) return scoreDelta;
      if (Boolean(left.usedRecently) !== Boolean(right.usedRecently)) {
        return left.usedRecently ? 1 : -1;
      }
      return left._inputIndex - right._inputIndex;
    })
    .slice(0, Math.max(0, Number(limit) || 0))
    .map(({ _inputIndex, ...candidate }) => candidate);
}
