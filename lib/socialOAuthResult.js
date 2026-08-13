export const SOCIAL_OAUTH_RESULT_PATH = "/social-channels/oauth-complete";

export function buildSocialOAuthResultUrl(baseUrl, { connected = "", error = "", pinterestTestPin = "" } = {}) {
  const url = new URL(SOCIAL_OAUTH_RESULT_PATH, baseUrl);
  if (connected) url.searchParams.set("connected", connected);
  if (error) url.searchParams.set("error", error);
  if (pinterestTestPin) url.searchParams.set("pinterest_test_pin", pinterestTestPin);
  return url.toString();
}
