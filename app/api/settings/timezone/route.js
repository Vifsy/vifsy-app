import { getAuthenticatedBillingUser } from "../../../../lib/stripeBilling";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isValidTimeZone(value) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function getTimeZoneOffsetMs(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23", timeZone,
  }).formatToParts(date);
  const values = {};
  for (const part of parts) if (part.type !== "literal") values[part.type] = part.value;
  return Date.UTC(
    Number(values.year), Number(values.month) - 1, Number(values.day),
    Number(values.hour), Number(values.minute), Number(values.second)
  ) - date.getTime();
}

function localDateTimeToUtc(dateValue, timeValue, timeZone) {
  const dateMatch = String(dateValue || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = String(timeValue || "").match(/^(\d{2}):(\d{2})/);
  if (!dateMatch || !timeMatch) return null;
  const utcGuess = Date.UTC(
    Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]),
    Number(timeMatch[1]), Number(timeMatch[2]), 0
  );
  let offset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  let utcTime = utcGuess - offset;
  const correctedOffset = getTimeZoneOffsetMs(new Date(utcTime), timeZone);
  if (correctedOffset !== offset) utcTime = utcGuess - correctedOffset;
  const result = new Date(utcTime);
  return Number.isNaN(result.getTime()) ? null : result;
}

function getLocalDate(value, timeZone) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone,
  }).formatToParts(date);
  const values = {};
  for (const part of parts) if (part.type !== "literal") values[part.type] = part.value;
  return `${values.year}-${values.month}-${values.day}`;
}

export async function POST(request) {
  const context = await getAuthenticatedBillingUser(request);
  if (context.error) return Response.json({ ok: false, error: context.error }, { status: context.status });

  const body = await request.json().catch(() => ({}));
  const timeZone = String(body?.timeZone || "").trim();
  if (!timeZone || !isValidTimeZone(timeZone)) {
    return Response.json({ ok: false, error: "Choose a valid IANA time zone." }, { status: 400 });
  }

  const { data: rules, error: rulesError } = await context.admin
    .from("automation_rules")
    .select("id, next_run_at, publish_time, timezone")
    .eq("user_id", context.user.id);
  if (rulesError) return Response.json({ ok: false, error: rulesError.message }, { status: 500 });

  let updatedRules = 0;
  for (const rule of rules || []) {
    const oldTimeZone = isValidTimeZone(rule.timezone) ? rule.timezone : "UTC";
    const localDate = rule.next_run_at ? getLocalDate(rule.next_run_at, oldTimeZone) : "";
    const shiftedRun = localDate && rule.publish_time
      ? localDateTimeToUtc(localDate, rule.publish_time, timeZone)
      : null;
    const changes = {
      timezone: timeZone,
      updated_at: new Date().toISOString(),
      ...(shiftedRun ? {
        next_run_at: shiftedRun.toISOString(),
        weekday: new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone }).format(shiftedRun),
      } : {}),
    };
    const { error } = await context.admin
      .from("automation_rules")
      .update(changes)
      .eq("id", rule.id)
      .eq("user_id", context.user.id);
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    updatedRules += 1;
  }

  const { error: metadataError } = await context.admin.auth.admin.updateUserById(context.user.id, {
    user_metadata: {
      ...(context.user.user_metadata || {}),
      publishing_timezone: timeZone,
    },
  });
  if (metadataError) return Response.json({ ok: false, error: metadataError.message }, { status: 500 });

  return Response.json({ ok: true, timeZone, updatedRules });
}
