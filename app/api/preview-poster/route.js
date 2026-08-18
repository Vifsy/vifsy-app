import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

export const dynamic = "force-dynamic";

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function durationLabel(seconds) {
  const total = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(total / 60);
  const secs = Math.round(total % 60);
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

async function placeholder() {
  return sharp({ create: { width: 900, height: 1200, channels: 4, background: "#111827" } })
    .png()
    .toBuffer();
}

export async function GET(request) {
  const url = new URL(request.url);
  const token = String(url.searchParams.get("token") || "").trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !supabaseUrl || !serviceRoleKey) {
    return new Response(await placeholder(), { status: 400, headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: post } = await admin
    .from("posts")
    .select("image_url,video_duration_seconds,approval_token")
    .eq("approval_token", token)
    .maybeSingle();

  if (!post?.image_url) {
    return new Response(await placeholder(), { status: 404, headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
  }

  try {
    const response = await fetch(post.image_url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Poster fetch failed: ${response.status}`);
    const input = Buffer.from(await response.arrayBuffer());
    const image = sharp(input).rotate();
    const metadata = await image.metadata();
    const width = Math.max(320, Number(metadata.width || 900));
    const height = Math.max(320, Number(metadata.height || 1200));
    const radius = Math.round(Math.min(width, height) * 0.105);
    const cx = Math.round(width / 2);
    const cy = Math.round(height / 2);
    const triangle = Math.round(radius * 0.72);
    const pillW = Math.max(92, Math.round(width * 0.12));
    const pillH = Math.max(44, Math.round(height * 0.045));
    const label = durationLabel(post.video_duration_seconds || 0);
    const overlay = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="shadow"><feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.38"/></filter></defs>
      <g filter="url(#shadow)"><circle cx="${cx}" cy="${cy}" r="${radius}" fill="#060a10" fill-opacity="0.72" stroke="#ffffff" stroke-opacity="0.13" stroke-width="2"/><path d="M ${cx - triangle * 0.28} ${cy - triangle * 0.56} L ${cx + triangle * 0.62} ${cy} L ${cx - triangle * 0.28} ${cy + triangle * 0.56} Z" fill="#ffffff"/></g>
      <rect x="${Math.round(width * 0.035)}" y="${Math.round(height * 0.025)}" width="${pillW}" height="${pillH}" rx="${Math.round(pillH * 0.25)}" fill="#071018" fill-opacity="0.78"/>
      <text x="${Math.round(width * 0.035) + pillW / 2}" y="${Math.round(height * 0.025) + pillH * 0.68}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${Math.max(18, Math.round(pillH * 0.48))}" font-weight="700" fill="#fff">${escapeXml(label)}</text>
    </svg>`);

    const output = await image.composite([{ input: overlay, top: 0, left: 0 }]).png({ quality: 90 }).toBuffer();
    return new Response(output, { status: 200, headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=300" } });
  } catch (error) {
    console.error("Could not build Spreelo preview poster", { message: error?.message });
    return new Response(await placeholder(), { status: 500, headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
  }
}
