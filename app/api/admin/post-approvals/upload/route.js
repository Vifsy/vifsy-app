import crypto from "crypto";
import { adminContextError, getAdminContext } from "../../../../../lib/adminAuth";

export const dynamic = "force-dynamic";
const BUCKET = "admin-review-assets";
const ALLOWED = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

export async function POST(request) {
  const context = await getAdminContext(request);
  if (context.error) return adminContextError(context);
  const body = await request.json().catch(() => ({}));
  const contentType = String(body?.content_type || "").toLowerCase();
  const size = Number(body?.size || 0);
  if (!ALLOWED.has(contentType) || !size || size > 15 * 1024 * 1024) {
    return Response.json({ ok: false, error: "Upload a PNG, JPG or WEBP image smaller than 15 MB." }, { status: 400 });
  }
  const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const path = `products/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
  const upload = await context.admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (upload.error) return Response.json({ ok: false, error: upload.error.message }, { status: 500 });
  const { data: publicData } = context.admin.storage.from(BUCKET).getPublicUrl(path);
  return Response.json({
    ok: true,
    bucket: BUCKET,
    path,
    token: upload.data?.token,
    public_url: publicData?.publicUrl || null,
  });
}
