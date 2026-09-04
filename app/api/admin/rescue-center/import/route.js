import { adminContextError, getAdminContext } from "../../../../../lib/adminAuth";
import {
  parseAdminRescuePackage,
  validateAdminRescueManifest,
} from "../../../../../lib/adminRescuePackages.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  const context = await getAdminContext(request);
  if (context.error) return adminContextError(context);

  try {
    const form = await request.formData();
    const caseId = String(form.get("case_id") || "").trim();
    const file = form.get("file");
    if (!caseId) return Response.json({ ok: false, error: "case_id is required." }, { status: 400 });
    if (!file || typeof file.arrayBuffer !== "function") {
      return Response.json({ ok: false, error: "Choose a rescue ZIP or manifest.json file." }, { status: 400 });
    }

    const { data: rescueCase, error: caseError } = await context.admin
      .from("admin_rescue_cases")
      .select("id,case_type,user_id,brand_profile_id,source_job_id,target_year,status,error_code,error_message")
      .eq("id", caseId)
      .maybeSingle();
    if (caseError) throw caseError;
    if (!rescueCase) return Response.json({ ok: false, error: "Rescue case was not found." }, { status: 404 });
    if (["completed", "dismissed"].includes(rescueCase.status)) {
      return Response.json({ ok: false, error: "This rescue case is already closed." }, { status: 409 });
    }

    const { data: brand, error: brandError } = await context.admin
      .from("brand_profiles")
      .select("id,user_id,business_name,website_url,brand_description,industry,target_audience,content_market,country_code,content_language,campaign_calendar_year,calendar_generation_mode,website_product_mode_available,website_product_mode_reason,website_product_source_url")
      .eq("id", rescueCase.brand_profile_id)
      .eq("user_id", rescueCase.user_id)
      .maybeSingle();
    if (brandError) throw brandError;
    if (!brand) return Response.json({ ok: false, error: "Brand was not found." }, { status: 404 });

    const bytes = Buffer.from(await file.arrayBuffer());
    const rawManifest = parseAdminRescuePackage(bytes, file.name || "");
    const normalized = validateAdminRescueManifest({
      manifest: rawManifest,
      rescueCase,
      brand,
    });

    const now = new Date().toISOString();
    const { error: updateError } = await context.admin
      .from("admin_rescue_cases")
      .update({
        status: "imported",
        imported_manifest: normalized,
        imported_at: now,
        imported_by: context.user.id,
        updated_at: now,
      })
      .eq("id", rescueCase.id);
    if (updateError) throw updateError;

    if (rescueCase.case_type === "annual_calendar") {
      const { error: renewalError } = await context.admin
        .from("brand_calendar_renewals")
        .upsert({
          user_id: rescueCase.user_id,
          brand_profile_id: rescueCase.brand_profile_id,
          target_year: rescueCase.target_year,
          mode: "manual_rescue",
          status: "rescue_imported",
          updated_at: now,
        }, { onConflict: "brand_profile_id,target_year" });
      if (renewalError) throw renewalError;
    }

    return Response.json({
      ok: true,
      caseId: rescueCase.id,
      status: "imported",
      preview: {
        rescue_type: normalized.rescue_type,
        website_url: normalized.website_url,
        calendar_year: normalized.calendar_year,
        profile: normalized.profile,
        market_setup: normalized.market_setup,
        website_product_mode: normalized.website_product_mode,
        campaign_count: normalized.campaign_opportunities.length,
        campaigns: normalized.campaign_opportunities.map((item) => ({
          title: item.title,
          event_date: item.event_date,
          start_date: item.start_date,
          end_date: item.end_date,
          campaign_category: item.campaign_category,
          recommended_post_count: item.recommended_post_count,
        })),
        verified_sources: normalized.verified_sources,
      },
    });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || "Could not import rescue package." }, { status: 400 });
  }
}
