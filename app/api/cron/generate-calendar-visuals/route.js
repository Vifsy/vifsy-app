import { createClient } from "@supabase/supabase-js";
import {
  resolveCalendarVisualTheme,
  scoreCalendarVisualAsset,
} from "../../../../lib/calendarVisualThemes.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const JOBS_PER_RUN = 4;
const THEME_ASSET_TARGET = Math.max(1, Math.min(8, Number(process.env.CALENDAR_THEME_ASSET_TARGET || 3)));
const CLASSIFICATIONS_PER_RUN = 2;
const CANONICAL_THEME_KEYS = [
  "christmas", "new_year", "lunar_new_year", "easter", "halloween", "black_friday",
  "cyber_monday", "valentines_day", "mothers_day", "fathers_day", "back_to_school",
  "ramadan", "eid", "diwali", "hanukkah", "gaming", "sustainability", "office",
  "technology", "winter", "summer", "spring", "autumn", "flowers", "gifts", "sale",
  "health", "local_event", "seasonal", "education", "awareness", "product_discovery",
  "service", "food", "fashion", "beauty", "sports", "travel", "family", "general",
];

function storagePathFromPublicUrl(value) {
  const marker = "/calendar-visual-assets/";
  const text = String(value || "");
  const index = text.indexOf(marker);
  return index >= 0 ? decodeURIComponent(text.slice(index + marker.length)) : "";
}

async function syncUntrackedStorageAssets(supabase) {
  const { data: rows } = await supabase
    .from("calendar_visual_assets")
    .select("image_url")
    .limit(200);
  const knownPaths = new Set((rows || []).map((row) => storagePathFromPublicUrl(row.image_url)).filter(Boolean));
  const discovered = [];

  for (let offset = 0; offset < 200; offset += 100) {
    const { data: objects, error } = await supabase.storage
      .from("calendar-visual-assets")
      .list("themes", { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    if (!objects?.length) break;
    for (const object of objects) {
      if (!object?.name || object.name === ".emptyFolderPlaceholder") continue;
      const path = `themes/${object.name}`;
      if (!knownPaths.has(path)) discovered.push(path);
    }
    if (objects.length < 100) break;
  }

  let registered = 0;
  for (const path of discovered) {
    const { count } = await supabase.from("calendar_visual_assets").select("id", { count: "exact", head: true });
    if (Number(count || 0) >= 150) break;
    const filename = path.split("/").pop() || path;
    const canonical = resolveCalendarVisualTheme({ title: filename });
    const { data: publicData } = supabase.storage.from("calendar-visual-assets").getPublicUrl(path);
    const { error } = await supabase.from("calendar_visual_assets").insert({
      image_url: publicData.publicUrl,
      alt_text: canonical.themeKey,
      theme_key: canonical.themeKey,
      theme_tags: canonical.tags,
      is_generic: false,
      metadata_repaired_at: new Date().toISOString(),
      classification_status: canonical.themeKey === "general" ? "pending" : "ready",
      classification_attempts: 0,
      classified_by: canonical.themeKey === "general" ? null : "legacy_filename",
    });
    if (!error) {
      knownPaths.add(path);
      registered += 1;
    }
  }
  return { discovered: discovered.length, registered };
}

function responseOutputText(payload) {
  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (content?.type === "output_text" && content?.text) return content.text;
    }
  }
  return "";
}

async function classifyOneUnresolvedAsset(supabase, asset) {
  const attempt = Number(asset.classification_attempts || 0) + 1;
  const { data: claim } = await supabase
    .from("calendar_visual_assets")
    .update({ classification_status: "classifying", classification_attempts: attempt, updated_at: new Date().toISOString() })
    .eq("id", asset.id)
    .eq("classification_status", asset.classification_status)
    .select("id")
    .maybeSingle();
  if (!claim?.id) return { id: asset.id, skipped: true };

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.CALENDAR_CLASSIFICATION_MODEL || "gpt-4.1-mini",
        input: [{
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Classify this reusable campaign-calendar image. Choose one language-independent English theme_key from the schema. Return 3-8 short lowercase English theme_tags describing the visible occasion, season, industry or use. Do not infer a language from text or filenames.",
            },
            { type: "input_image", image_url: asset.image_url, detail: "low" },
          ],
        }],
        max_output_tokens: 300,
        text: {
          format: {
            type: "json_schema",
            name: "calendar_visual_classification",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                theme_key: { type: "string", enum: CANONICAL_THEME_KEYS },
                theme_tags: { type: "array", minItems: 3, maxItems: 8, items: { type: "string" } },
              },
              required: ["theme_key", "theme_tags"],
            },
          },
        },
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || "Calendar image classification failed.");
    const parsed = JSON.parse(responseOutputText(payload));
    const canonical = resolveCalendarVisualTheme({ visual_theme_key: parsed.theme_key, visual_theme_tags: parsed.theme_tags });
    await supabase.from("calendar_visual_assets").update({
      theme_key: canonical.themeKey,
      theme_tags: canonical.tags,
      alt_text: canonical.themeKey,
      classification_status: "ready",
      classified_by: "openai_vision_once",
      metadata_repaired_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", asset.id);
    return { id: asset.id, classified: true, themeKey: canonical.themeKey };
  } catch (error) {
    await supabase.from("calendar_visual_assets").update({
      classification_status: attempt >= 3 ? "failed" : "pending",
      updated_at: new Date().toISOString(),
    }).eq("id", asset.id);
    return { id: asset.id, error: error?.message || String(error) };
  }
}

async function classifyUnresolvedAssets(supabase) {
  if (!process.env.OPENAI_API_KEY) return [];
  const staleBefore = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  await supabase.from("calendar_visual_assets")
    .update({ classification_status: "pending", updated_at: new Date().toISOString() })
    .eq("classification_status", "classifying")
    .lt("updated_at", staleBefore)
    .lt("classification_attempts", 3);
  const { data: assets } = await supabase
    .from("calendar_visual_assets")
    .select("id, image_url, classification_status, classification_attempts")
    .eq("classification_status", "pending")
    .eq("is_generic", false)
    .lt("classification_attempts", 3)
    .order("created_at")
    .limit(CLASSIFICATIONS_PER_RUN);
  return Promise.all((assets || []).map((asset) => classifyOneUnresolvedAsset(supabase, asset)));
}

async function themeAssetCount(supabase, job) {
  const canonical = resolveCalendarVisualTheme({
    visual_theme_key: job.theme_key,
    visual_theme_tags: job.theme_tags,
    title: job.prompt,
  });
  const { count } = await supabase
    .from("calendar_visual_assets")
    .select("id", { count: "exact", head: true })
    .eq("theme_key", canonical.themeKey)
    .eq("is_generic", false);
  return { canonical, count: Number(count || 0) };
}

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
    const inventory = await themeAssetCount(supabase, job);
    const target = inventory.canonical.themeKey === "general" ? 1 : THEME_ASSET_TARGET;
    if (inventory.count >= target) return await reuseExistingAsset(supabase, job);

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
  let storageSync = { discovered: 0, registered: 0 };
  try {
    storageSync = await syncUntrackedStorageAssets(supabase);
  } catch (error) {
    console.error("Could not audit untracked calendar Storage objects", { message: error?.message || String(error) });
  }
  const classifications = await classifyUnresolvedAssets(supabase);
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
  if (!jobs?.length) return Response.json({ ok: true, processed: 0, storageSync, classifications, results: [] });

  const results = await Promise.all(jobs.map((job) => processVisualJob(supabase, job)));
  return Response.json({
    ok: results.every((result) => !result.error),
    processed: results.length,
    generated: results.filter((result) => result.generated).length,
    reused: results.filter((result) => result.reused).length,
    errors: results.filter((result) => result.error).length,
    storageSync,
    classifications,
    results,
  });
}
