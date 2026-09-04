import { adminContextError, getAdminContext } from "../../../../../lib/adminAuth";

export const dynamic = "force-dynamic";

async function countRows(admin, status) {
  let query = admin
    .from("admin_generation_work_items")
    .select("id", { count: "exact", head: true })
    .eq("status", status);
  // A rescue that has been successfully consumed is no longer an unresolved
  // failure, even if an older durable row still carries status=failed.
  if (status === "failed") query = query.neq("rescue_status", "used");
  const { count, error } = await query;
  if (error) throw error;
  return Number(count || 0);
}

export async function GET(request) {
  const context = await getAdminContext(request);
  if (context.error) return adminContextError(context);

  try {
    const [planned, running, approval, failed] = await Promise.all([
      countRows(context.admin, "planned"),
      countRows(context.admin, "running"),
      countRows(context.admin, "approval"),
      countRows(context.admin, "failed"),
    ]);

    return Response.json({
      ok: true,
      counts: {
        upcoming: planned + running,
        queue: approval,
        failed,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // v144.110 keeps the workbench usable on an older database even if the
    // durable work-item migration has not been applied yet.
    if (/admin_generation_work_items|schema cache|does not exist/i.test(String(error?.message || ""))) {
      return Response.json({ ok: true, counts: { upcoming: 0, queue: 0, failed: 0 }, partial: true });
    }
    return Response.json({ ok: false, error: error?.message || "Could not load admin queue counts." }, { status: 500 });
  }
}
