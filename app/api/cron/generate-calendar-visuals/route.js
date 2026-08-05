import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const staleBefore = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  await supabase.from("calendar_visual_requests").update({ status: "queued", last_error: "Recovered after an interrupted generation.", updated_at: new Date().toISOString() }).eq("status", "generating").lt("updated_at", staleBefore);
  const { data: job, error: loadError } = await supabase.from("calendar_visual_requests").select("*").in("status", ["queued", "failed"]).lt("attempt_count", 5).order("updated_at").limit(1).maybeSingle();
  if (loadError) return Response.json({ ok: false, error: loadError.message }, { status: 500 });
  if (!job) return Response.json({ ok: true, generated: false });
  await supabase.from("calendar_visual_requests").update({ status: "generating", attempt_count: Number(job.attempt_count || 0) + 1, updated_at: new Date().toISOString() }).eq("id", job.id).eq("status", job.status);
  try {
    const { count: assetCount } = await supabase.from("calendar_visual_assets").select("id", { count: "exact", head: true });
    if (Number(assetCount || 0) >= 150) {
      const { data: candidates } = await supabase.from("calendar_visual_assets").select("id, image_url, theme_tags, use_count, is_generic").eq("is_generic", false).limit(150);
      const requestedTokens = new Set(String(job.theme_key || "").split("-").filter((token) => token.length > 2));
      const reusable = (candidates || []).map((asset) => ({
        ...asset,
        matchScore: (asset.theme_tags || []).reduce((score, tag) => score + (requestedTokens.has(String(tag).toLowerCase()) ? 1 : 0), 0),
      })).sort((left, right) => right.matchScore - left.matchScore || Number(left.use_count || 0) - Number(right.use_count || 0))[0];
      if (!reusable?.id) throw new Error("The calendar visual library is full and no reusable theme image matched this campaign.");
      await supabase.from("calendar_visual_requests").update({ status: "ready", asset_id: reusable.id, last_error: null, updated_at: new Date().toISOString() }).eq("id", job.id);
      await supabase.from("calendar_visual_assets").update({ use_count: Number(reusable.use_count || 0) + 1, updated_at: new Date().toISOString() }).eq("id", reusable.id);
      await supabase.from("brand_campaign_opportunities").update({ visual_asset_id: reusable.id, visual_image_url: reusable.image_url, updated_at: new Date().toISOString() }).ilike("slug", `%${job.theme_key}%`);
      return Response.json({ ok: true, generated: false, reused: true, assetId: reusable.id });
    }
    const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.CALENDAR_IMAGE_MODEL || "gpt-image-2", prompt: job.prompt, size: "1024x1024", quality: "medium", output_format: "webp" }),
    });
    const payload = await imageResponse.json();
    const base64 = payload?.data?.[0]?.b64_json;
    if (!imageResponse.ok || !base64) throw new Error(payload?.error?.message || "Calendar image generation returned no image.");
    const bytes = Buffer.from(base64, "base64");
    const path = `themes/${job.theme_key}-${Date.now()}.webp`;
    const { error: uploadError } = await supabase.storage.from("calendar-visual-assets").upload(path, bytes, { contentType: "image/webp", upsert: false });
    if (uploadError) throw uploadError;
    const { data: publicData } = supabase.storage.from("calendar-visual-assets").getPublicUrl(path);
    const { data: asset, error: assetError } = await supabase.from("calendar_visual_assets").insert({ image_url: publicData.publicUrl, alt_text: job.theme_key, theme_tags: job.theme_key.split("-").filter((part) => part.length > 2), is_generic: false }).select("id, image_url").single();
    if (assetError) throw assetError;
    await supabase.from("calendar_visual_requests").update({ status: "ready", asset_id: asset.id, last_error: null, updated_at: new Date().toISOString() }).eq("id", job.id);
    // Replace the temporary generic image as well as empty slots. The previous
    // null-only filter left campaigns permanently stuck on the placeholder.
    await supabase.from("brand_campaign_opportunities").update({ visual_asset_id: asset.id, visual_image_url: asset.image_url, updated_at: new Date().toISOString() }).ilike("slug", `%${job.theme_key}%`);
    return Response.json({ ok: true, generated: true, assetId: asset.id });
  } catch (error) {
    const terminal = Number(job.attempt_count || 0) >= 4;
    await supabase.from("calendar_visual_requests").update({ status: terminal ? "failed" : "queued", last_error: String(error?.message || error).slice(0, 2000), updated_at: new Date().toISOString() }).eq("id", job.id);
    return Response.json({ ok: false, generated: false, error: error?.message || "Calendar visual generation failed." }, { status: 500 });
  }
}
