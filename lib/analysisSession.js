const DEFAULT_ANALYSIS_AUTH_TIMEOUT_MS = 12000;
const ANALYSIS_TOKEN_MIN_VALIDITY_MS = 15000;

async function withAnalysisAuthTimeout(promise, timeoutMs) {
  let timeoutId;

  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("Authentication session request timed out.")),
          timeoutMs
        );
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}

function getSessionAccessToken(session) {
  return String(session?.access_token || "").trim();
}

function isSessionTokenUsable(session) {
  const accessToken = getSessionAccessToken(session);
  if (!accessToken) return false;

  const expiresAtSeconds = Number(session?.expires_at || 0);
  if (!Number.isFinite(expiresAtSeconds) || expiresAtSeconds <= 0) {
    return true;
  }

  return (
    expiresAtSeconds * 1000 >
    Date.now() + ANALYSIS_TOKEN_MIN_VALIDITY_MS
  );
}

export async function getValidAnalysisAccessToken({
  supabase,
  fallbackAccessToken = "",
  forceRefresh = false,
  timeoutMs = DEFAULT_ANALYSIS_AUTH_TIMEOUT_MS,
}) {
  if (!supabase?.auth) {
    throw new Error("Authentication is unavailable.");
  }

  let currentSession = null;
  let currentSessionError = null;

  try {
    const { data, error } = await withAnalysisAuthTimeout(
      supabase.auth.getSession(),
      timeoutMs
    );
    currentSession = data?.session || null;
    currentSessionError = error || null;
  } catch (error) {
    currentSessionError = error;
  }

  const currentAccessToken = getSessionAccessToken(currentSession);
  if (!forceRefresh && isSessionTokenUsable(currentSession)) {
    return currentAccessToken;
  }

  try {
    const { data, error } = await withAnalysisAuthTimeout(
      supabase.auth.refreshSession(),
      timeoutMs
    );
    const refreshedSession = data?.session || null;
    const refreshedAccessToken = getSessionAccessToken(refreshedSession);

    if (!error && refreshedAccessToken) {
      return refreshedAccessToken;
    }

    if (
      forceRefresh &&
      currentAccessToken &&
      currentAccessToken !== String(fallbackAccessToken || "").trim() &&
      isSessionTokenUsable(currentSession)
    ) {
      // Another browser-side refresh may already have replaced the rejected
      // token while this request was in flight.
      return currentAccessToken;
    }

    throw error || new Error("Authentication session could not be refreshed.");
  } catch (refreshError) {
    if (
      !forceRefresh &&
      fallbackAccessToken
    ) {
      return String(fallbackAccessToken).trim();
    }

    throw new Error(
      refreshError?.message ||
        currentSessionError?.message ||
        "Your session expired. Please sign in again."
    );
  }
}
