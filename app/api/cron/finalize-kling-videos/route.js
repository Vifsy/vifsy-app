import { createClient } from "@supabase/supabase-js";
import {
  getKlingImageToVideoTask,
  isKlingTaskFailed,
  isKlingTaskSuccessful,
} from "../../../../lib/kling.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const POST_VIDEOS_BUCKET = "post-videos";
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
      "User-Agent": "Spreelo-Kling-Finalizer/144.07",
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

async function finalizeReadyTask(supabase, post, task) {
  const videoBuffer = await downloadKlingVideo(task.videoUrl);
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
      video_duration_seconds:
        Number(task.durationSeconds || post.video_duration_seconds || 0) ||
        post.video_duration_seconds ||
        6,
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
        "id, user_id, status, video_provider, video_status, video_duration_seconds, video_error, kling_generation_count, kling_task_id, kling_task_status, kling_submitted_at, kling_last_polled_at"
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

      try {
        await finalizeReadyTask(supabase, post, task);
        summary.completed += 1;
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
