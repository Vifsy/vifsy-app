import { createClient } from "@supabase/supabase-js";
import {
  readBrandAnalysisJob,
  verifyBrandAnalysisOwnership,
} from "../jobHelpers.js";

export const dynamic = "force-dynamic";

async function getAuthenticatedUser(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authorization = request.headers.get("authorization") || "";

  if (!supabaseUrl || !anonKey || !authorization.startsWith("Bearer ")) {
    return { supabase: null, user: null };
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// Kept as a lightweight compatibility endpoint for already-open browser tabs.
// The analysis itself is deliberately not run from the browser request anymore.
export async function POST(request) {
  try {
    const { supabase, user } = await getAuthenticatedUser(request);
    if (!supabase || !user) {
      return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const jobId = String(body?.jobId || body?.job_id || "").trim();
    if (!jobId) {
      return Response.json(
        { ok: false, error: "Missing analysis job." },
        { status: 400 }
      );
    }

    const job = await readBrandAnalysisJob({
      supabase,
      userId: user.id,
      jobId,
    });
    if (!job?.id) {
      return Response.json(
        { ok: false, error: "Analysis job not found." },
        { status: 404 }
      );
    }

    await verifyBrandAnalysisOwnership({
      supabase,
      userId: user.id,
      brandProfileId: job.brand_profile_id,
    });

    return Response.json(
      {
        ok: true,
        queued: job.status !== "completed",
        job,
        message:
          job.status === "completed"
            ? "Brand analysis is complete."
            : "Brand analysis is continuing on the server.",
      },
      { status: job.status === "completed" ? 200 : 202 }
    );
  } catch (error) {
    console.error("Queue brand analysis compatibility endpoint failed", {
      message: error?.message,
    });
    return Response.json(
      { ok: false, error: error?.message || "Could not queue analysis." },
      { status: 500 }
    );
  }
}

