import { adminContextError, getAdminContext } from "../../../../lib/adminAuth";
import { sendLifecycleEmail } from "../../../../lib/lifecycleEmails.js";
import { resolveBestServerLocale } from "../../../../lib/i18n/serverUiText.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function annualTargetYear(now = new Date()) {
  return now.getUTCMonth() === 11 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
}

async function loadPaged(queryFactory, pageSize = 500, maxRows = 5000) {
  const rows = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const result = await queryFactory(from, from + pageSize - 1);
    if (result.error) throw result.error;
    const page = result.data || [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

async function ensureCaseForBrand({ admin, brand, caseType, targetYear = 0, sourceJobId = null, errorCode, errorMessage }) {
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("admin_rescue_cases")
    .upsert({
      case_type: caseType,
      user_id: brand.user_id,
      brand_profile_id: brand.id,
      source_job_id: sourceJobId,
      target_year: Number(targetYear || 0),
      status: "needed",
      error_code: String(errorCode || "manual_rescue_required").slice(0, 160),
      error_message: String(errorMessage || "Manual Spreelo rescue is required.").slice(0, 4000),
      source_context: {
        business_name: brand.business_name || "",
        website_url: brand.website_url || "",
        content_market: brand.content_market || "",
        country_code: brand.country_code || "",
        content_language: brand.content_language || "",
        previous_calendar_year: Number(brand.campaign_calendar_year || 0) || null,
        target_calendar_year: Number(targetYear || 0) || null,
      },
      updated_at: now,
    }, { onConflict: "brand_profile_id,case_type,target_year", ignoreDuplicates: true })
    .select("id,case_type,user_id,brand_profile_id,source_job_id,target_year,status,error_code,error_message,source_context,imported_manifest,imported_at,imported_by,completed_at,created_at,updated_at")
    .maybeSingle();
  if (error) throw error;
  if (data) return data;
  const { data: existing, error: existingError } = await admin
    .from("admin_rescue_cases")
    .select("id,case_type,user_id,brand_profile_id,source_job_id,target_year,status,error_code,error_message,source_context,imported_manifest,imported_at,imported_by,completed_at,created_at,updated_at")
    .eq("brand_profile_id", brand.id)
    .eq("case_type", caseType)
    .eq("target_year", Number(targetYear || 0))
    .maybeSingle();
  if (existingError) throw existingError;
  return existing;
}

async function prepareAnnualCase({ admin, brand, targetYear, reason = "manual_calendar_rescue_required" }) {
  const rescueCase = await ensureCaseForBrand({
    admin,
    brand,
    caseType: "annual_calendar",
    targetYear,
    errorCode: reason,
    errorMessage: "This brand needs a manual annual calendar refresh because its website analysis is handled through Spreelo rescue.",
  });
  await admin.from("brand_calendar_renewals").upsert({
    user_id: brand.user_id,
    brand_profile_id: brand.id,
    target_year: targetYear,
    mode: "manual_rescue",
    status: rescueCase?.status === "imported" ? "rescue_imported" : rescueCase?.status === "completed" ? "completed" : "rescue_needed",
    updated_at: new Date().toISOString(),
  }, { onConflict: "brand_profile_id,target_year" });
  return rescueCase;
}

export async function GET(request) {
  const context = await getAdminContext(request);
  if (context.error) return adminContextError(context);

  try {
    const targetYear = annualTargetYear();
    const brandSelect = "id,user_id,business_name,website_url,brand_description,industry,target_audience,content_market,country_code,content_language,campaign_calendar_year,campaign_calendar_generated_at,campaign_calendar_refreshed_at,calendar_generation_mode,analysis_rescue_required,last_manual_analysis_rescue_at,last_manual_calendar_rescue_at,website_product_mode_available,website_product_mode_reason,website_product_source_url,website_access_status,website_access_message,updated_at";
    const brands = await loadPaged((from, to) => context.admin
      .from("brand_profiles")
      .select(brandSelect)
      .order("updated_at", { ascending: false })
      .range(from, to));
    const brandMap = new Map(brands.map((brand) => [brand.id, brand]));

    // Seed only genuinely unfinished blocked analyses from pre-v144.109 data.
    // A historical failed re-analysis on a brand that already has a calendar is
    // not turned into a new rescue task.
    const unfinishedBlockedBrands = brands.filter((brand) =>
      !brand.campaign_calendar_generated_at &&
      ["security_blocked", "direct_fetch_timeout"].includes(String(brand.website_access_status || ""))
    );
    for (const brand of unfinishedBlockedBrands.slice(0, 100)) {
      await ensureCaseForBrand({
        admin: context.admin,
        brand,
        caseType: "brand_analysis",
        errorCode: String(brand.website_access_status || "analysis_failed"),
        errorMessage: brand.website_access_message || "The automated website analysis could not be completed.",
      });
    }

    const [caseResult, renewalResult, productResult, emailResult] = await Promise.all([
      context.admin
        .from("admin_rescue_cases")
        .select("id,case_type,user_id,brand_profile_id,source_job_id,target_year,status,error_code,error_message,source_context,imported_manifest,imported_at,imported_by,completed_at,created_at,updated_at")
        .neq("status", "dismissed")
        .order("updated_at", { ascending: false })
        .limit(1000),
      context.admin
        .from("brand_calendar_renewals")
        .select("id,user_id,brand_profile_id,target_year,mode,status,analysis_job_id,campaign_count,last_error,completed_at,created_at,updated_at")
        .eq("target_year", targetYear)
        .order("updated_at", { ascending: false })
        .limit(2000),
      context.admin
        .from("admin_generation_work_items")
        .select("id,user_id,brand_profile_id,scheduled_for,status,plan_name,platform,content_type_id,content_type_label,content_format,source_url,failure_code,failure_stage,failure_message,rescue_status,rescue_imported_at,updated_at")
        .eq("status", "failed")
        .in("rescue_status", ["needed", "imported", "ready"])
        .order("updated_at", { ascending: false })
        .limit(500),
      context.admin
        .from("user_lifecycle_emails")
        .select("user_id,email_type,entity_key,status,sent_at,last_error,attempt_count,updated_at")
        .eq("email_type", "calendar_updated")
        .order("updated_at", { ascending: false })
        .limit(5000),
    ]);

    for (const result of [caseResult, renewalResult, productResult, emailResult]) {
      if (result.error) throw result.error;
    }

    const cases = (caseResult.data || []).map((item) => ({
      ...item,
      brand: brandMap.get(item.brand_profile_id) || null,
    }));
    const renewalMap = new Map((renewalResult.data || []).map((item) => [item.brand_profile_id, item]));
    const emailMap = new Map();
    for (const item of emailResult.data || []) {
      if (!emailMap.has(item.entity_key)) emailMap.set(item.entity_key, item);
    }
    const caseMap = new Map(cases.filter((item) => item.case_type === "annual_calendar" && Number(item.target_year) === targetYear).map((item) => [item.brand_profile_id, item]));

    const annualEligibleBrands = brands.filter((brand) =>
      Boolean(brand.campaign_calendar_generated_at) || Number(brand.campaign_calendar_year || 0) > 0
    );
    const annualBrands = annualEligibleBrands.map((brand) => {
      const renewal = renewalMap.get(brand.id) || null;
      const rescueCase = caseMap.get(brand.id) || null;
      const email = emailMap.get(`${brand.id}:${targetYear}`) || null;
      const calendarReady = Number(brand.campaign_calendar_year || 0) >= targetYear || renewal?.status === "completed";
      let status = renewal?.status || "";
      if (!status) {
        if (calendarReady) status = "completed";
        else if (brand.calendar_generation_mode === "manual_rescue") status = "rescue_needed";
        else status = "automatic_pending";
      }
      return {
        brand_profile_id: brand.id,
        user_id: brand.user_id,
        business_name: brand.business_name || "",
        website_url: brand.website_url || "",
        content_language: brand.content_language || "",
        content_market: brand.content_market || "",
        calendar_generation_mode: brand.calendar_generation_mode || "automatic",
        current_calendar_year: Number(brand.campaign_calendar_year || 0) || null,
        target_year: targetYear,
        status,
        renewal,
        rescue_case: rescueCase,
        customer_email: email,
      };
    });

    const analysisCases = cases.filter((item) => item.case_type === "brand_analysis" && item.status !== "completed");
    const openAnalysisCaseMap = new Map(analysisCases.map((item) => [item.brand_profile_id, item]));
    const analysisBrandOptions = brands.map((brand) => ({
      brand_profile_id: brand.id,
      business_name: brand.business_name || "",
      website_url: brand.website_url || "",
      content_language: brand.content_language || "",
      content_market: brand.content_market || "",
      has_open_rescue: openAnalysisCaseMap.has(brand.id),
      open_rescue_case_id: openAnalysisCaseMap.get(brand.id)?.id || null,
    }));
    const annualCases = cases.filter((item) => item.case_type === "annual_calendar" && Number(item.target_year) === targetYear && item.status !== "completed");
    const completedAnnual = annualBrands.filter((item) => item.status === "completed").length;
    const manualAnnual = annualBrands.filter((item) => ["rescue_needed", "rescue_imported"].includes(item.status)).length;

    return Response.json({
      ok: true,
      targetYear,
      counts: {
        failedAnalyses: analysisCases.length,
        failedPosts: (productResult.data || []).length,
        annualTotal: annualBrands.length,
        annualCompleted: completedAnnual,
        annualManual: manualAnnual,
      },
      analysisCases,
      analysisBrandOptions,
      productFailures: (productResult.data || []).map((item) => ({
        ...item,
        brand: brandMap.get(item.brand_profile_id) || null,
      })),
      annualCases,
      annualBrands,
    });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || "Could not load Rescue Center." }, { status: 500 });
  }
}

export async function POST(request) {
  const context = await getAdminContext(request);
  if (context.error) return adminContextError(context);

  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "");
    const brandProfileId = String(body?.brandProfileId || "");
    if (!brandProfileId) return Response.json({ ok: false, error: "brandProfileId is required." }, { status: 400 });

    const { data: brand, error: brandError } = await context.admin
      .from("brand_profiles")
      .select("id,user_id,business_name,website_url,brand_description,industry,target_audience,content_market,country_code,content_language,campaign_calendar_year,calendar_generation_mode,analysis_rescue_required")
      .eq("id", brandProfileId)
      .maybeSingle();
    if (brandError) throw brandError;
    if (!brand) return Response.json({ ok: false, error: "Brand was not found." }, { status: 404 });

    if (action === "prepare_annual_rescue") {
      const targetYear = Number(body?.targetYear || annualTargetYear());
      if (!Number.isInteger(targetYear) || targetYear < 2020 || targetYear > 2100) {
        return Response.json({ ok: false, error: "Invalid target year." }, { status: 400 });
      }
      const rescueCase = await prepareAnnualCase({ admin: context.admin, brand, targetYear });
      await context.admin.from("brand_profiles").update({
        calendar_generation_mode: "manual_rescue",
        updated_at: new Date().toISOString(),
      }).eq("id", brand.id);
      return Response.json({ ok: true, rescueCase });
    }

    if (action === "prepare_analysis_rescue") {
      const rescueCase = await ensureCaseForBrand({
        admin: context.admin,
        brand,
        caseType: "brand_analysis",
        errorCode: "manual_analysis_rescue_requested",
        errorMessage: "Admin requested manual website-analysis rescue.",
      });
      await context.admin.from("brand_profiles").update({
        analysis_rescue_required: true,
        updated_at: new Date().toISOString(),
      }).eq("id", brand.id);
      return Response.json({ ok: true, rescueCase });
    }

    if (action === "set_calendar_mode") {
      const mode = String(body?.mode || "");
      if (!["automatic", "manual_rescue"].includes(mode)) {
        return Response.json({ ok: false, error: "Invalid calendar mode." }, { status: 400 });
      }
      const { error: modeError } = await context.admin.from("brand_profiles").update({
        calendar_generation_mode: mode,
        updated_at: new Date().toISOString(),
      }).eq("id", brand.id);
      if (modeError) throw modeError;
      return Response.json({ ok: true, mode });
    }

    if (action === "retry_calendar_email") {
      const targetYear = Number(body?.targetYear || annualTargetYear());
      const { data: renewal, error: renewalError } = await context.admin
        .from("brand_calendar_renewals")
        .select("campaign_count,status")
        .eq("brand_profile_id", brand.id)
        .eq("target_year", targetYear)
        .maybeSingle();
      if (renewalError) throw renewalError;
      if (renewal?.status !== "completed" && Number(brand.campaign_calendar_year || 0) < targetYear) {
        return Response.json({ ok: false, error: "The calendar is not completed yet." }, { status: 409 });
      }
      const email = await sendLifecycleEmail({
        supabaseAdmin: context.admin,
        userId: brand.user_id,
        emailType: "calendar_updated",
        entityKey: `${brand.id}:${targetYear}`,
        locale: resolveBestServerLocale({ languageCandidates: [brand.content_language] }),
        brandName: brand.business_name || "Spreelo",
        campaignCount: Number(renewal?.campaign_count || 0),
        calendarYear: targetYear,
        destinationPath: "/calendar",
      });
      return Response.json({ ok: true, email });
    }

    return Response.json({ ok: false, error: "Unsupported Rescue Center action." }, { status: 400 });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || "Rescue Center action failed." }, { status: 500 });
  }
}
