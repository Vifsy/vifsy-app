import { resolveBestServerLocale, resolveUiLocaleFromLanguageName } from "./i18n/serverUiText.js";

export function resolveLocaleFromUserMetadata(metadata = {}, fallback = "en") {
  const candidates = [
    metadata?.app_locale,
    metadata?.appLocale,
    metadata?.app_language,
    metadata?.appLanguage,
    metadata?.ui_language,
    metadata?.uiLanguage,
    metadata?.locale,
  ];

  for (const candidate of candidates) {
    const locale = resolveUiLocaleFromLanguageName(candidate);
    if (locale) return locale;
  }

  return resolveBestServerLocale({ languageCandidates: [fallback] });
}

export async function getUserEmailAndAppLocale({ supabaseAdmin, userId, fallbackLocale = "en" }) {
  if (!supabaseAdmin || !userId) {
    return { email: "", locale: resolveBestServerLocale({ languageCandidates: [fallbackLocale] }), metadata: {} };
  }

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data?.user) {
    return { email: "", locale: resolveBestServerLocale({ languageCandidates: [fallbackLocale] }), metadata: {} };
  }

  const metadata = data.user.user_metadata || {};
  return {
    email: String(data.user.email || "").trim(),
    locale: resolveLocaleFromUserMetadata(metadata, fallbackLocale),
    metadata,
  };
}
