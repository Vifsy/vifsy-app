import { createClient } from "@supabase/supabase-js";

export function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

export async function getAdminContext(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = getBearerToken(request);

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return { error: "Supabase environment variables are missing.", status: 500 };
  }

  if (!token) {
    return { error: "You must be logged in.", status: 401 };
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(token);

  if (userError || !user) {
    return { error: "Your login session is not valid.", status: 401 };
  }

  const primaryAdminEmail = String(
    process.env.SPREELO_PRIMARY_ADMIN_EMAIL ||
      "johan@foldern.com"
  )
    .trim()
    .toLowerCase();
  const email = String(user.email || "").trim().toLowerCase();
  const isAdmin = Boolean(primaryAdminEmail && email === primaryAdminEmail);

  if (!isAdmin) {
    return {
      error: "This page is only available to Spreelo administrators.",
      status: 403,
      user,
    };
  }

  return {
    user,
    admin: createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  };
}

export function adminContextError(context) {
  return Response.json(
    {
      ok: false,
      isAdmin: false,
      canManage: false,
      error: context.error,
      configurationMissing: Boolean(context.configurationMissing),
    },
    { status: context.status || 500 }
  );
}
