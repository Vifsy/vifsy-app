import { createClient } from "@supabase/supabase-js";
import { runBrandAnalysisJob } from "../brandAnalysisEngine.js";
import {
  getCustomerFriendlyAnalysisError,
  readBrandAnalysisJob,
  updateBrandAnalysisJob,
  verifyBrandAnalysisOwnership,
} from "../jobHelpers.js";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function getAuthenticatedUser(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const authorizationHeader = request.headers.get("authorization") || "";

  if (!authorizationHeader.startsWith("Bearer ")) {
    return {
      supabase: null,
      user: null,
      error: "Unauthorized.",
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorizationHeader,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      user: null,
      error: "Unauthorized.",
    };
  }

  return {
    supabase,
    user,
    error: "",
  };
}

export async function POST(request) {
  let supabase = null;
  let user = null;
  let jobId = "";
  let job = null;

  try {
    const authResult = await getAuthenticatedUser(request);

    supabase = authResult.supabase;
    user = authResult.user;

    if (authResult.error || !supabase || !user) {
      return Response.json(
        {
          ok: false,
          error: authResult.error || "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    jobId = String(body?.jobId || body?.job_id || "").trim();

    if (!jobId) {
      return Response.json(
        {
          ok: false,
          error: "Missing analysis job.",
        },
        { status: 400 }
      );
    }

    job = await readBrandAnalysisJob({
      supabase,
      userId: user.id,
      jobId,
    });

    if (!job?.id) {
      return Response.json(
        {
          ok: false,
          error: "Analysis job not found.",
        },
        { status: 404 }
      );
    }

    if (job.status === "completed") {
      return Response.json({
        ok: true,
        job,
        message: "Brand analysis job is already completed.",
      });
    }

    if (job.status === "running") {
      return Response.json({
        ok: true,
        job,
        message: "Brand analysis job is already running.",
      });
    }

    await verifyBrandAnalysisOwnership({
      supabase,
      userId: user.id,
      brandProfileId: job.brand_profile_id,
    });

    const completedJob = await runBrandAnalysisJob({
      supabase,
      userId: user.id,
      job,
      updateJob: async (updates) =>
        updateBrandAnalysisJob({
          supabase,
          userId: user.id,
          jobId,
          ...updates,
        }),
    });

    return Response.json({
      ok: true,
      job: completedJob,
      message: "Brand analysis completed.",
    });
  } catch (error) {
    console.error("Run brand analysis failed:", {
      jobId,
      message: error?.message,
      stack: error?.stack,
    });

    const customerError = getCustomerFriendlyAnalysisError(error);

    if (supabase && user && job?.brand_profile_id && error?.code === "WEBSITE_SECURITY_BLOCKED") {
      try {
        await supabase
          .from("brand_profiles")
          .update({
            website_access_status: "security_blocked",
            website_security_provider: error.provider || "unknown",
            website_security_confidence: error.confidence || "low",
            website_access_status_code: Number(error.status || 403),
            website_access_message: customerError,
            website_access_checked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.brand_profile_id)
          .eq("user_id", user.id);
      } catch (securityStatusError) {
        console.error("Could not save website security block status:", {
          jobId,
          message: securityStatusError?.message,
        });
      }
    }

    if (supabase && user && jobId) {
      try {
        await updateBrandAnalysisJob({
          supabase,
          userId: user.id,
          jobId,
          status: "failed",
          step: "failed",
          progress: 100,
          errorMessage: customerError,
          internalError: String(error?.message || "Unknown error").slice(
            0,
            2000
          ),
          failedAt: new Date().toISOString(),
        });
      } catch (updateError) {
        console.error("Could not mark analysis job as failed:", {
          jobId,
          message: updateError?.message,
        });
      }
    }

    return Response.json(
      {
        ok: false,
        error: customerError,
      },
      { status: 500 }
    );
  }
}
