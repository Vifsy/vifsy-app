import OpenAI from "openai";
import { adminContextError, getAdminContext } from "../../../../lib/adminAuth.js";
import {
  cancelOpenAIBackgroundResponse,
  emergencyCancelTrackedOpenAIBackgroundJobs,
} from "../../../../lib/openaiBackgroundJobs.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const CAMPAIGN_ACTIVE_STATUSES = ["starting", "queued", "in_progress"];

// v144.23 incident safety net: these response IDs were observed in the production
// logs from the 2026-08-23 Inet loop. They are not secrets. The emergency button
// also cancels them explicitly in case a database row was already removed before
// lifecycle cleanup could find it. Cancelling an already-terminal response is a
// harmless no-op handled by cancelOpenAIBackgroundResponse().
const INCIDENT_RESPONSE_IDS = [
  "resp_049ae4794bcc5633006a8b5147e4f887d2ba038b619b720261",
  "resp_00f36d0dd71f759d006a8b527bd2ec87d285c7500a26062fb6",
  "resp_00580034d6e87e0f006a8b51ddfc7487d2aef4f8cab34aec5c",
  "resp_08cf8a6eab09d987006a8b53293be487d2b649ce8e82c7fabe",
];

function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  return new OpenAI({ apiKey });
}

export async function GET(request) {
  const context = await getAdminContext(request);
  if (context.error) return adminContextError(context);

  const [campaignResult, brandResult] = await Promise.all([
    context.admin
      .from("automation_campaign_research_jobs")
      .select("id, occurrence_id, automation_rule_id, openai_response_id, status, research_round, started_at, updated_at")
      .in("status", CAMPAIGN_ACTIVE_STATUSES)
      .order("updated_at", { ascending: true })
      .limit(100),
    context.admin
      .from("brand_analysis_jobs")
      .select("id, openai_response_id, status, step, created_at, updated_at")
      .in("status", ["pending", "running"])
      .not("openai_response_id", "is", null)
      .order("updated_at", { ascending: true })
      .limit(100),
  ]);

  if (campaignResult.error) {
    return Response.json({ ok: false, error: campaignResult.error.message }, { status: 500 });
  }

  return Response.json({
    ok: true,
    campaignJobs: campaignResult.data || [],
    brandAnalysisJobs: brandResult.error ? [] : brandResult.data || [],
    warnings: brandResult.error ? [brandResult.error.message] : [],
    counts: {
      campaign: (campaignResult.data || []).length,
      brandAnalysis: brandResult.error ? 0 : (brandResult.data || []).length,
      total: (campaignResult.data || []).length + (brandResult.error ? 0 : (brandResult.data || []).length),
    },
  });
}

export async function POST(request) {
  const context = await getAdminContext(request);
  if (context.error) return adminContextError(context);

  let body = {};
  try {
    body = await request.json();
  } catch {}

  if (body?.confirm !== true) {
    return Response.json(
      { ok: false, error: "Explicit confirmation is required." },
      { status: 400 }
    );
  }

  try {
    const openai = createOpenAIClient();
    const result = await emergencyCancelTrackedOpenAIBackgroundJobs({
      supabase: context.admin,
      openai,
      cooldownMs: 15 * 60 * 1000,
    });

    const explicitIds = [...new Set([
      ...INCIDENT_RESPONSE_IDS,
      ...(Array.isArray(body?.responseIds) ? body.responseIds : []),
    ].map((value) => String(value || "").trim()).filter((value) => value.startsWith("resp_")))];
    let explicitCancelled = 0;
    let explicitTerminal = 0;
    for (const responseId of explicitIds) {
      const cancelResult = await cancelOpenAIBackgroundResponse({
        openai,
        responseId,
        reason: "admin_emergency_stop:explicit_incident_cleanup",
      });
      if (cancelResult.cancelled) explicitCancelled += 1;
      if (cancelResult.terminal) explicitTerminal += 1;
    }
    result.explicitResponseIdsChecked = explicitIds.length;
    result.explicitResponsesCancelled = explicitCancelled;
    result.explicitResponsesTerminal = explicitTerminal;

    console.warn("Admin emergency OpenAI background stop executed", {
      adminUserId: context.user?.id || null,
      adminEmail: context.user?.email || null,
      ...result,
    });

    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("Admin emergency OpenAI background stop failed", {
      adminUserId: context.user?.id || null,
      message: error?.message || String(error),
    });
    return Response.json(
      { ok: false, error: error?.message || "Could not stop OpenAI background jobs." },
      { status: 500 }
    );
  }
}
