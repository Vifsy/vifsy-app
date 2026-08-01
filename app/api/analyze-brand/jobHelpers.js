import { getWebsiteSecurityCustomerMessage } from "../../../lib/websiteSecurity.js";

export const BRAND_ANALYSIS_JOB_SELECT = [
  "id",
  "user_id",
  "brand_profile_id",
  "status",
  "step",
  "progress",
  "website_url",
  "brand_description",
  "business_name",
  "content_market",
  "country_code",
  "content_language",
  "notification_locale",
  "result",
  "error_message",
  "internal_error",
  "user_message_code",
  "user_message",
  "attempt_count",
  "next_attempt_at",
  "worker_name",
  "lease_token",
  "lease_expires_at",
  "last_heartbeat_at",
  "openai_response_id",
  "web_research_evidence",
  "web_research_sources",
  "analysis_completed_email_sent_at",
  "analysis_completed_email_error",
  "created_at",
  "updated_at",
  "started_at",
  "completed_at",
  "failed_at",
].join(", ");

export function getCustomerFriendlyAnalysisError(error) {
  const securityMessage = getWebsiteSecurityCustomerMessage(error);
  if (securityMessage) return securityMessage;

  const message = String(error?.message || "");

  if (
    message.includes("FUNCTION_INVOCATION_TIMEOUT") ||
    message.toLowerCase().includes("timeout") ||
    message.toLowerCase().includes("aborted")
  ) {
    return "Spreelo could not finish the website analysis in time. Please try again. If it still takes too long, add a short business description instead.";
  }

  if (
    message.toLowerCase().includes("json") ||
    message.toLowerCase().includes("parse") ||
    message.toLowerCase().includes("openai response") ||
    message.toLowerCase().includes("analysis result")
  ) {
    return "Spreelo could not read the analysis result correctly. Please try again.";
  }

  if (
    message.toLowerCase().includes("website returned") ||
    message.toLowerCase().includes("website did not return html") ||
    message.toLowerCase().includes("fetch failed") ||
    message.toLowerCase().includes("website url") ||
    message.toLowerCase().includes("website is required")
  ) {
    return "Spreelo could not read this website right now. Please check the website URL or add a short business description instead.";
  }

  return (
    message ||
    "Spreelo could not finish the brand analysis right now. Please try again."
  );
}

export async function updateBrandAnalysisJob({
  supabase,
  userId,
  jobId,
  status,
  step,
  progress,
  result,
  errorMessage,
  internalError,
  startedAt,
  completedAt,
  failedAt,
  notificationLocale,
  userMessageCode,
  userMessage,
  nextAttemptAt,
  workerName,
  leaseToken,
  leaseExpiresAt,
  lastHeartbeatAt,
  openaiResponseId,
  webResearchEvidence,
  webResearchSources,
  analysisCompletedEmailSentAt,
  analysisCompletedEmailError,
  attemptCount,
  expectedLeaseToken,
}) {
  const updatePayload = {
    updated_at: new Date().toISOString(),
  };

  if (status !== undefined) {
    updatePayload.status = status;
  }

  if (step !== undefined) {
    updatePayload.step = step;
  }

  if (progress !== undefined) {
    updatePayload.progress = progress;
  }

  if (result !== undefined) {
    updatePayload.result = result;
  }

  if (errorMessage !== undefined) {
    updatePayload.error_message = errorMessage;
  }

  if (internalError !== undefined) {
    updatePayload.internal_error = internalError;
  }

  if (startedAt !== undefined) {
    updatePayload.started_at = startedAt;
  }

  if (completedAt !== undefined) {
    updatePayload.completed_at = completedAt;
  }

  if (failedAt !== undefined) {
    updatePayload.failed_at = failedAt;
  }

  if (notificationLocale !== undefined) {
    updatePayload.notification_locale = notificationLocale;
  }

  if (userMessageCode !== undefined) {
    updatePayload.user_message_code = userMessageCode;
  }

  if (userMessage !== undefined) {
    updatePayload.user_message = userMessage;
  }

  if (nextAttemptAt !== undefined) {
    updatePayload.next_attempt_at = nextAttemptAt;
  }

  if (workerName !== undefined) {
    updatePayload.worker_name = workerName;
  }

  if (leaseToken !== undefined) {
    updatePayload.lease_token = leaseToken;
  }

  if (leaseExpiresAt !== undefined) {
    updatePayload.lease_expires_at = leaseExpiresAt;
  }

  if (lastHeartbeatAt !== undefined) {
    updatePayload.last_heartbeat_at = lastHeartbeatAt;
  }

  if (openaiResponseId !== undefined) {
    updatePayload.openai_response_id = openaiResponseId;
  }

  if (webResearchEvidence !== undefined) {
    updatePayload.web_research_evidence = webResearchEvidence;
  }

  if (webResearchSources !== undefined) {
    updatePayload.web_research_sources = webResearchSources;
  }

  if (analysisCompletedEmailSentAt !== undefined) {
    updatePayload.analysis_completed_email_sent_at =
      analysisCompletedEmailSentAt;
  }

  if (analysisCompletedEmailError !== undefined) {
    updatePayload.analysis_completed_email_error =
      analysisCompletedEmailError;
  }

  if (attemptCount !== undefined) {
    updatePayload.attempt_count = Math.max(0, Number(attemptCount) || 0);
  }

  let updateQuery = supabase
    .from("brand_analysis_jobs")
    .update(updatePayload)
    .eq("id", jobId)
    .eq("user_id", userId);

  if (expectedLeaseToken) {
    updateQuery = updateQuery.eq("lease_token", expectedLeaseToken);
  }

  const { data, error } = await updateQuery
    .select(BRAND_ANALYSIS_JOB_SELECT)
    .single();

  if (error) {
    throw new Error(error.message || "Could not update analysis job.");
  }

  return data;
}

export async function readBrandAnalysisJob({ supabase, userId, jobId }) {
  const { data: job, error } = await supabase
    .from("brand_analysis_jobs")
    .select(BRAND_ANALYSIS_JOB_SELECT)
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Could not read analysis job.");
  }

  return job;
}

export async function verifyBrandAnalysisOwnership({
  supabase,
  userId,
  brandProfileId,
}) {
  const { data, error } = await supabase
    .from("brand_profiles")
    .select("id, business_name")
    .eq("id", brandProfileId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Could not verify brand profile.");
  }

  if (!data?.id) {
    throw new Error("Brand profile not found.");
  }

  return data;
}
