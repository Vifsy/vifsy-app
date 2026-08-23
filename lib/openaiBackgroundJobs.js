const ACTIVE_OPENAI_RESPONSE_STATUSES = new Set(["queued", "in_progress"]);
const ACTIVE_CAMPAIGN_JOB_STATUSES = ["starting", "queued", "in_progress"];

function normalizeResponseId(value) {
  const id = String(value || "").trim();
  return id.startsWith("resp_") ? id : "";
}

function isAlreadyTerminalCancelError(error) {
  const status = Number(error?.status || error?.statusCode || 0);
  const message = String(error?.message || "").toLowerCase();
  return (
    status === 404 ||
    message.includes("already completed") ||
    message.includes("already cancelled") ||
    message.includes("already canceled") ||
    message.includes("cannot cancel") ||
    message.includes("not in progress") ||
    message.includes("not found")
  );
}

export async function cancelOpenAIBackgroundResponse({
  openai,
  responseId,
  reason = "superseded",
}) {
  const id = normalizeResponseId(responseId);
  if (!openai || !id) {
    return { responseId: id || null, cancelled: false, terminal: false, skipped: true };
  }

  try {
    const response = await openai.responses.cancel(id, {
      timeout: 10_000,
      maxRetries: 0,
    });
    const status = String(response?.status || "cancelled").toLowerCase();
    console.warn("OpenAI background response cancelled", {
      responseId: id,
      reason,
      status,
    });
    return {
      responseId: id,
      cancelled: status === "cancelled" || !ACTIVE_OPENAI_RESPONSE_STATUSES.has(status),
      terminal: true,
      status,
      skipped: false,
    };
  } catch (error) {
    if (isAlreadyTerminalCancelError(error)) {
      console.info("OpenAI background response was already terminal when cleanup ran", {
        responseId: id,
        reason,
        status: Number(error?.status || error?.statusCode || 0) || null,
        message: String(error?.message || "").slice(0, 300),
      });
      return {
        responseId: id,
        cancelled: false,
        terminal: true,
        status: "already_terminal",
        skipped: false,
      };
    }

    console.error("OpenAI background response cancellation failed", {
      responseId: id,
      reason,
      status: Number(error?.status || error?.statusCode || 0) || null,
      message: String(error?.message || error || "Unknown cancellation error").slice(0, 500),
    });
    return {
      responseId: id,
      cancelled: false,
      terminal: false,
      status: "cancel_failed",
      skipped: false,
      error: String(error?.message || error || "Unknown cancellation error"),
    };
  }
}

export async function cancelCampaignResearchJobsForOccurrence({
  supabase,
  openai,
  occurrenceId,
  reason = "occurrence_finished",
  excludeJobId = null,
  clearResponseId = false,
}) {
  if (!supabase || !openai || !occurrenceId) {
    return { matched: 0, cancelled: 0, terminal: 0, failed: 0 };
  }

  let query = supabase
    .from("automation_campaign_research_jobs")
    .select("id, openai_response_id, status, research_round")
    .eq("occurrence_id", occurrenceId)
    .in("status", ACTIVE_CAMPAIGN_JOB_STATUSES)
    .order("research_round", { ascending: true });

  if (excludeJobId) query = query.neq("id", excludeJobId);

  const { data: jobs, error } = await query;
  if (error) {
    console.warn("Could not load campaign research jobs for OpenAI cleanup", {
      occurrenceId,
      reason,
      message: error.message,
    });
    return { matched: 0, cancelled: 0, terminal: 0, failed: 1 };
  }

  let cancelled = 0;
  let terminal = 0;
  let failed = 0;

  for (const job of jobs || []) {
    const responseId = normalizeResponseId(job?.openai_response_id);
    let cancelResult = {
      cancelled: false,
      terminal: !responseId,
      status: responseId ? "unknown" : "not_started",
    };

    if (responseId) {
      cancelResult = await cancelOpenAIBackgroundResponse({
        openai,
        responseId,
        reason: `${reason}:campaign_round_${job.research_round || "unknown"}`,
      });
    }

    if (cancelResult.cancelled) cancelled += 1;
    if (cancelResult.terminal) terminal += 1;
    if (!cancelResult.terminal) failed += 1;

    const updatePayload = {
      status: "failed",
      last_error: `cancelled_by_spreelo:${reason}:${cancelResult.status || "unknown"}`.slice(0, 2000),
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (clearResponseId) updatePayload.openai_response_id = null;

    const { error: updateError } = await supabase
      .from("automation_campaign_research_jobs")
      .update(updatePayload)
      .eq("id", job.id);
    if (updateError) {
      failed += 1;
      console.warn("Could not mark cancelled campaign research job terminal", {
        occurrenceId,
        jobId: job.id,
        responseId: responseId || null,
        message: updateError.message,
      });
    }
  }

  return {
    matched: (jobs || []).length,
    cancelled,
    terminal,
    failed,
  };
}

export async function cancelOtherActiveCampaignResearchJobs({
  supabase,
  openai,
  occurrenceId,
  keepJobId,
  reason = "single_active_response_guard",
}) {
  return cancelCampaignResearchJobsForOccurrence({
    supabase,
    openai,
    occurrenceId,
    reason,
    excludeJobId: keepJobId || null,
    clearResponseId: false,
  });
}

export async function cleanupTerminalCampaignResearchJobs({
  supabase,
  openai,
  limit = 30,
}) {
  if (!supabase || !openai) return { scanned: 0, matched: 0, cancelled: 0, failed: 0 };

  const { data: jobs, error } = await supabase
    .from("automation_campaign_research_jobs")
    .select("id, occurrence_id, automation_rule_id, openai_response_id, status, research_round, updated_at")
    .in("status", ACTIVE_CAMPAIGN_JOB_STATUSES)
    .order("updated_at", { ascending: true })
    .limit(Math.max(1, Math.min(100, Number(limit || 30))));

  if (error || !jobs?.length) {
    if (error) {
      console.warn("OpenAI background cleanup could not load campaign jobs", {
        message: error.message,
      });
    }
    return { scanned: jobs?.length || 0, matched: 0, cancelled: 0, failed: error ? 1 : 0 };
  }

  const occurrenceIds = [...new Set(jobs.map((job) => job.occurrence_id).filter(Boolean))];
  const ruleIds = [...new Set(jobs.map((job) => job.automation_rule_id).filter(Boolean))];

  const [{ data: occurrences }, { data: rules }] = await Promise.all([
    occurrenceIds.length
      ? supabase.from("automation_occurrences").select("id, status").in("id", occurrenceIds)
      : Promise.resolve({ data: [] }),
    ruleIds.length
      ? supabase.from("automation_rules").select("id, is_active").in("id", ruleIds)
      : Promise.resolve({ data: [] }),
  ]);

  const occurrenceStatus = new Map((occurrences || []).map((row) => [row.id, row.status]));
  const ruleActive = new Map((rules || []).map((row) => [row.id, row.is_active === true]));
  const grouped = new Map();

  for (const job of jobs) {
    const terminalOccurrence = ["completed", "failed_terminal"].includes(
      String(occurrenceStatus.get(job.occurrence_id) || "")
    );
    const inactiveRule = ruleActive.has(job.automation_rule_id) && !ruleActive.get(job.automation_rule_id);
    if (!terminalOccurrence && !inactiveRule) continue;
    if (!grouped.has(job.occurrence_id)) grouped.set(job.occurrence_id, []);
    grouped.get(job.occurrence_id).push(job);
  }

  let matched = 0;
  let cancelled = 0;
  let failed = 0;
  for (const [occurrenceId, groupedJobs] of grouped.entries()) {
    matched += groupedJobs.length;
    const reason = ["completed", "failed_terminal"].includes(
      String(occurrenceStatus.get(occurrenceId) || "")
    )
      ? "terminal_occurrence_cleanup"
      : "inactive_rule_cleanup";
    const result = await cancelCampaignResearchJobsForOccurrence({
      supabase,
      openai,
      occurrenceId,
      reason,
    });
    cancelled += result.cancelled;
    failed += result.failed;
  }

  return { scanned: jobs.length, matched, cancelled, failed };
}

export async function emergencyCancelTrackedOpenAIBackgroundJobs({
  supabase,
  openai,
  cooldownMs = 15 * 60 * 1000,
}) {
  if (!supabase || !openai) {
    throw new Error("OpenAI and Supabase admin clients are required.");
  }

  const now = new Date();
  const cooldownUntil = new Date(now.getTime() + Math.max(60_000, Number(cooldownMs || 0))).toISOString();
  const summary = {
    campaignMatched: 0,
    campaignCancelled: 0,
    campaignFailed: 0,
    brandMatched: 0,
    brandCancelled: 0,
    brandFailed: 0,
    cooldownUntil,
  };

  const { data: campaignJobs, error: campaignError } = await supabase
    .from("automation_campaign_research_jobs")
    .select("id, occurrence_id, automation_rule_id, openai_response_id, status, research_round")
    .in("status", ACTIVE_CAMPAIGN_JOB_STATUSES)
    .limit(100);
  if (campaignError) throw new Error(`Could not load campaign background jobs: ${campaignError.message}`);

  const affectedOccurrenceIds = new Set();
  const affectedRuleIds = new Set();
  for (const job of campaignJobs || []) {
    summary.campaignMatched += 1;
    if (job.occurrence_id) affectedOccurrenceIds.add(job.occurrence_id);
    if (job.automation_rule_id) affectedRuleIds.add(job.automation_rule_id);
    const responseId = normalizeResponseId(job.openai_response_id);
    const result = responseId
      ? await cancelOpenAIBackgroundResponse({
          openai,
          responseId,
          reason: `admin_emergency_stop:campaign_round_${job.research_round || "unknown"}`,
        })
      : { terminal: true, cancelled: false, status: "not_started" };
    if (result.cancelled) summary.campaignCancelled += 1;
    if (!result.terminal) summary.campaignFailed += 1;

    const { error: updateError } = await supabase
      .from("automation_campaign_research_jobs")
      .update({
        status: "failed",
        openai_response_id: null,
        last_error: `cancelled_by_admin_emergency_stop:${result.status || "unknown"}`,
        completed_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", job.id);
    if (updateError) summary.campaignFailed += 1;
  }

  if (affectedOccurrenceIds.size) {
    const { data: resumableOccurrences } = await supabase
      .from("automation_occurrences")
      .select("id")
      .in("id", [...affectedOccurrenceIds])
      .in("status", ["running", "retry_pending"]);
    const resumableIds = (resumableOccurrences || []).map((row) => row.id).filter(Boolean);
    if (resumableIds.length) {
      await supabase
        .from("automation_occurrences")
        .update({
          status: "retry_pending",
          retry_not_before: cooldownUntil,
          failure_code: null,
          failure_stage: null,
          failure_message_internal: null,
          failure_message_customer: null,
          notification_status: "suppressed",
          updated_at: now.toISOString(),
        })
        .in("id", resumableIds);
    }
  }

  if (affectedRuleIds.size) {
    await supabase
      .from("automation_rules")
      .update({
        queue_locked_until: null,
        retry_not_before: cooldownUntil,
        last_error: null,
        generation_occurrence_status: "retry_pending",
        updated_at: now.toISOString(),
      })
      .in("id", [...affectedRuleIds]);
  }

  const { data: brandJobs, error: brandError } = await supabase
    .from("brand_analysis_jobs")
    .select("id, user_id, openai_response_id, status, step")
    .in("status", ["pending", "running"])
    .not("openai_response_id", "is", null)
    .limit(100);
  if (brandError) {
    console.warn("Emergency stop could not load brand-analysis background jobs", {
      message: brandError.message,
    });
  } else {
    for (const job of brandJobs || []) {
      const responseId = normalizeResponseId(job.openai_response_id);
      if (!responseId) continue;
      summary.brandMatched += 1;
      const result = await cancelOpenAIBackgroundResponse({
        openai,
        responseId,
        reason: "admin_emergency_stop:brand_analysis",
      });
      if (result.cancelled) summary.brandCancelled += 1;
      if (!result.terminal) summary.brandFailed += 1;

      const { error: updateError } = await supabase
        .from("brand_analysis_jobs")
        .update({
          status: "pending",
          openai_response_id: null,
          next_attempt_at: cooldownUntil,
          lease_token: null,
          lease_expires_at: null,
          worker_name: null,
          internal_error: "OpenAI background research was stopped by an administrator and may restart after cooldown.",
          updated_at: now.toISOString(),
        })
        .eq("id", job.id);
      if (updateError) summary.brandFailed += 1;
    }
  }

  return summary;
}
