import { adminContextError, getAdminContext } from "../../../../../lib/adminAuth";
import { buildAdminRescueBrief } from "../../../../../lib/adminRescuePackages.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  const context = await getAdminContext(request);
  if (context.error) return adminContextError(context);

  try {
    const url = new URL(request.url);
    const caseId = String(url.searchParams.get("caseId") || "").trim();
    if (!caseId) return Response.json({ ok: false, error: "caseId is required." }, { status: 400 });

    const { data: rescueCase, error: caseError } = await context.admin
      .from("admin_rescue_cases")
      .select("id,case_type,user_id,brand_profile_id,source_job_id,target_year,status,error_code,error_message,source_context,created_at,updated_at")
      .eq("id", caseId)
      .maybeSingle();
    if (caseError) throw caseError;
    if (!rescueCase) return Response.json({ ok: false, error: "Rescue case was not found." }, { status: 404 });

    const { data: brand, error: brandError } = await context.admin
      .from("brand_profiles")
      .select("id,user_id,business_name,website_url,brand_description,industry,target_audience,content_market,country_code,content_language,campaign_calendar_year,calendar_generation_mode,analysis_rescue_required,website_product_mode_available,website_product_mode_reason,website_product_source_url,website_access_status,website_access_message")
      .eq("id", rescueCase.brand_profile_id)
      .eq("user_id", rescueCase.user_id)
      .maybeSingle();
    if (brandError) throw brandError;
    if (!brand) return Response.json({ ok: false, error: "Brand was not found." }, { status: 404 });

    const previousYear = rescueCase.case_type === "annual_calendar"
      ? Math.max(2020, Number(rescueCase.target_year || new Date().getUTCFullYear()) - 1)
      : Number(brand.campaign_calendar_year || new Date().getUTCFullYear());
    const { data: campaigns, error: campaignsError } = await context.admin
      .from("brand_campaign_opportunities")
      .select("title,event_type,event_date,start_date,end_date,campaign_category,campaign_goal,target_customer_need,website_content_strategy,website_product_selection_hint,recommended_post_count")
      .eq("brand_profile_id", brand.id)
      .eq("user_id", brand.user_id)
      .eq("event_year", previousYear)
      .eq("is_active", true)
      .eq("is_archived", false)
      .order("event_date", { ascending: true, nullsFirst: false })
      .limit(40);
    if (campaignsError) throw campaignsError;

    const brief = buildAdminRescueBrief({
      rescueCase,
      brand,
      previousCampaigns: campaigns || [],
    });

    if (rescueCase.status === "needed") {
      await context.admin.from("admin_rescue_cases").update({
        status: "exported",
        updated_at: new Date().toISOString(),
      }).eq("id", rescueCase.id).eq("status", "needed");
    }

    const safeBrand = String(brand.business_name || "brand")
      .toLowerCase()
      .replace(/[^a-z0-9åäöæø]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "brand";
    const suffix = rescueCase.case_type === "annual_calendar"
      ? `calendar-${rescueCase.target_year}`
      : "analysis";

    return Response.json({
      ok: true,
      filename: `spreelo-${safeBrand}-${suffix}-rescue.json`,
      brief,
    });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || "Could not build rescue brief." }, { status: 500 });
  }
}
