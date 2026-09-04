import { createClient } from "@supabase/supabase-js";
import { sendLifecycleEmail } from "../../../../lib/lifecycleEmails.js";
import { resolveBestServerLocale } from "../../../../lib/i18n/serverUiText.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const BRAND_BATCH_SIZE = 20;
const EMAIL_RETRY_BATCH_SIZE = 10;

function isAuthorized(request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") || "";
  return Boolean(cronSecret && authorization === `Bearer ${cronSecret}`);
}

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase service-role configuration.");
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getAnnualTargetYear(now = new Date()) {
  const year = now.getUTCFullYear();
  // From December 1 onward we prepare next year. During January-November we
  // keep finishing the current year for brands that were not completed before
  // New Year, instead of accidentally jumping straight to the following year.
  return now.getUTCMonth() === 11 ? year + 1 : year;
}

async function upsertManualRescue({ admin, brand, targetYear, reason = "manual_brand" }) {
  const now = new Date().toISOString();
  const { data: existingCase, error: existingCaseError } = await admin
    .from("admin_rescue_cases")
    .select("id,status")
    .eq("brand_profile_id", brand.id)
    .eq("case_type", "annual_calendar")
    .eq("target_year", targetYear)
    .maybeSingle();
  if (existingCaseError) throw existingCaseError;

  const protectedStatuses = new Set(["exported", "imported", "completed"]);
  const caseStatus = protectedStatuses.has(existingCase?.status) ? existingCase.status : "needed";
  const renewalStatus = caseStatus === "imported"
    ? "rescue_imported"
    : caseStatus === "completed"
      ? "completed"
      : "rescue_needed";

  const { error: renewalUpsertError } = await admin.from("brand_calendar_renewals").upsert({
    user_id: brand.user_id,
    brand_profile_id: brand.id,
    target_year: targetYear,
    mode: "manual_rescue",
    status: renewalStatus,
    last_error: reason === "manual_brand" ? null : String(reason).slice(0, 4000),
    updated_at: now,
  }, { onConflict: "brand_profile_id,target_year" });
  if (renewalUpsertError) throw renewalUpsertError;

  if (!existingCase) {
    const { error: rescueInsertError } = await admin.from("admin_rescue_cases").insert({
      case_type: "annual_calendar",
      user_id: brand.user_id,
      brand_profile_id: brand.id,
      target_year: targetYear,
      status: "needed",
      error_code: reason === "manual_brand" ? "manual_calendar_rescue_required" : "annual_refresh_failed",
      error_message: reason === "manual_brand"
        ? "This brand uses manual website-analysis rescue and needs a manual calendar refresh for the new year."
        : String(reason).slice(0, 4000),
      source_context: {
        business_name: brand.business_name || "",
        website_url: brand.website_url || "",
        content_market: brand.content_market || "",
        country_code: brand.country_code || "",
        content_language: brand.content_language || "",
        previous_calendar_year: Number(brand.campaign_calendar_year || 0) || null,
        target_calendar_year: targetYear,
      },
      updated_at: now,
    });
    if (rescueInsertError) throw rescueInsertError;
  }
}

async function queueAutomaticRefresh({ admin, brand, targetYear }) {
  const { data: existingRenewal } = await admin
    .from("brand_calendar_renewals")
    .select("id,status,analysis_job_id")
    .eq("brand_profile_id", brand.id)
    .eq("target_year", targetYear)
    .maybeSingle();

  if (["queued", "running", "completed", "rescue_needed", "rescue_imported"].includes(existingRenewal?.status)) {
    return { skipped: true, reason: existingRenewal.status };
  }

  const { data: existingJobs } = await admin
    .from("brand_analysis_jobs")
    .select("id,status")
    .eq("brand_profile_id", brand.id)
    .eq("analysis_kind", "annual_calendar_refresh")
    .eq("target_calendar_year", targetYear)
    .in("status", ["pending", "running", "completed"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingJobs?.[0]?.id) {
    const status = existingJobs[0].status === "completed" ? "completed" : "queued";
    const { error: renewalError } = await admin.from("brand_calendar_renewals").upsert({
      user_id: brand.user_id,
      brand_profile_id: brand.id,
      target_year: targetYear,
      mode: "automatic",
      status,
      analysis_job_id: existingJobs[0].id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "brand_profile_id,target_year" });
    if (renewalError) throw renewalError;
    return { skipped: true, reason: `job_${existingJobs[0].status}` };
  }

  const locale = resolveBestServerLocale({ languageCandidates: [brand.content_language] });
  const { data: job, error: jobError } = await admin
    .from("brand_analysis_jobs")
    .insert({
      user_id: brand.user_id,
      brand_profile_id: brand.id,
      status: "pending",
      step: "queued",
      progress: 0,
      website_url: brand.website_url || "",
      brand_description: brand.brand_description || "",
      business_name: brand.business_name || "",
      content_market: brand.content_market || "",
      country_code: brand.country_code || "",
      content_language: brand.content_language || "",
      notification_locale: locale,
      user_message_code: "annual_calendar_refresh_queued",
      user_message: "",
      attempt_count: 0,
      next_attempt_at: new Date().toISOString(),
      analysis_kind: "annual_calendar_refresh",
      target_calendar_year: targetYear,
      result: {},
      error_message: "",
      internal_error: "",
    })
    .select("id")
    .single();

  if (jobError) throw jobError;

  const { error: renewalError } = await admin.from("brand_calendar_renewals").upsert({
    user_id: brand.user_id,
    brand_profile_id: brand.id,
    target_year: targetYear,
    mode: "automatic",
    status: "queued",
    analysis_job_id: job.id,
    last_error: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "brand_profile_id,target_year" });
  if (renewalError) throw renewalError;

  return { queued: true, jobId: job.id };
}

async function retryCalendarEmails(admin, targetYear) {
  const { data: renewals, error } = await admin
    .from("brand_calendar_renewals")
    .select("id,user_id,brand_profile_id,target_year,campaign_count,brand_profiles!inner(business_name,content_language)")
    .eq("status", "completed")
    .eq("target_year", targetYear)
    .order("completed_at", { ascending: true, nullsFirst: false })
    .limit(EMAIL_RETRY_BATCH_SIZE);
  if (error) throw error;

  let sent = 0;
  for (const renewal of renewals || []) {
    const profile = renewal.brand_profiles || {};
    try {
      const result = await sendLifecycleEmail({
        supabaseAdmin: admin,
        userId: renewal.user_id,
        emailType: "calendar_updated",
        entityKey: `${renewal.brand_profile_id}:${renewal.target_year}`,
        locale: resolveBestServerLocale({ languageCandidates: [profile.content_language] }),
        brandName: profile.business_name || "Spreelo",
        campaignCount: Number(renewal.campaign_count || 0),
        calendarYear: renewal.target_year,
        destinationPath: "/calendar",
      });
      if (result?.sent) sent += 1;
    } catch (emailError) {
      console.error("Calendar update email retry failed", {
        renewalId: renewal.id,
        message: emailError?.message,
      });
    }
  }
  return sent;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const targetYear = getAnnualTargetYear();

    const { data: brands, error: brandError } = await admin
      .from("brand_profiles")
      .select("id,user_id,business_name,website_url,brand_description,content_market,country_code,content_language,campaign_calendar_year,calendar_generation_mode")
      .lt("campaign_calendar_year", targetYear)
      .order("updated_at", { ascending: true })
      .limit(BRAND_BATCH_SIZE);
    if (brandError) throw brandError;

    let queued = 0;
    let rescueNeeded = 0;
    let skipped = 0;
    for (const brand of brands || []) {
      if (brand.calendar_generation_mode === "manual_rescue") {
        await upsertManualRescue({ admin, brand, targetYear });
        rescueNeeded += 1;
        continue;
      }
      try {
        const result = await queueAutomaticRefresh({ admin, brand, targetYear });
        if (result?.queued) queued += 1;
        else skipped += 1;
      } catch (error) {
        await upsertManualRescue({ admin, brand, targetYear, reason: error?.message || "Annual calendar refresh could not be queued." });
        rescueNeeded += 1;
      }
    }

    const emailsSent = await retryCalendarEmails(admin, targetYear).catch(() => 0);
    return Response.json({
      ok: true,
      active: true,
      targetYear,
      inspected: (brands || []).length,
      queued,
      rescueNeeded,
      skipped,
      emailsSent,
    });
  } catch (error) {
    console.error("Calendar renewal maintenance failed", { message: error?.message });
    return Response.json({ ok: false, error: error?.message || "Calendar renewal maintenance failed." }, { status: 500 });
  }
}
