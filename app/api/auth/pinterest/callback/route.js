import { NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  exchangePinterestCode,
  fetchPinterestUserAccount,
  getPinterestEnv,
  savePendingPinterestConnection,
  verifyAndDecodePinterestState,
  verifyBrandBelongsToUser,
} from "../../../../../lib/pinterestOAuth";

export async function GET(request) {
  const baseUrl = new URL(request.url).origin;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error") || searchParams.get("error_description");
  const { appId, appSecret, redirectUri } = getPinterestEnv();

  if (oauthError) return NextResponse.redirect(`${baseUrl}/social-channels?error=pinterest_cancelled`);
  if (!appId || !appSecret || !redirectUri) return NextResponse.redirect(`${baseUrl}/social-channels?error=missing_pinterest_env`);
  if (!code || !state) return NextResponse.redirect(`${baseUrl}/social-channels?error=missing_pinterest_code`);

  const cookieState = request.cookies.get("spreelo_pinterest_oauth_state")?.value;
  if (!cookieState || cookieState !== state) return NextResponse.redirect(`${baseUrl}/social-channels?error=invalid_pinterest_state`);

  const decoded = verifyAndDecodePinterestState(state, appSecret);
  if (!decoded?.userId || !decoded?.brandProfileId) return NextResponse.redirect(`${baseUrl}/social-channels?error=invalid_pinterest_state_payload`);

  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const validBrand = await verifyBrandBelongsToUser({
      supabaseAdmin,
      userId: decoded.userId,
      brandProfileId: decoded.brandProfileId,
    });
    if (!validBrand) return NextResponse.redirect(`${baseUrl}/social-channels?error=invalid_brand`);

    const token = await exchangePinterestCode({
      code,
      appId,
      appSecret,
      redirectUri: decoded.redirectUri || redirectUri,
    });
    const account = await fetchPinterestUserAccount(token.access_token);
    const connectionId = await savePendingPinterestConnection({
      supabaseAdmin,
      userId: decoded.userId,
      brandProfileId: decoded.brandProfileId,
      account,
      accessToken: token.access_token,
      expiresIn: token.expires_in,
      scope: token.scope,
    });

    const response = NextResponse.redirect(
      `${baseUrl}/social-channels/pinterest/select?connection_id=${encodeURIComponent(connectionId)}`
    );
    response.cookies.delete("spreelo_pinterest_oauth_state");
    return response;
  } catch (error) {
    console.error("Pinterest OAuth callback failed", error);
    return NextResponse.redirect(`${baseUrl}/social-channels?error=pinterest_callback_failed`);
  }
}
