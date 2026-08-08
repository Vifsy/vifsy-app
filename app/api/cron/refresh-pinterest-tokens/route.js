import { NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  fetchPinterestUserAccount,
  getHealthyPinterestAccessToken,
  isPinterestAuthError,
  shouldRefreshPinterestConnection,
} from "../../../../lib/pinterestOAuth";
import { markConnectionExpiredAndAlert } from "../../../../lib/socialConnectionAlerts";

function isAuthorized(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return (request.headers.get("authorization") || "") === `Bearer ${cronSecret}`;
}

async function recordHealthyCheck(supabaseAdmin, connectionId) {
  const nowIso = new Date().toISOString();
  await supabaseAdmin
    .from("social_connections")
    .update({
      last_connection_check_at: nowIso,
      last_connection_error: null,
      reauth_required_at: null,
      updated_at: nowIso,
    })
    .eq("id", connectionId);
}

async function recordTransientFailure(supabaseAdmin, connectionId, error) {
  await supabaseAdmin
    .from("social_connections")
    .update({
      last_connection_check_at: new Date().toISOString(),
      last_connection_error: String(error?.message || "Pinterest health check failed").slice(0, 1500),
    })
    .eq("id", connectionId);
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const summary = {
    checked: 0,
    refreshed: 0,
    healthy: 0,
    reconnectRequired: 0,
    transientFailures: 0,
  };

  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const { data: connections, error } = await supabaseAdmin
      .from("social_connections")
      .select("id, user_id, brand_profile_id, platform, page_id, page_name, page_access_token, token_expires_at, refresh_token, refresh_token_expires_at, permissions, status, last_connection_check_at")
      .eq("platform", "pinterest")
      .eq("status", "connected")
      .limit(1000);

    if (error) throw error;

    for (const originalConnection of connections || []) {
      summary.checked += 1;
      let connection = originalConnection;

      try {
        const wasDueForRefresh = shouldRefreshPinterestConnection(connection);
        let healthy = await getHealthyPinterestAccessToken({
          supabaseAdmin,
          connection,
        });
        connection = healthy.connection;
        if (healthy.connection?.refreshed || wasDueForRefresh) summary.refreshed += 1;

        try {
          await fetchPinterestUserAccount(healthy.accessToken);
        } catch (healthError) {
          if (!isPinterestAuthError(healthError)) throw healthError;

          healthy = await getHealthyPinterestAccessToken({
            supabaseAdmin,
            connection,
            forceRefresh: true,
          });
          connection = healthy.connection;
          await fetchPinterestUserAccount(healthy.accessToken);
          summary.refreshed += 1;
        }

        await recordHealthyCheck(supabaseAdmin, connection.id);
        summary.healthy += 1;
      } catch (connectionError) {
        const requiresReconnect = Boolean(
          connectionError?.requiresReconnect || isPinterestAuthError(connectionError)
        );

        if (!requiresReconnect) {
          console.error("Pinterest connection health check transient failure", {
            connectionId: connection.id,
            message: connectionError?.message,
          });
          await recordTransientFailure(supabaseAdmin, connection.id, connectionError);
          summary.transientFailures += 1;
          continue;
        }

        const nowIso = new Date().toISOString();
        await supabaseAdmin
          .from("social_connections")
          .update({
            last_connection_check_at: nowIso,
            last_connection_error: String(connectionError?.message || "Pinterest authorization is no longer valid").slice(0, 1500),
            reauth_required_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", connection.id);

        await markConnectionExpiredAndAlert({
          supabase: supabaseAdmin,
          connectionId: connection.id,
          platform: "pinterest",
          reason: connectionError?.message || "Pinterest authorization is no longer valid",
          resendApiKey: process.env.RESEND_API_KEY,
          nowIso,
        });
        summary.reconnectRequired += 1;
      }
    }

    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error("Pinterest token refresh cron failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not refresh Pinterest connections", summary },
      { status: 500 }
    );
  }
}
