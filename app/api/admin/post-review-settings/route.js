import { adminContextError, getAdminContext } from "../../../../lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const context = await getAdminContext(request);
  if (context.error) return adminContextError(context);

  const { data, error } = await context.admin
    .from("spreelo_admin_settings")
    .select("require_admin_post_approval, updated_at")
    .eq("id", "global")
    .maybeSingle();

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({
    ok: true,
    requireAdminPostApproval: Boolean(data?.require_admin_post_approval),
    updatedAt: data?.updated_at || null,
  });
}

export async function PATCH(request) {
  const context = await getAdminContext(request);
  if (context.error) return adminContextError(context);
  const body = await request.json().catch(() => ({}));

  const { data, error } = await context.admin
    .from("spreelo_admin_settings")
    .upsert({
      id: "global",
      require_admin_post_approval: Boolean(body?.requireAdminPostApproval),
      updated_by: context.user.id,
      updated_at: new Date().toISOString(),
    })
    .select("require_admin_post_approval, updated_at")
    .single();

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({
    ok: true,
    requireAdminPostApproval: Boolean(data.require_admin_post_approval),
    updatedAt: data.updated_at,
  });
}
