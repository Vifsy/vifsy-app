import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const PINTEREST_SCOPES = [
  "boards:read",
  "boards:write",
  "pins:read",
  "pins:write",
];

export function normalizePinterestRedirectUri(value) {
  return String(value || "").trim();
}

export function getPinterestEnv() {
  return {
    appId: String(process.env.PINTEREST_APP_ID || "").trim(),
    appSecret: String(process.env.PINTEREST_APP_SECRET || "").trim(),
    redirectUri: normalizePinterestRedirectUri(
      process.env.PINTEREST_REDIRECT_URI ||
        "https://app.spreelo.com/api/auth/pinterest/callback"
    ),
  };
}

export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function signState(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSignedPinterestState({ userId, brandProfileId, redirectUri, secret }) {
  const payload = base64UrlEncode(
    JSON.stringify({
      userId,
      brandProfileId,
      redirectUri: normalizePinterestRedirectUri(redirectUri),
      nonce: crypto.randomBytes(16).toString("hex"),
      createdAt: Date.now(),
    })
  );

  return `${payload}.${signState(payload, secret)}`;
}

export function verifyAndDecodePinterestState(state, secret) {
  if (!state || !state.includes(".") || !secret) return null;
  const [payload, signature] = state.split(".");
  const expected = signState(payload, secret);

  try {
    if (
      Buffer.byteLength(signature) !== Buffer.byteLength(expected) ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!decoded?.createdAt || Date.now() - decoded.createdAt > 10 * 60 * 1000) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function verifyBrandBelongsToUser({ supabaseAdmin, userId, brandProfileId }) {
  if (!userId || !brandProfileId) return false;
  const { data, error } = await supabaseAdmin
    .from("brand_profiles")
    .select("id")
    .eq("id", brandProfileId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.id);
}

export function buildPinterestAuthorizationUrl({ appId, redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: PINTEREST_SCOPES.join(","),
    state,
  });

  return `https://www.pinterest.com/oauth/?${params.toString()}`;
}

export async function exchangePinterestCode({ code, appId, appSecret, redirectUri }) {
  const basic = Buffer.from(`${appId}:${appSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch("https://api.pinterest.com/v5/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.access_token) {
    throw new Error(data?.message || data?.error_description || "Could not exchange Pinterest authorization code");
  }
  return data;
}

export async function fetchPinterestUserAccount(accessToken) {
  const response = await fetch("https://api.pinterest.com/v5/user_account", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || "Could not load Pinterest account");
  }
  return data;
}

export async function fetchPinterestBoards(accessToken) {
  const url = new URL("https://api.pinterest.com/v5/boards");
  url.searchParams.set("page_size", "100");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || "Could not load Pinterest boards");
  }
  return Array.isArray(data?.items) ? data.items : [];
}

export function pinterestExpiryIso(expiresInSeconds) {
  const seconds = Number(expiresInSeconds);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export async function savePendingPinterestConnection({
  supabaseAdmin,
  userId,
  brandProfileId,
  account,
  accessToken,
  expiresIn,
  scope,
}) {
  const nowIso = new Date().toISOString();
  const accountId = String(account?.id || account?.username || `pinterest-${userId}`);
  const accountName = account?.username || account?.business_name || account?.first_name || "Pinterest account";
  const permissions = String(scope || "")
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const payload = {
    user_id: userId,
    brand_profile_id: brandProfileId,
    platform: "pinterest",
    page_id: accountId,
    page_name: accountName,
    page_access_token: accessToken,
    token_expires_at: pinterestExpiryIso(expiresIn),
    permissions,
    status: "pending",
    updated_at: nowIso,
  };

  const { error: disconnectError } = await supabaseAdmin
    .from("social_connections")
    .update({ status: "disconnected", updated_at: nowIso })
    .eq("user_id", userId)
    .eq("brand_profile_id", brandProfileId)
    .eq("platform", "pinterest");
  if (disconnectError) throw disconnectError;

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("social_connections")
    .select("id")
    .eq("user_id", userId)
    .eq("platform", "pinterest")
    .eq("page_id", accountId)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing?.id) {
    const { data, error } = await supabaseAdmin
      .from("social_connections")
      .update(payload)
      .eq("id", existing.id)
      .eq("user_id", userId)
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  }

  const { data, error } = await supabaseAdmin
    .from("social_connections")
    .insert({ ...payload, created_at: nowIso })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
