import { createClient } from "@supabase/supabase-js";
import { sendLifecycleEmail } from "../../../../lib/lifecycleEmails.js";

export const dynamic = "force-dynamic";

function getBearerToken(request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
}

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const token = getBearerToken(request);

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !token) {
      return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(token);

    if (userError || !user?.id || !user?.email) {
      return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const delivery = await sendLifecycleEmail({
      supabaseAdmin: admin,
      userId: user.id,
      emailType: "welcome",
      entityKey: "account",
      locale: body?.locale || user?.user_metadata?.app_locale || "en",
      destinationPath: "/",
    });

    return Response.json({ ok: true, ...delivery });
  } catch (error) {
    console.error("Could not send welcome email", {
      message: error?.message,
    });
    return Response.json(
      { ok: false, error: "The welcome email could not be sent right now." },
      { status: 500 }
    );
  }
}

