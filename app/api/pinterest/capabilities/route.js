import { NextResponse } from "next/server";
import { getPinterestApiEnvironment } from "../../../../lib/pinterestOAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiEnvironment = getPinterestApiEnvironment();

  return NextResponse.json({
    api_environment: apiEnvironment,
    video_pins: apiEnvironment !== "sandbox",
  });
}
