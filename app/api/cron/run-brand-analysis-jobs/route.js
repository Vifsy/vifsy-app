import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { runBrandAnalysisJob } from "../../analyze-brand/brandAnalysisEngine.js";
import {
  BRAND_ANALYSIS_JOB_SELECT,
  getCustomerFriendlyAnalysisError,
  updateBrandAnalysisJob,
} from "../../analyze-brand/jobHelpers.js";
import {
  isWebResearchIncomplete,
  isWebResearchTerminalFailure,
  retrieveBlockedWebsiteResearch,
  submitBlockedWebsiteResearch,
} from "../../analyze-brand/webResearch.js";
import { sendLifecycleEmail } from "../../../../lib/lifecycleEmails.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

// Longer than Vercel's 300-second invocation limit so a replacement worker
// never overlaps a still-running invocation. A timed-out lease is reclaimed.
const WORKER_LEASE_SECONDS = 330;
const WEB_RESEARCH_POLL_SECONDS = 25;
const MAX_ANALYSIS_ATTEMPTS = 5;
const MAX_WEB_RESEARCH_RECOVERY_SUBMISSIONS = 2;
const MIN_PARTIAL_WEB_RESEARCH_EVIDENCE_CHARS = 800;

function isAuthorized(request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") || "";
  return Boolean(cronSecret && authorization === `Bearer ${cronSecret}`);
}

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase service-role configuration.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function nextAttemptIso(seconds) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

async function sendCompletionEmail({ supabase, job }) {
  if (!job?.id || !job?.user_id || job.analysis_completed_email_sent_at) return;

  try {
    await sendLifecycleEmail({
      supabaseAdmin: supabase,
      userId: job.user_id,
      emailType: "analysis_completed",
      entityKey: job.id,
      locale: job.notification_locale || "en",
      brandName:
        job?.result?.profile?.business_name || job.business_name || "Spreelo",
      campaignCount: Number(job?.result?.campaign_opportunities_count || 0),
      destinationPath: `/onboarding/ready?brandId=${encodeURIComponent(
        job.brand_profile_id
      )}`,
    });

    await supabase
      .from("brand_analysis_jobs")
      .update({
        analysis_completed_email_sent_at: new Date().toISOString(),
        analysis_completed_email_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .is("analysis_completed_email_sent_at", null);
  } catch (error) {
    console.error("Brand analysis completion email failed", {
      jobId: job.id,
      message: error?.message,
    });
    await supabase
      .from("brand_analysis_jobs")
      .update({
        analysis_completed_email_error: String(
          error?.message || "Email delivery failed"
        ).slice(0, 2000),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);
  }
}

async function retryOneCompletionEmail(supabase) {
  const { data: jobs, error } = await supabase
    .from("brand_analysis_jobs")
    .select(BRAND_ANALYSIS_JOB_SELECT)
    .eq("status", "completed")
    .is("analysis_completed_email_sent_at", null)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: true })
    .limit(1);

  if (error) throw error;
  if (jobs?.[0]) await sendCompletionEmail({ supabase, job: jobs[0] });
}

async function releaseJob({ supabase, job, updates }) {
  return updateBrandAnalysisJob({
    supabase,
    userId: job.user_id,
    jobId: job.id,
    expectedLeaseToken: job.lease_token,
    leaseToken: null,
    leaseExpiresAt: null,
    workerName: null,
    lastHeartbeatAt: new Date().toISOString(),
    ...updates,
  });
}

async function saveSecurityFallbackState({ supabase, job, error }) {
  const providerLabel = String(error?.providerLabel || "website security");
  const message = `${providerLabel} blocked Spreelo's direct connection. The analysis has switched to secure web research and will continue in the background.`;

  await supabase
    .from("brand_profiles")
    .update({
      website_access_status: "security_blocked",
      website_security_provider: error?.provider || "unknown",
      website_security_confidence: error?.confidence || "low",
      website_access_status_code: Number(error?.status || 403),
      website_access_message: message,
      website_access_checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.brand_profile_id)
    .eq("user_id", job.user_id);

  return message;
}

async function submitWebResearchAndRelease({ supabase, job, blockError }) {
  const message = await saveSecurityFallbackState({
    supabase,
    job,
    error: blockError,
  });
  const research = await submitBlockedWebsiteResearch({ job });

  if (research.status === "completed" && research.evidence) {
    await updateBrandAnalysisJob({
      supabase,
      userId: job.user_id,
      jobId: job.id,
      expectedLeaseToken: job.lease_token,
      status: "running",
      step: "web_research_ready",
      progress: 55,
      userMessageCode: "web_research_completed",
      userMessage: message,
      openaiResponseId: research.id,
      webResearchEvidence: research.evidence,
      webResearchSources: research.sources,
      lastHeartbeatAt: new Date().toISOString(),
    });

    return {
      ...job,
      web_research_evidence: research.evidence,
      web_research_sources: research.sources,
      openai_response_id: research.id,
    };
  }

  await releaseJob({
    supabase,
    job,
    updates: {
      status: "pending",
      step: "web_research_waiting",
      progress: 42,
      userMessageCode: "website_blocked_background_research",
      userMessage: message,
      openaiResponseId: research.id,
      webResearchSources: research.sources,
      nextAttemptAt: nextAttemptIso(WEB_RESEARCH_POLL_SECONDS),
    },
  });

  return null;
}

function hasUsableWebResearchEvidence(research, job) {
  const evidence = String(research?.evidence || "").trim();
  if (evidence.length < MIN_PARTIAL_WEB_RESEARCH_EVIDENCE_CHARS) return false;

  const sources = Array.isArray(research?.sources) ? research.sources : [];
  if (sources.some((source) => /^https?:\/\//i.test(String(source?.url || "")))) {
    return true;
  }

  try {
    const hostname = new URL(job?.website_url || "").hostname
      .replace(/^www\./i, "")
      .toLowerCase();
    return Boolean(hostname && evidence.toLowerCase().includes(hostname));
  } catch {
    return false;
  }
}

async function promoteWebResearchEvidence({ supabase, job, research, partial }) {
  await updateBrandAnalysisJob({
    supabase,
    userId: job.user_id,
    jobId: job.id,
    expectedLeaseToken: job.lease_token,
    status: "running",
    step: "web_research_ready",
    progress: 55,
    userMessageCode: "web_research_completed",
    userMessage: partial
      ? "Spreelo recovered sufficient official evidence from an interrupted web-research response and is completing the analysis."
      : job.user_message,
    openaiResponseId: research.id || job.openai_response_id,
    webResearchEvidence: research.evidence,
    webResearchSources: research.sources,
    internalError: partial
      ? `Recovered partial web research (${research?.incompleteDetails?.reason || "unknown reason"}).`
      : "",
    lastHeartbeatAt: new Date().toISOString(),
  });

  return {
    ...job,
    step: "web_research_ready",
    progress: 55,
    openai_response_id: research.id || job.openai_response_id,
    web_research_evidence: research.evidence,
    web_research_sources: research.sources,
  };
}

async function resumeWebResearch({ supabase, job }) {
  const research = await retrieveBlockedWebsiteResearch(
    job.openai_response_id
  );

  if (research.status === "completed") {
    if (!research.evidence) {
      throw new Error("Background web research completed without evidence.");
    }

    return promoteWebResearchEvidence({
      supabase,
      job,
      research,
      partial: false,
    });
  }

  if (isWebResearchIncomplete(research.status)) {
    const incompleteReason =
      research?.incompleteDetails?.reason || "unknown_reason";

    if (hasUsableWebResearchEvidence(research, job)) {
      console.warn("Incomplete background web research contained sufficient official evidence; continuing analysis", {
        jobId: job.id,
        responseId: research.id,
        incompleteReason,
        evidenceChars: research.evidence.length,
        sourceCount: research.sources.length,
      });
      return promoteWebResearchEvidence({
        supabase,
        job,
        research,
        partial: true,
      });
    }

    const currentSubmissionCount = Math.max(1, Number(job.attempt_count || 1));
    if (currentSubmissionCount < MAX_WEB_RESEARCH_RECOVERY_SUBMISSIONS) {
      const retryResearch = await submitBlockedWebsiteResearch({
        job,
        compactRetry: true,
        previousEvidence: research.evidence,
      });

      console.warn("Incomplete background web research restarted once with a compact recovery request", {
        jobId: job.id,
        previousResponseId: research.id,
        newResponseId: retryResearch.id,
        incompleteReason,
        previousEvidenceChars: research.evidence.length,
        newStatus: retryResearch.status,
      });

      if (
        retryResearch.status === "completed" ||
        (
          isWebResearchIncomplete(retryResearch.status) &&
          hasUsableWebResearchEvidence(retryResearch, job)
        )
      ) {
        return promoteWebResearchEvidence({
          supabase,
          job,
          research: retryResearch,
          partial: retryResearch.status !== "completed",
        });
      }

      if (isWebResearchTerminalFailure(retryResearch.status)) {
        throw new Error(
          `Background web research recovery ${retryResearch.status}: ${JSON.stringify(
            retryResearch.error || retryResearch.incompleteDetails || {}
          )}`
        );
      }

      await releaseJob({
        supabase,
        job,
        updates: {
          status: "pending",
          step: "web_research_waiting",
          progress: 48,
          attemptCount: currentSubmissionCount + 1,
          userMessageCode: "website_blocked_background_research",
          userMessage:
            "The first secure web-research response was interrupted. Spreelo restarted it in a smaller bounded form and will continue automatically.",
          openaiResponseId: retryResearch.id,
          webResearchSources: retryResearch.sources,
          internalError: `Web research incomplete (${incompleteReason}); compact recovery submitted.`,
          nextAttemptAt: nextAttemptIso(WEB_RESEARCH_POLL_SECONDS),
        },
      });

      return null;
    }

    throw new Error(
      `Background web research remained incomplete after bounded recovery: ${JSON.stringify(
        research.incompleteDetails || {}
      )}`
    );
  }

  if (isWebResearchTerminalFailure(research.status)) {
    throw new Error(
      `Background web research ${research.status}: ${JSON.stringify(
        research.error || research.incompleteDetails || {}
      )}`
    );
  }

  await releaseJob({
    supabase,
    job,
    updates: {
      status: "pending",
      step: "web_research_waiting",
      progress: Math.max(42, Number(job.progress || 0)),
      userMessageCode: "website_blocked_background_research",
      userMessage:
        job.user_message ||
        "The website blocked Spreelo's direct connection. Secure web research is continuing in the background.",
      nextAttemptAt: nextAttemptIso(WEB_RESEARCH_POLL_SECONDS),
    },
  });

  return null;
}

async function processClaimedJob({ supabase, job }) {
  let analysisJob = job;

  const updateJob = (updates) =>
    updateBrandAnalysisJob({
      supabase,
      userId: job.user_id,
      jobId: job.id,
      expectedLeaseToken: job.lease_token,
      lastHeartbeatAt: new Date().toISOString(),
      ...updates,
    });

  try {
    if (job.step === "web_research_waiting" && job.openai_response_id) {
      analysisJob = await resumeWebResearch({ supabase, job });
      if (!analysisJob) {
        return { deferred: true, reason: "web_research_running" };
      }
    }

    const completedJob = await runBrandAnalysisJob({
      supabase,
      userId: job.user_id,
      job: analysisJob,
      updateJob,
    });
    await sendCompletionEmail({ supabase, job: completedJob });
    return { completed: true, jobId: job.id };
  } catch (error) {
    if (error?.code === "WEBSITE_SECURITY_BLOCKED" && job.website_url) {
      const resumedJob = await submitWebResearchAndRelease({
        supabase,
        job,
        blockError: error,
      });

      if (!resumedJob) {
        return { deferred: true, reason: "website_security_fallback" };
      }

      const completedJob = await runBrandAnalysisJob({
        supabase,
        userId: job.user_id,
        job: resumedJob,
        updateJob,
      });
      await sendCompletionEmail({ supabase, job: completedJob });
      return { completed: true, jobId: job.id, usedWebResearch: true };
    }

    const customerError = getCustomerFriendlyAnalysisError(error);
    const attemptCount = Number(job.attempt_count || 1);
    const canRetry = attemptCount < MAX_ANALYSIS_ATTEMPTS;

    if (canRetry) {
      await releaseJob({
        supabase,
        job,
        updates: {
          status: "pending",
          step: "retry_waiting",
          progress: Math.max(8, Math.min(88, Number(job.progress || 8))),
          errorMessage: "",
          internalError: String(error?.message || "Unknown error").slice(0, 2000),
          userMessageCode: "analysis_unusually_long",
          userMessage:
            "The analysis is taking unusually long. It is continuing securely in the background and Spreelo will email you when it is ready.",
          nextAttemptAt: nextAttemptIso(Math.min(180, 30 * attemptCount)),
        },
      });
      return { deferred: true, reason: "retry_scheduled", attemptCount };
    }

    await releaseJob({
      supabase,
      job,
      updates: {
        status: "failed",
        step: "failed",
        progress: 100,
        errorMessage: customerError,
        internalError: String(error?.message || "Unknown error").slice(0, 2000),
        failedAt: new Date().toISOString(),
        userMessageCode: "analysis_failed",
      },
    });
    throw error;
  }
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const workerName = `brand-analysis-${crypto.randomUUID().slice(0, 8)}`;

  try {
    const supabase = createAdminClient();
    await retryOneCompletionEmail(supabase).catch((error) => {
      console.error("Could not retry an analysis completion email", {
        message: error?.message,
      });
    });

    const { data: claimedJobs, error: claimError } = await supabase.rpc(
      "claim_brand_analysis_job",
      {
        p_worker_name: workerName,
        p_lease_seconds: WORKER_LEASE_SECONDS,
      }
    );

    if (claimError) throw claimError;
    const job = Array.isArray(claimedJobs) ? claimedJobs[0] : claimedJobs;

    if (!job?.id) {
      return Response.json({ ok: true, workerName, claimed: 0 });
    }

    console.info("Durable brand analysis job claimed", {
      workerName,
      jobId: job.id,
      attemptCount: job.attempt_count,
      step: job.step,
    });

    const result = await processClaimedJob({ supabase, job });
    return Response.json({ ok: true, workerName, claimed: 1, result });
  } catch (error) {
    console.error("Durable brand analysis worker failed", {
      workerName,
      message: error?.message,
      stack: error?.stack,
    });
    return Response.json(
      { ok: false, workerName, error: error?.message || "Analysis worker failed." },
      { status: 500 }
    );
  }
}
