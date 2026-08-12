import { NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  decodeAndVerifyMetaSignedRequest,
  disconnectThreadsConnectionForProviderUser,
  getThreadsEnv,
  readSignedRequestFromMeta,
} from "../../../../../lib/threadsOAuth";

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "threads_uninstall" });
}

export async function POST(request) {
  try {
    const { appSecret } = getThreadsEnv();
    if (!appSecret) return NextResponse.json({ ok: false, error: "Missing Threads app secret" }, { status: 500 });

    const signedRequest = await readSignedRequestFromMeta(request);
    const payload = decodeAndVerifyMetaSignedRequest(signedRequest, appSecret);
    const threadsUserId = payload?.user_id;
    if (!threadsUserId) return NextResponse.json({ ok: false, error: "Invalid signed request" }, { status: 400 });

    const supabaseAdmin = createSupabaseAdminClient();
    const disconnected = await disconnectThreadsConnectionForProviderUser({
      supabaseAdmin,
      threadsUserId,
      deleteRow: false,
    });

    return NextResponse.json({ ok: true, disconnected });
  } catch (error) {
    console.error("Threads uninstall callback failed", error);
    return NextResponse.json({ ok: false, error: "Threads uninstall callback failed" }, { status: 500 });
  }
}
