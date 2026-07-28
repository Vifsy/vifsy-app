export const CAMPAIGN_THEME_DELIVERY_TIERS = Object.freeze({
  direct: 0,
  contextual: 1,
  generic: 2,
  competing: 3,
});

export function getCampaignThemeDeliveryTier({
  currentThemeMatches = 0,
  competingThemeMatches = 0,
  contextualApproved = false,
} = {}) {
  if (Number(currentThemeMatches || 0) > 0) return "direct";
  if (Number(competingThemeMatches || 0) > 0) return "competing";
  if (contextualApproved) return "contextual";
  return "generic";
}

export function resolveCampaignThemeEvidence({
  currentThemeMatches = 0,
  competingThemeMatches = 0,
} = {}) {
  const current = Math.max(0, Number(currentThemeMatches || 0));
  const competing = Math.max(0, Number(competingThemeMatches || 0));
  const currentThemeWins =
    current > 0 && (competing === 0 || current > competing);

  return {
    currentThemeMatches: currentThemeWins ? current : 0,
    competingThemeMatches:
      competing > 0 && !currentThemeWins ? competing : 0,
  };
}

export function rankCampaignThemeDeliveryEntries(entries = []) {
  return (Array.isArray(entries) ? entries : [])
    .map((entry, index) => ({
      ...entry,
      originalIndex: Number.isInteger(entry?.originalIndex)
        ? entry.originalIndex
        : index,
      deliveryTier:
        entry?.deliveryTier ||
        getCampaignThemeDeliveryTier({
          currentThemeMatches: entry?.currentThemeMatches,
          competingThemeMatches: entry?.competingThemeMatches,
          contextualApproved: entry?.contextualApproved,
        }),
    }))
    .sort((left, right) => {
      const tierDelta =
        Number(
          CAMPAIGN_THEME_DELIVERY_TIERS[left.deliveryTier] ??
            CAMPAIGN_THEME_DELIVERY_TIERS.generic
        ) -
        Number(
          CAMPAIGN_THEME_DELIVERY_TIERS[right.deliveryTier] ??
            CAMPAIGN_THEME_DELIVERY_TIERS.generic
        );
      if (tierDelta !== 0) return tierDelta;

      const currentThemeDelta =
        Number(right?.currentThemeMatches || 0) -
        Number(left?.currentThemeMatches || 0);
      if (currentThemeDelta !== 0) return currentThemeDelta;

      const preferredDelta =
        Number(left?.preferredRank ?? Number.MAX_SAFE_INTEGER) -
        Number(right?.preferredRank ?? Number.MAX_SAFE_INTEGER);
      if (preferredDelta !== 0) return preferredDelta;

      const contextualDelta =
        Number(right?.contextualScore || 0) -
        Number(left?.contextualScore || 0);
      if (contextualDelta !== 0) return contextualDelta;

      const qualityDelta =
        Number(right?.qualityScore || 0) - Number(left?.qualityScore || 0);
      if (qualityDelta !== 0) return qualityDelta;

      return left.originalIndex - right.originalIndex;
    });
}

export function selectCampaignThemeDeliveryEntries(
  entries = [],
  { selectedLimit = 5, reserveLimit = 3 } = {}
) {
  const ranked = rankCampaignThemeDeliveryEntries(entries);
  const safeSelectedLimit = Math.max(0, Number(selectedLimit || 0));
  const safeReserveLimit = Math.max(0, Number(reserveLimit || 0));

  return {
    selectedEntries: ranked.slice(0, safeSelectedLimit),
    reserveEntries: ranked.slice(
      safeSelectedLimit,
      safeSelectedLimit + safeReserveLimit
    ),
    rankedEntries: ranked,
  };
}
