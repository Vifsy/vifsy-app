import { createClient } from "@supabase/supabase-js";
import {
  resolveCalendarVisualTheme,
  scoreCalendarVisualAsset,
} from "../../../../lib/calendarVisualThemes.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const JOBS_PER_RUN = 4;

async function assignVisualToOpportunity(supabase, job, asset) {
  if (job.opportunity_id) {
    await supabase
      .from("brand_campaign_opportunities")
      .update({ visual_asset_id: asset.id, visual_image_url: asset.image_url, updated_at: new Date().toISOString() })
      .eq("id", job.opportunity_id);
    return;
  }

  // Compatibility for requests created before v143.32.
  await supabase
    .from("brand_campaign_opportunities")
    .update({ visual_asset_id: asset.id, visual_image_url: asset.image_url, updated_at: new Date().toISOString() })
    .eq("slug", job.theme_key);
}

async function selectReusableAsset(supabase, job) {
  const { data: candidates } = await supabase
    .from("calendar_visual_assets")
    .select("id, image_url, alt_text, theme_key, theme_tags, use_count, is_generic")
    .limit(150);
  const requestedTheme = resolveCalendarVisualTheme({
    visual_theme_key: job.theme_key,
    visual_theme_tags: job.theme_tags,
    title: job.prompt,
  });
  const generic = (candidates || []).find((asset) => asset.is_generic) || null;
  const ranked = (candidates || [])
    .filter((asset) => !asset.is_generic)
    .map((asset) => ({ ...asset, matchScore: scoreCalendarVisualAsset(asset, requestedTheme) }))
    .filter((asset) => asset.matchScore >= 30)
    .sort((left, right) => right.matchScore - left.matchScore || Number(left.use_count || 0) - Number(right.use_count || 0));
  return ranked[0] || generic;
}

async function reuseExistingAsset(supabase, job) {
  const reusable = await selectReusableAsset(supabase, job);
  if (!reusable?.id) throw new Error("The calendar visual library has no safe reusable image.");
  await supabase.from("calendar_visual_requests").update({ status: "ready", asset_id: reusable.id, last_error: null, updated_at: new Date().toISOString() }).eq("id", job.id);
  await supabase.from("calendar_visual_assets").update({ use_count: Number(reusable.use_count || 0) + 1, updated_at: new Date().toISOString() }).eq("id", reusable.id);
  await assignVisualToOpportunity(supabase, job, reusable);
  return { id: job.id, reused: true, assetId: reusable.id, generic: Boolean(reusable.is_generic) };
}

async function processVisualJob(supabase, job) {
  let reserved = false;
  let uploadedPath = "";
  const claimedAt = new Date().toISOString();
  const { data: claim } = await supabase
    .from("calendar_visual_requests")
    .update({ status: "generating", attempt_count: Number(job.attempt_count || 0) + 1, updated_at: claimedAt })
    .eq("id", job.id)
    .eq("status", job.status)
    .select("id")
    .maybeSingle();
  if (!claim?.id) return { id: job.id, skipped: true };

  try {
    const { data: capacityReserved, error: reserveError } = await supabase.rpc(
      "reserve_calendar_visual_generation_capacity",
      { request_uuid: job.id }
    );
    if (reserveError) throw reserveError;
    reserved = Boolean(capacityReserved);
    if (!reserved) {
      const { count: assetCount } = await supabase.from("calendar_visual_assets").select("id", { count: "exact", head: true });
      if (Number(assetCount || 0) >= 150) return await reuseExistingAsset(supabase, job);
      await supabase.from("calendar_visual_requests").update({ status: "queued", attempt_count: Number(job.attempt_count || 0), last_error: "Waiting for an available visual-library capacity reservation.", updated_at: new Date().toISOString() }).eq("id", job.id);
      return { id: job.id, deferred: true };
    }

    const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.CALENDAR_IMAGE_MODEL || "gpt-image-2",
        prompt: job.prompt,
        size: "1024x1024",
        quality: "medium",
        output_format: "webp",
      }),
    });
    const payload = await imageResponse.json();
    const base64 = payload?.data?.[0]?.b64_json;
    if (!imageResponse.ok || !base64) throw new Error(payload?.error?.message || "Calendar image generation returned no image.");

    const bytes = Buffer.from(base64, "base64");
    const canonicalTheme = resolveCalendarVisualTheme({ visual_theme_key: job.theme_key, visual_theme_tags: job.theme_tags, title: job.prompt });
    const path = `themes/${canonicalTheme.themeKey}-${job.opportunity_id || job.id}-${Date.now()}.webp`;
    uploadedPath = path;
    const { error: uploadError } = await supabase.storage
      .from("calendar-visual-assets")
      .upload(path, bytes, { contentType: "image/webp", upsert: false });
    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage.from("calendar-visual-assets").getPublicUrl(path);
    const { data: asset, error: assetError } = await supabase
      .from("calendar_visual_assets")
      .insert({
        image_url: publicData.publicUrl,
        alt_text: canonicalTheme.themeKey,
        theme_key: canonicalTheme.themeKey,
        theme_tags: canonicalTheme.tags,
        is_generic: false,
      })
      .select("id, image_url")
      .single();
    if (assetError) throw assetError;
    uploadedPath = "";

    await supabase.from("calendar_visual_requests").update({ status: "ready", asset_id: asset.id, last_error: null, updated_at: new Date().toISOString() }).eq("id", job.id);
    await assignVisualToOpportunity(supabase, job, asset);
    return { id: job.id, generated: true, assetId: asset.id };
  } catch (error) {
    if (uploadedPath) await supabase.storage.from("calendar-visual-assets").remove([uploadedPath]);
    const terminal = Number(job.attempt_count || 0) + 1 >= 5;
    await supabase
      .from("calendar_visual_requests")
      .update({ status: terminal ? "failed" : "queued", last_error: String(error?.message || error).slice(0, 2000), updated_at: new Date().toISOString() })
      .eq("id", job.id);
    return { id: job.id, error: error?.message || "Calendar visual generation failed." };
  } finally {
    if (reserved) await supabase.from("calendar_visual_generation_reservations").delete().eq("request_id", job.id);
  }
}

export async function GET(request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
  const staleBefore = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  await supabase
    .from("calendar_visual_requests")
    .update({ status: "queued", last_error: "Recovered after an interrupted generation.", updated_at: new Date().toISOString() })
    .eq("status", "generating")
    .lt("updated_at", staleBefore);

  const { data: jobs, error: loadError } = await supabase
    .from("calendar_visual_requests")
    .select("*")
    .in("status", ["queued", "failed"])
    .lt("attempt_count", 5)
    .order("updated_at")
    .limit(JOBS_PER_RUN);
  if (loadError) return Response.json({ ok: false, error: loadError.message }, { status: 500 });
  if (!jobs?.length) return Response.json({ ok: true, processed: 0, results: [] });

  const results = await Promise.all(jobs.map((job) => processVisualJob(supabase, job)));
  return Response.json({
    ok: results.every((result) => !result.error),
    processed: results.length,
    generated: results.filter((result) => result.generated).length,
    reused: results.filter((result) => result.reused).length,
    errors: results.filter((result) => result.error).length,
    results,
  });
}
