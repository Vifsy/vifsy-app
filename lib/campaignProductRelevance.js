const DIRECT_RELEVANCE_CLASSES = new Set([
  "direct",
  "explicit",
  "theme_direct",
]);

const CONTEXTUAL_RELEVANCE_CLASSES = new Set([
  "contextual",
  "semantic",
  "theme_contextual",
  "occasion_fit",
]);

const GENERIC_RELEVANCE_CLASSES = new Set([
  "generic",
  "giftable",
  "weak",
]);

const REJECT_RELEVANCE_CLASSES = new Set([
  "reject",
  "rejected",
  "unrelated",
]);

export function normalizeCampaignRelevanceClass(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");

  if (DIRECT_RELEVANCE_CLASSES.has(normalized)) return "direct";
  if (CONTEXTUAL_RELEVANCE_CLASSES.has(normalized)) return "contextual";
  if (GENERIC_RELEVANCE_CLASSES.has(normalized)) return "generic";
  if (REJECT_RELEVANCE_CLASSES.has(normalized)) return "reject";
  return "";
}

export function normalizeCampaignRelevanceEvidence(value, limit = 8) {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(/[\n;|]+/u)
        .filter(Boolean);
  const seen = new Set();
  const evidence = [];

  for (const entry of source) {
    const text = String(entry || "").replace(/\s+/gu, " ").trim().slice(0, 220);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    evidence.push(text);
    if (evidence.length >= limit) break;
  }

  return evidence;
}

export function evaluateCampaignProductRelevance({
  directMatches = 0,
  aiScore = null,
  verdict = "",
  relevanceClass = "",
  campaignRole = "",
  evidence = [],
  reason = "",
  directMinimumScore = 75,
  contextualMinimumScore = 80,
} = {}) {
  const normalizedClass = normalizeCampaignRelevanceClass(relevanceClass);
  const normalizedEvidence = normalizeCampaignRelevanceEvidence(evidence);
  const normalizedRole = String(campaignRole || "").replace(/\s+/gu, " ").trim();
  const normalizedReason = String(reason || "").replace(/\s+/gu, " ").trim();
  const numericScore =
    aiScore === null || aiScore === undefined || !Number.isFinite(Number(aiScore))
      ? null
      : Math.min(100, Math.max(0, Math.round(Number(aiScore))));
  const rejected =
    normalizedClass === "reject" ||
    /(?:^|\b)(?:reject|rejected)(?:\b|$)/i.test(String(verdict || ""));
  const hasDirectEvidence = Number(directMatches || 0) > 0;
  const hasAuditableContext =
    normalizedEvidence.length > 0 &&
    normalizedRole.length >= 3 &&
    normalizedReason.length >= 12;
  const directApproved =
    hasDirectEvidence &&
    !rejected &&
    (numericScore === null || numericScore >= directMinimumScore);
  const contextualApproved =
    !hasDirectEvidence &&
    !rejected &&
    normalizedClass === "contextual" &&
    numericScore !== null &&
    numericScore >= contextualMinimumScore &&
    hasAuditableContext;

  let tier = "reject";
  if (directApproved) {
    tier = "direct";
  } else if (contextualApproved) {
    tier = "contextual";
  } else if (!rejected && normalizedClass === "generic") {
    tier = "generic";
  }

  return {
    tier,
    meaningful: directApproved || contextualApproved,
    directApproved,
    contextualApproved,
    rejected,
    relevanceClass: normalizedClass,
    campaignRole: normalizedRole,
    evidence: normalizedEvidence,
    score: numericScore,
    hasAuditableContext,
  };
}

export function rankDefensibleCampaignCandidates(candidates, limit = 5) {
  const tierWeight = {
    direct: 3,
    contextual: 2,
    generic: 1,
    reject: 0,
  };

  return (Array.isArray(candidates) ? candidates : [])
    .map((candidate, index) => {
      const relevance = evaluateCampaignProductRelevance(candidate);
      return {
        ...candidate,
        relevance,
        _inputIndex: index,
      };
    })
    .filter((candidate) => candidate.relevance.meaningful)
    .sort((left, right) => {
      const tierDelta =
        tierWeight[right.relevance.tier] - tierWeight[left.relevance.tier];
      if (tierDelta !== 0) return tierDelta;

      const scoreDelta =
        Number(right.relevance.score || 0) -
        Number(left.relevance.score || 0);
      if (scoreDelta !== 0) return scoreDelta;

      if (Boolean(left.usedRecently) !== Boolean(right.usedRecently)) {
        return left.usedRecently ? 1 : -1;
      }

      return left._inputIndex - right._inputIndex;
    })
    .slice(0, Math.max(0, Number(limit) || 0))
    .map(({ _inputIndex, ...candidate }) => candidate);
}
