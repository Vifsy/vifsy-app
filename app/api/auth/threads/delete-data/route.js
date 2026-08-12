import { NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  createThreadsDeletionConfirmationCode,
  decodeAndVerifyMetaSignedRequest,
  disconnectThreadsConnectionForProviderUser,
  getThreadsEnv,
  readSignedRequestFromMeta,
} from "../../../../../lib/threadsOAuth";

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "threads_delete_data" });
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
    await disconnectThreadsConnectionForProviderUser({
      supabaseAdmin,
      threadsUserId,
      deleteRow: true,
    });

    const confirmationCode = createThreadsDeletionConfirmationCode({
      threadsUserId,
      appSecret,
    });
    const origin = new URL(request.url).origin;

    return NextResponse.json({
      url: `${origin}/api/auth/threads/delete-data/status?code=${encodeURIComponent(confirmationCode)}`,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    console.error("Threads data deletion callback failed", error);
    return NextResponse.json({ ok: false, error: "Threads data deletion callback failed" }, { status: 500 });
  }
}
