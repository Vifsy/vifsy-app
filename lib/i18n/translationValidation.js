const LANGUAGE_NEUTRAL_EXACT_VALUES = new Set([
  "Spreelo",
  "TikTok",
  "YouTube",
  "Pinterest",
  "Instagram",
  "Facebook",
  "Threads",
  "LinkedIn",
  "AI",
  "URL",
  "SEO",
  "FAQ",
]);

function getPlaceholders(value) {
  return String(value || "")
    .match(/\{[A-Za-z0-9_]+\}/g)
    ?.sort() || [];
}

function placeholdersMatch(sourceText, translatedText) {
  const source = getPlaceholders(sourceText);
  const translated = getPlaceholders(translatedText);
  return source.length === translated.length && source.every((item, index) => item === translated[index]);
}

function isLanguageNeutralSource(value) {
  const source = String(value || "").trim();
  if (!source) return true;
  if (LANGUAGE_NEUTRAL_EXACT_VALUES.has(source)) return true;
  if (/^https?:\/\//i.test(source)) return true;
  if (/^[\d\s.,:;!?%+()\-_/\\{}]+$/.test(source)) return true;
  if (/^[A-Z0-9._+\-/]{1,8}$/.test(source) && !/[a-z]/.test(source)) return true;
  return false;
}

/**
 * Guardrail for generated UI packs.
 *
 * We intentionally prefer a temporarily blank label over leaking English into
 * a non-English workspace or persisting a translation that broke an interpolation
 * placeholder. Missing/invalid labels stay eligible for the bounded retry flow.
 */
export function validateGeneratedUiTranslation({ sourceText, translatedText, locale }) {
  const source = String(sourceText || "").trim();
  const translated = String(translatedText || "").trim();
  const normalizedLocale = String(locale || "en").trim().toLowerCase();

  if (!translated) {
    return { valid: false, reason: "empty" };
  }

  if (!placeholdersMatch(source, translated)) {
    return { valid: false, reason: "placeholder_mismatch" };
  }

  if (
    normalizedLocale !== "en" &&
    source &&
    translated === source &&
    !isLanguageNeutralSource(source)
  ) {
    return { valid: false, reason: "unchanged_english" };
  }

  return { valid: true, reason: null };
}
