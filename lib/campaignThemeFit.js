function normalizeVerdict(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/gu, " ");
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
