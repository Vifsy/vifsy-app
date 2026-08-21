import { getTikTokEnv, verifyTikTokMediaProxySignature } from "../../../../lib/tiktokOAuth.js";
import { assertPublicHttpUrl } from "../../../../lib/security.js";
import sharp from "sharp";

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

    const upstreamType = String(upstream.headers.get("content-type") || "").toLowerCase();
    const looksLikeImage =
      upstreamType.startsWith("image/") ||
      /\.(?:png|jpe?g|webp)(?:$|[?#])/i.test(currentUrl);

    if (looksLikeImage) {
      const sourceBuffer = Buffer.from(await upstream.arrayBuffer());
      let prepared = null;
      let qualityUsed = 92;
      for (const quality of [92, 86, 78]) {
        const result = await sharp(sourceBuffer)
          .rotate()
          .resize({
            width: 1080,
            height: 1080,
            fit: "inside",
            withoutEnlargement: true,
          })
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .jpeg({ quality, mozjpeg: true })
          .toBuffer({ resolveWithObject: true });
        prepared = result;
        qualityUsed = quality;
        if (result.data.byteLength <= 20 * 1024 * 1024) break;
      }

      if (!prepared?.data?.length || prepared.data.byteLength > 20 * 1024 * 1024) {
        return new Response("Image could not be prepared for TikTok", { status: 422 });
      }

      console.log("TikTok photo media prepared", {
        postId,
        sourceContentType: upstreamType || null,
        deliveryContentType: "image/jpeg",
        width: prepared.info?.width || null,
        height: prepared.info?.height || null,
        bytes: prepared.data.byteLength,
        quality: qualityUsed,
      });

      const imageHeaders = new Headers();
      imageHeaders.set("Content-Type", "image/jpeg");
      imageHeaders.set("Content-Length", String(prepared.data.byteLength));
      imageHeaders.set("Cache-Control", "public, max-age=300");
      imageHeaders.set("X-Content-Type-Options", "nosniff");
      return new Response(prepared.data, { status: 200, headers: imageHeaders });
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
