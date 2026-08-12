import { NextResponse } from "next/server";
import {
  getThreadsEnv,
  verifyThreadsDeletionConfirmationCode,
} from "../../../../../../lib/threadsOAuth";

export async function GET(request) {
  const code = new URL(request.url).searchParams.get("code");
  const { appSecret } = getThreadsEnv();
  const payload = appSecret ? verifyThreadsDeletionConfirmationCode(code, appSecret) : null;

  if (!payload?.threadsUserId) {
    return NextResponse.json({ ok: false, status: "unknown", error: "Invalid confirmation code" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    status: "completed",
    message: "The Threads authorization data stored by Spreelo has been deleted.",
  });
}
