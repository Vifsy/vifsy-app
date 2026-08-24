import { createClient } from "@supabase/supabase-js";
import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import {
  getKlingImageToVideoTask,
  isKlingTaskFailed,
  isKlingTaskSuccessful,
} from "../../../../lib/kling.js";
import { normalizeVideoDurationSeconds } from "../../../../lib/videoDuration.js";
import {
  createGenerationCostTracker,
  wrapOpenAIForCostTracking,
} from "../../../../lib/generationCostTracking.js";
import {
  buildVideoOverlayEdit,
  queueShotstackRender,
  waitForShotstackRender,
} from "../../../../lib/shotstack.js";
import { sampleRemoteVideoFrames } from "../../../../lib/videoFrameSampler.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const POST_VIDEOS_BUCKET = "post-videos";
const POST_IMAGES_BUCKET = "post-images";
const KLING_TYPOGRAPHY_MODEL = "gpt-image-2";
const DEFAULT_MAX_PENDING_HOURS = 6;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

function truncate(value, maxLength = 1200) {
  const text = String(value || "").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function getMaxPendingHours() {
  return Math.max(
    1,
    Math.min(
      48,
      Number(process.env.KLING_MAX_PENDING_HOURS || DEFAULT_MAX_PENDING_HOURS) ||
        DEFAULT_MAX_PENDING_HOURS
    )
  );
}

function isAuthorized(request) {
  const cronSecret = String(process.env.CRON_SECRET || "");
  if (!cronSecret) return false;
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase admin environment variables are missing");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function setReviewCaseFailure(supabase, postId, stage, message) {
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("admin_review_cases")
    .update({
      status: "needs_repair",
      needs_review: true,
      failure_stage: stage,
      failure_message: truncate(message, 2000),
      updated_at: nowIso,
    })
    .eq("post_id", postId);

  if (error) {
    console.warn("Kling finalizer could not update admin review failure", {
      postId,
      stage,
      message: error.message,
    });
  }
}

async function setReviewCaseReady(supabase, postId) {
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("admin_review_cases")
    .update({
      status: "awaiting_spreelo",
      needs_review: true,
      failure_code: null,
      failure_stage: null,
      failure_message: null,
      updated_at: nowIso,
    })
    .eq("post_id", postId);

  if (error) {
    console.warn("Kling finalizer could not mark admin review ready", {
      postId,
      message: error.message,
    });
  }
}

async function markKlingPostFailed(supabase, post, stage, message) {
  const nowIso = new Date().toISOString();
  const safeMessage = truncate(message, 2000);
  const { error } = await supabase
    .from("posts")
    .update({
      status: "failed",
      admin_review_status: "needs_repair",
      video_status: "failed",
      kling_task_status: "failed",
      kling_last_polled_at: nowIso,
      video_error: safeMessage,
      updated_at: nowIso,
    })
    .eq("id", post.id)
    .eq("video_provider", "kling");

  if (error) throw error;
  await setReviewCaseFailure(supabase, post.id, stage, safeMessage);
}

async function downloadKlingVideo(videoUrl) {
  const response = await fetch(videoUrl, {
    method: "GET",
    redirect: "follow",
    headers: {
      Accept: "video/mp4,video/*;q=0.9,*/*;q=0.5",
      "User-Agent": "Spreelo-Kling-Finalizer/144.25",
    },
  });

  if (!response.ok) {
    throw new Error(`Kling output download failed (${response.status})`);
  }

  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_VIDEO_BYTES) {
    throw new Error("Kling output exceeded Spreelo's 100 MB safety limit");
  }

  const arrayBuffer = await response.arrayBuffer();
  if (!arrayBuffer.byteLength) {
    throw new Error("Kling returned an empty video file");
  }
  if (arrayBuffer.byteLength > MAX_VIDEO_BYTES) {
    throw new Error("Kling output exceeded Spreelo's 100 MB safety limit");
  }

  return Buffer.from(arrayBuffer);
}

async function fetchReferenceImageDataUrl(url) {
  if (!url) throw new Error("Verified product reference URL is missing");
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5" },
  });
  if (!response.ok) throw new Error(`Verified product reference fetch failed (${response.status})`);
  const contentType = String(response.headers.get("content-type") || "image/jpeg").split(";")[0];
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error("Verified product reference was empty");
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

async function validateKlingVideoProductView({ openai, supabase, post, task }) {
  const selection = post?.video_background_selection;
  if (!selection || typeof selection !== "object" || Array.isArray(selection)) {
    return { passed: true, skipped: true };
  }
  const existing = selection?.product_video_validation;
  if (existing?.status === "passed") return { passed: true, skipped: false, cached: true };

  const productImageUrl = String(selection?.verified_product_image_url || "").trim();
  const productTitle = String(selection?.verified_product_title || "verified product").trim();
  const viewLock = selection?.reference_safety?.verifiedViewLock || null;
  if (!productImageUrl || !viewLock) {
    throw new Error("Kling product-view validation prerequisites are missing");
  }

  const durationSeconds = normalizeVideoDurationSeconds(task.durationSeconds, post.video_duration_seconds, 6);
  const [referenceDataUrl, frames] = await Promise.all([
    fetchReferenceImageDataUrl(productImageUrl),
    sampleRemoteVideoFrames({
      videoUrl: task.videoUrl,
      durationSeconds,
      fractions: [0.08, 0.22, 0.38, 0.54, 0.70, 0.84, 0.95],
    }),
  ]);
  if (!frames?.length) throw new Error("Kling product-view validation produced no sampled frames");

  const content = [
    {
      type: "input_text",
      text:
        `Audit this finished Kling product video for the ecommerce product "${productTitle}". ` +
        "The first image is the ONLY authoritative retailer product reference. The following images are sampled frames from the generated video. " +
        `Verified view lock: ${String(viewLock?.verifiedView || "same source view only")}. ` +
        `${String(viewLock?.visibleSurfaceSummary || "Only source-visible surfaces are verified.")} ` +
        `${String(viewLock?.motionConstraint || "Never expose an unseen product surface.")} ` +
        "A plausible hidden side is still UNVERIFIED and must be rejected. For apparel, if the retailer shows only the back, ANY frame showing the front is a failure; if only the front is shown, ANY frame exposing the back is a failure. " +
        "Also reject if the visible print/logo/wording/color/design materially changes, disappears, moves to another side, or becomes a different product. Ignore changes to people, scenery, lighting and camera motion unless they cause an unverified product surface to become visible. If uncertain, fail closed. Return strict JSON only.",
    },
    { type: "input_text", text: "AUTHORITATIVE RETAILER PRODUCT REFERENCE" },
    { type: "input_image", image_url: referenceDataUrl, detail: "high" },
  ];
  for (const frame of frames) {
    content.push({ type: "input_text", text: `VIDEO FRAME at ${Number(frame.time).toFixed(2)} seconds` });
    content.push({ type: "input_image", image_url: `data:image/jpeg;base64,${frame.buffer.toString("base64")}`, detail: "high" });
  }

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [{ role: "user", content }],
    max_output_tokens: 600,
    text: {
      format: {
        type: "json_schema",
        name: "kling_product_video_surface_audit",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            same_product_all_frames: { type: "boolean" },
            verified_view_preserved_all_frames: { type: "boolean" },
            unverified_surface_exposed_any_frame: { type: "boolean" },
            print_logo_text_preserved: { type: "boolean" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            reason: { type: "string" },
          },
          required: [
            "same_product_all_frames",
            "verified_view_preserved_all_frames",
            "unverified_surface_exposed_any_frame",
            "print_logo_text_preserved",
            "confidence",
            "reason",
          ],
        },
      },
    },
  });
  const raw = response?.output_text || response?.output?.flatMap?.((item) => item?.content || []).map?.((item) => item?.text || "").join?.("") || "";
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch { parsed = null; }
  const confidence = Number(parsed?.confidence || 0);
  const passed = Boolean(
    parsed?.same_product_all_frames === true &&
    parsed?.verified_view_preserved_all_frames === true &&
    parsed?.unverified_surface_exposed_any_frame !== true &&
    parsed?.print_logo_text_preserved === true &&
    confidence >= 0.88
  );
  const validation = {
    status: passed ? "passed" : "failed",
    checked_at: new Date().toISOString(),
    sampled_frames: frames.map((frame) => Number(frame.time.toFixed(2))),
    confidence,
    reason: String(parsed?.reason || (passed ? "verified" : "product_view_validation_failed")),
  };
  const nextSelection = { ...selection, product_video_validation: validation };
  const { error } = await supabase
    .from("posts")
    .update({ video_background_selection: nextSelection, updated_at: new Date().toISOString() })
    .eq("id", post.id)
    .eq("video_provider", "kling");
  if (error) throw new Error(`Could not persist Kling product-view validation: ${error.message}`);

  console.info("Kling finished-video product-view validation completed", {
    postId: post.id,
    passed,
    confidence,
    reason: validation.reason,
    sampledFrames: validation.sampled_frames,
  });
  return { passed, validation };
}

async function uploadKlingTypographyOverlay({ supabase, post, buffer }) {
  const storagePath = `${post.user_id}/${post.id}-kling-text-overlay.png`;
  const { error: uploadError } = await supabase.storage
    .from(POST_IMAGES_BUCKET)
    .upload(storagePath, buffer, { contentType: "image/png", upsert: true });
  if (uploadError) throw new Error(uploadError.message || "Could not store Kling typography overlay");
  const { data } = supabase.storage.from(POST_IMAGES_BUCKET).getPublicUrl(storagePath);
  const imageUrl = data?.publicUrl || null;
  if (!imageUrl) throw new Error("Could not create public URL for Kling typography overlay");
  return { imageUrl, storagePath };
}

async function normalizeFinishedKlingTypography(buffer) {
  const normalized = await sharp(buffer)
    .rotate()
    .resize({ width: 1080, height: 1920, fit: "fill", kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer();
  const { data, info } = await sharp(normalized).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let visible = 0;
  let strong = 0;
  let edgeVisible = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      if (alpha < 24) continue;
      visible += 1;
      if (alpha >= 150) strong += 1;
      if (x < 18 || x >= info.width - 18 || y < 18 || y >= info.height - 18) edgeVisible += 1;
    }
  }
  const pixels = Math.max(1, info.width * info.height);
  const visibleRatio = visible / pixels;
  const strongRatio = strong / pixels;
  const edgeRatio = edgeVisible / Math.max(1, visible);
  if (visibleRatio < 0.0025 || strongRatio < 0.0009) throw new Error("GPT-Image-2 Kling typography was visually empty");
  if (visibleRatio > 0.22) throw new Error("GPT-Image-2 Kling typography contained too much opaque area");
  if (edgeRatio > 0.08) throw new Error("GPT-Image-2 Kling typography touched the canvas edge");
  return { buffer: normalized, visibleRatio, strongRatio, edgeRatio };
}

async function createFinishedKlingTypographyOnce({ openai, supabase, post, task, selection }) {
  if (selection?.text_overlay_url) return selection;
  const status = String(selection?.text_overlay_status || "").trim();
  if (status === "generating") {
    throw new Error("Kling typography generation was already claimed. Spreelo will not submit a second paid GPT-Image-2 typography generation.");
  }
  if (status === "failed") {
    throw new Error("Kling typography generation previously failed. Spreelo will not submit a second paid GPT-Image-2 typography generation.");
  }
  const copy = selection?.text_overlay_copy || {};
  const headline = String(copy?.headline || "").trim();
  const subheadline = String(copy?.subheadline || "").trim();
  if (!headline) throw new Error("Kling typography exact headline is missing");

  const claimedSelection = {
    ...selection,
    text_overlay_status: "generating",
    text_overlay_generation_started_at: new Date().toISOString(),
    text_overlay_generation_attempts: 1,
  };
  const { error: claimError } = await supabase
    .from("posts")
    .update({ video_background_selection: claimedSelection, updated_at: new Date().toISOString() })
    .eq("id", post.id)
    .eq("video_provider", "kling");
  if (claimError) throw new Error(`Could not claim the single GPT-Image-2 typography generation: ${claimError.message}`);

  try {
    const durationSeconds = normalizeVideoDurationSeconds(task.durationSeconds, post.video_duration_seconds, 6);
    const frames = await sampleRemoteVideoFrames({
      videoUrl: task.videoUrl,
      durationSeconds,
      fractions: [0.12, 0.42, 0.72, 0.9],
    });
    const referenceFiles = [];
    for (let index = 0; index < frames.length; index += 1) {
      const frame = await sharp(frames[index].buffer)
        .resize({ width: 768, height: 1365, fit: "cover" })
        .jpeg({ quality: 88 })
        .toBuffer();
      referenceFiles.push(await toFile(frame, `finished-video-frame-${index + 1}.jpg`, { type: "image/jpeg" }));
    }
    const productImageUrl = String(selection?.verified_product_image_url || "").trim();
    if (productImageUrl) {
      const response = await fetch(productImageUrl, { headers: { Accept: "image/*" }, redirect: "follow" });
      if (response.ok) {
        const product = await sharp(Buffer.from(await response.arrayBuffer()))
          .rotate().resize({ width: 768, height: 768, fit: "inside", withoutEnlargement: true })
          .png().toBuffer();
        referenceFiles.push(await toFile(product, "verified-product-reference.png", { type: "image/png" }));
      }
    }
    const prompt = `
Create ONLY a finished transparent typography overlay for this premium vertical social-media product commercial.
The supplied images are real frames from the FINISHED video, followed optionally by the authoritative ecommerce product image. Use them only to understand the video content, mood, lighting and where typography can sit safely. Do not reproduce any photo, person, product or background.

EXACT VISIBLE TEXT — render exactly these words, with exact spelling and language:
Main headline: "${headline}"
${subheadline ? `Subheadline: "${subheadline}"` : "No subheadline."}

DESIGN:
- Make the typography feel specifically art-directed for the finished video and product, as a professional short commercial rather than generic system text.
- Strong, confident mobile readability; polished hierarchy, kerning and scale.
- Choose a typography character that fits the actual content: e.g. urban, premium, technical, playful, elegant or energetic only when supported by the references.
- Mostly light/white or dark high-contrast lettering as the frames require. A restrained accent color, underline, brush stroke, crown/flourish or small graphic accent may be used when it genuinely suits the content.
- Keep the design compact enough to avoid the advertised product, its verified print/design, faces, hands and the main action across the supplied frames.
- No card, panel, badge, sticker, banner, rectangle, capsule or opaque plate behind the text.

OUTPUT RULES:
- 9:16 transparent RGBA canvas.
- TRUE alpha transparency everywhere outside typography and tiny typography-supporting accents.
- No black/white/colored background, no checkerboard, no scene, no photo, no clothing, no person, no product, no mockup, no logo recreation, no watermark.
- Do not invent or rewrite any words. Do not add a price, offer, CTA, slogan or hashtag.
Return only the transparent typography artwork.
`.trim();
    const response = await openai.images.edit({
      model: KLING_TYPOGRAPHY_MODEL,
      image: referenceFiles,
      prompt,
      size: "1024x1536",
      quality: "medium",
      background: "transparent",
      output_format: "png",
    }, { timeout: 75_000, maxRetries: 0 });
    const base64 = response?.data?.[0]?.b64_json;
    if (!base64) throw new Error("GPT-Image-2 returned no transparent Kling typography image");
    const normalized = await normalizeFinishedKlingTypography(Buffer.from(base64, "base64"));
    const uploaded = await uploadKlingTypographyOverlay({ supabase, post, buffer: normalized.buffer });
    const completedSelection = {
      ...claimedSelection,
      text_overlay_url: uploaded.imageUrl,
      text_overlay_storage_path: uploaded.storagePath,
      text_overlay_provider: "gpt-image-2-finished-video-transparent-typography",
      text_overlay_prompt: prompt,
      text_overlay_status: "ready",
      text_overlay_generated_at: new Date().toISOString(),
      text_overlay_analysis: {
        visible_ratio: Number(normalized.visibleRatio.toFixed(4)),
        strong_ratio: Number(normalized.strongRatio.toFixed(4)),
        edge_ratio: Number(normalized.edgeRatio.toFixed(4)),
      },
    };
    const { error: persistError } = await supabase
      .from("posts")
      .update({ video_background_selection: completedSelection, updated_at: new Date().toISOString() })
      .eq("id", post.id)
      .eq("video_provider", "kling");
    if (persistError) throw new Error(`Could not persist finished Kling typography: ${persistError.message}`);
    console.info("GPT-Image-2 finished-video transparent typography created in one generation", {
      postId: post.id,
      headline,
      hasSubheadline: Boolean(subheadline),
      referenceFrames: frames.length,
      provider: completedSelection.text_overlay_provider,
    });
    return completedSelection;
  } catch (error) {
    const failedSelection = {
      ...claimedSelection,
      text_overlay_status: "failed",
      text_overlay_failed_at: new Date().toISOString(),
      text_overlay_error: truncate(error?.message || String(error), 900),
    };
    await supabase.from("posts").update({ video_background_selection: failedSelection, updated_at: new Date().toISOString() }).eq("id", post.id).eq("video_provider", "kling");
    throw error;
  }
}

function getKlingAdvertisingPostprocess(post) {
  const selection = post?.video_background_selection;
  if (!selection || typeof selection !== "object" || Array.isArray(selection)) return null;
  if (String(selection.mode || "") !== "kling_professional_advertising_postprocess") return null;
  return selection;
}

async function getKlingFinalVideoSource({ openai, supabase, post, task, costTracker }) {
  let postprocess = getKlingAdvertisingPostprocess(post);
  if (!postprocess) {
    return {
      videoUrl: task.videoUrl,
      postprocessApplied: false,
      postprocessRenderId: null,
    };
  }

  postprocess = await createFinishedKlingTypographyOnce({
    openai,
    supabase,
    post,
    task,
    selection: postprocess,
  });

  const durationSeconds = normalizeVideoDurationSeconds(
    task.durationSeconds,
    post.video_duration_seconds,
    6
  );
  const trimStartSeconds = Math.max(
    0,
    Math.min(
      Math.max(0.2, durationSeconds - 1.2),
      Number(postprocess.scene_trim_start_seconds ?? 1.9) || 1.9
    )
  );
  const overlayStartSeconds = Math.max(
    0.6,
    Math.min(
      Math.max(0.8, durationSeconds - trimStartSeconds - 0.8),
      Number(postprocess.overlay_start_seconds ?? 2.0) || 2.0
    )
  );
  let renderId = String(postprocess.shotstack_render_id || "").trim() || null;
  let nextSelection = postprocess;

  if (!renderId) {
    const edit = buildVideoOverlayEdit({
      videoUrl: task.videoUrl,
      textOverlayUrl: postprocess.text_overlay_url,
      durationSeconds,
      overlayStartSeconds,
      trimStartSeconds,
    });
    renderId = await queueShotstackRender(edit);
    nextSelection = {
      ...postprocess,
      scene_trim_start_seconds: trimStartSeconds,
      overlay_start_seconds: overlayStartSeconds,
      shotstack_render_id: renderId,
      shotstack_status: "rendering",
      shotstack_started_at: new Date().toISOString(),
    };
    const { error: persistError } = await supabase
      .from("posts")
      .update({
        video_background_selection: nextSelection,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id)
      .eq("video_provider", "kling");
    if (persistError) {
      throw new Error(
        `Professional Kling typography render ${renderId} was queued but its id could not be saved: ${persistError.message || "unknown database error"}`
      );
    }
    console.info("Kling professional advertising typography render queued", {
      postId: post.id,
      klingTaskId: post.kling_task_id,
      shotstackRenderId: renderId,
      overlayProvider: postprocess.text_overlay_provider || null,
    });
  }

  const render = await waitForShotstackRender({
    renderId,
    maxAttempts: 70,
    delayMs: 2500,
  });

  if (costTracker?.recordShotstack) {
    try {
      await costTracker.recordShotstack({
        renderId,
        billableSeconds: render.billableSeconds,
        plan: render.plan,
        environment: render.environment,
      });
    } catch (costError) {
      console.warn("Kling typography post-process cost tracking failed without affecting finalization", {
        postId: post.id,
        renderId,
        message: costError?.message || String(costError),
      });
    }
  }

  const completedSelection = {
    ...nextSelection,
    shotstack_render_id: renderId,
    shotstack_status: "done",
    shotstack_completed_at: new Date().toISOString(),
  };
  await supabase
    .from("posts")
    .update({
      video_background_selection: completedSelection,
      updated_at: new Date().toISOString(),
    })
    .eq("id", post.id)
    .eq("video_provider", "kling");

  console.info("Kling professional advertising typography applied", {
    postId: post.id,
    klingTaskId: post.kling_task_id,
    shotstackRenderId: renderId,
    overlayProvider: postprocess.text_overlay_provider || null,
  });

  return {
    videoUrl: render.url,
    postprocessApplied: true,
    postprocessRenderId: renderId,
  };
}

async function finalizeReadyTask(supabase, post, task, finalVideoUrl = task.videoUrl) {
  const videoBuffer = await downloadKlingVideo(finalVideoUrl);
  const storagePath = `${post.user_id}/${post.id}-kling.mp4`;
  const { error: uploadError } = await supabase.storage
    .from(POST_VIDEOS_BUCKET)
    .upload(storagePath, videoBuffer, {
      contentType: "video/mp4",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Could not save Kling video to Spreelo storage");
  }

  const { data: publicUrlData } = supabase.storage
    .from(POST_VIDEOS_BUCKET)
    .getPublicUrl(storagePath);
  const publicUrl = publicUrlData?.publicUrl || null;
  if (!publicUrl) throw new Error("Could not create a public URL for the Kling video");

  const nowIso = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("posts")
    .update({
      video_url: publicUrl,
      video_storage_path: storagePath,
      video_status: "ready",
      video_render_id: post.kling_task_id,
      kling_task_status: task.status || "succeeded",
      kling_completed_at: nowIso,
      kling_last_polled_at: nowIso,
      video_duration_seconds: normalizeVideoDurationSeconds(
        task.durationSeconds,
        post.video_duration_seconds,
        6
      ),
      video_error: null,
      status: "pending_approval",
      updated_at: nowIso,
    })
    .eq("id", post.id)
    .eq("video_provider", "kling")
    .eq("kling_task_id", post.kling_task_id);

  if (updateError) throw updateError;
  await setReviewCaseReady(supabase, post.id);
  return publicUrl;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const summary = {
    checked: 0,
    pending: 0,
    completed: 0,
    failed: 0,
    timed_out: 0,
    poll_errors: 0,
  };

  try {
    const supabase = createSupabaseAdmin();
    const maxPendingHours = getMaxPendingHours();
    const pendingStatuses = ["submitting", "submitted", "created", "queued", "pending", "processing", "rendering"];
    const { data: posts, error } = await supabase
      .from("posts")
      .select(
        "id, user_id, status, video_provider, video_status, video_duration_seconds, video_error, video_background_selection, kling_generation_count, kling_task_id, kling_task_status, kling_submitted_at, kling_last_polled_at, kling_model, kling_resolution, kling_audio"
      )
      .eq("video_provider", "kling")
      .in("video_status", pendingStatuses)
      .not("kling_task_id", "is", null)
      .order("kling_submitted_at", { ascending: true, nullsFirst: true })
      .limit(10);

    if (error) throw error;

    for (const post of posts || []) {
      summary.checked += 1;
      const now = new Date();
      const submittedAtMs = new Date(post.kling_submitted_at || 0).getTime();
      const ageHours = Number.isFinite(submittedAtMs)
        ? (now.getTime() - submittedAtMs) / 3_600_000
        : 0;

      if (submittedAtMs > 0 && ageHours > maxPendingHours) {
        const message = `Kling generation did not finish within ${maxPendingHours} hours. No automatic retry was made; this post has already used its one allowed Kling generation.`;
        await markKlingPostFailed(supabase, post, "kling_video_timeout", message);
        summary.failed += 1;
        summary.timed_out += 1;
        continue;
      }

      let task;
      try {
        // Polling this existing task is safe and does not create or bill a new generation.
        task = await getKlingImageToVideoTask(post.kling_task_id);
      } catch (pollError) {
        console.warn("Kling task polling failed; existing task will be polled again", {
          postId: post.id,
          taskId: post.kling_task_id,
          message: pollError?.message || String(pollError),
        });
        await supabase.from("posts").update({
          kling_last_polled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", post.id);
        summary.poll_errors += 1;
        continue;
      }

      const providerStatus = String(task?.status || "unknown").toLowerCase();
      const nowIso = new Date().toISOString();
      await supabase.from("posts").update({
        kling_task_status: providerStatus,
        kling_last_polled_at: nowIso,
        video_status:
          ["submitted", "created", "queued", "pending", "processing", "rendering"].includes(providerStatus)
            ? providerStatus
            : post.video_status,
        updated_at: nowIso,
      }).eq("id", post.id);

      if (isKlingTaskFailed(providerStatus)) {
        const message = `Kling generation failed${task?.message ? `: ${truncate(task.message, 900)}` : "."} No automatic retry was made.`;
        await markKlingPostFailed(supabase, post, "kling_video_generation", message);
        summary.failed += 1;
        continue;
      }

      if (!isKlingTaskSuccessful(providerStatus)) {
        summary.pending += 1;
        continue;
      }

      if (!task?.videoUrl) {
        const message =
          "Kling reported a successful generation but returned no downloadable video URL. No automatic retry was made.";
        await markKlingPostFailed(supabase, post, "kling_video_result", message);
        summary.failed += 1;
        continue;
      }

      const costTracker = createGenerationCostTracker({ supabase, postId: post.id });
      const rawOpenai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const openai = wrapOpenAIForCostTracking(rawOpenai, () => costTracker);
      try {
        await costTracker.recordKling({
          model: post.kling_model || "kling-3.0",
          durationSeconds: normalizeVideoDurationSeconds(
            task.durationSeconds,
            post.video_duration_seconds,
            6
          ),
          resolution: post.kling_resolution || "720p",
          audio: post.kling_audio || "off",
          taskId: post.kling_task_id,
          billingAt: post.kling_submitted_at || null,
          succeeded: true,
        });
      } catch (costError) {
        console.warn("Kling generation cost tracking failed without affecting finalization", {
          postId: post.id,
          taskId: post.kling_task_id,
          message: costError?.message || String(costError),
        });
      }

      try {
        const productViewValidation = await validateKlingVideoProductView({
          openai,
          supabase,
          post,
          task,
        });
        if (!productViewValidation.passed) {
          const reason = productViewValidation?.validation?.reason || "The generated video exposed an unverified product surface or altered the verified product identity.";
          await markKlingPostFailed(
            supabase,
            post,
            "kling_product_surface_validation",
            `Kling video rejected before delivery: ${reason}`
          );
          summary.failed += 1;
          summary.product_surface_rejected = Number(summary.product_surface_rejected || 0) + 1;
          continue;
        }

        const finalVideo = await getKlingFinalVideoSource({
          openai,
          supabase,
          post,
          task,
          costTracker,
        });
        await finalizeReadyTask(supabase, post, task, finalVideo.videoUrl);
        summary.completed += 1;
        if (finalVideo.postprocessApplied) {
          summary.professional_typography_applied =
            Number(summary.professional_typography_applied || 0) + 1;
        }
      } catch (finalizeError) {
        // Do not fail the Kling generation just because downloading/copying the
        // successful result had a temporary error. The same provider task can
        // be finalized again next minute without generating or billing a new video.
        console.warn("Kling video finalization failed; existing result will be retried", {
          postId: post.id,
          taskId: post.kling_task_id,
          message: finalizeError?.message || String(finalizeError),
        });
        await supabase.from("posts").update({
          video_error: truncate(
            `Kling video is ready but Spreelo has not copied it yet: ${finalizeError?.message || "finalization error"}`,
            1600
          ),
          kling_last_polled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", post.id);
        summary.poll_errors += 1;
      }
    }

    return Response.json({
      ok: true,
      mode: "kling_existing_task_finalizer_no_generation_retry",
      max_pending_hours: maxPendingHours,
      summary,
    });
  } catch (error) {
    console.error("Kling finalizer cron failed", error);
    return Response.json(
      { ok: false, error: error?.message || "Could not finalize Kling videos", summary },
      { status: 500 }
    );
  }
}
