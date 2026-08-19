import { getTikTokEnv, verifyTikTokMediaProxySignature } from "../../../../lib/tiktokOAuth.js";
import { assertPublicHttpUrl } from "../../../../lib/security.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const postId = url.searchParams.get("post") || "";
    const exp = url.searchParams.get("exp") || "";
    const encodedUrl = url.searchParams.get("src") || "";
    const signature = url.searchParams.get("sig") || "";
    const { mediaSigningSecret } = getTikTokEnv();

    if (!verifyTikTokMediaProxySignature({ postId, exp, encodedUrl, signature, secret: mediaSigningSecret })) {
      return new Response("Invalid or expired media URL", { status: 403 });
    }

    const sourceUrl = Buffer.from(encodedUrl, "base64url").toString();
    let currentUrl = await assertPublicHttpUrl(sourceUrl);
    let upstream = null;
    for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
      upstream = await fetch(currentUrl, { redirect: "manual", cache: "no-store" });
      if (![301, 302, 303, 307, 308].includes(upstream.status)) break;
      const location = upstream.headers.get("location");
      if (!location || redirectCount >= 5) {
        return new Response("Media redirect could not be followed safely", { status: 502 });
      }
      currentUrl = await assertPublicHttpUrl(new URL(location, currentUrl).toString());
    }
    if (!upstream.ok || !upstream.body) {
      return new Response("Media unavailable", { status: 502 });
    }

    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("content-type") || "application/octet-stream");
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);
    headers.set("Cache-Control", "public, max-age=300");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    console.error("TikTok media proxy failed", error);
    return new Response("Media unavailable", { status: 500 });
  }
}
