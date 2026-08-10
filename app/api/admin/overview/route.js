import { adminContextError, getAdminContext } from "../../../../lib/adminAuth";

export const dynamic = "force-dynamic";

async function countRows(admin, table, applyFilters) {
  // Some admin tables use user_id or another primary key instead of id.
  // Selecting * with head:true counts rows without assuming a specific column.
  let query = admin.from(table).select("*", { count: "exact", head: true });
  if (typeof applyFilters === "function") {
    query = applyFilters(query);
  }
  const { count, error } = await query;
  if (error) throw error;
  return Number(count || 0);
}

async function safeAdminQuery(label, fallback, queryFunction) {
  try {
    return { value: await queryFunction(), warning: null };
  } catch (error) {
    console.error(`Admin overview query failed (${label}):`, error);
    return {
      value: fallback,
      warning: {
        key: label,
        message: error?.message || `Could not load ${label}.`,
      },
    };
  }
}


function topEntries(map, limit = 5) {
  return [...map.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => Number(b.value || 0) - Number(a.value || 0))
    .slice(0, limit);
}

async function loadBusinessInsights(context) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [postsResult, occurrencesResult, creditResult, brandsResult] = await Promise.all([
    context.admin.from("posts").select("id, user_id, brand_profile_id, status, platform, content_format, post_type, created_at").gte("created_at", since).limit(10000),
    context.admin.from("automation_occurrences").select("id, user_id, brand_profile_id, status, content_type_id, refunded_credits, started_at").gte("started_at", since).limit(10000),
    context.admin.from("credit_reservation_events").select("user_id, content_type_id, amount, event_type, created_at").gte("created_at", since).limit(10000),
    context.admin.from("brand_profiles").select("id, user_id, business_name").limit(10000),
  ]);
  if (postsResult.error) throw postsResult.error;
  if (occurrencesResult.error) throw occurrencesResult.error;
  if (creditResult.error) throw creditResult.error;
  if (brandsResult.error) throw brandsResult.error;

  const brandMap = new Map((brandsResult.data || []).map((row) => [row.id, { name: row.business_name || "Unnamed brand", userId: row.user_id }]));
  const customerUsage = new Map();
  const brandUsage = new Map();
  const formatUsage = new Map();
  const platformUsage = new Map();

  const bump = (map, key, extra = {}) => {
    const id = String(key || "unknown");
    const current = map.get(id) || { value: 0, ...extra };
    current.value += 1;
    map.set(id, current);
  };

  for (const row of postsResult.data || []) {
    bump(customerUsage, row.user_id, { name: row.user_id || "Unknown customer", userId: row.user_id });
    const brand = brandMap.get(row.brand_profile_id) || {};
    bump(brandUsage, row.brand_profile_id, { name: brand.name || "Unknown brand", userId: brand.userId || row.user_id, brandId: row.brand_profile_id });
    bump(formatUsage, row.content_format || row.post_type || "unknown", { name: row.content_format || row.post_type || "Unknown" });
    bump(platformUsage, row.platform || "unknown", { name: row.platform || "Unknown" });
  }

  const creditsByUser = new Map();
  for (const row of creditResult.data || []) {
    const amount = Number(row.amount || 0);
    if (amount >= 0) continue;
    const current = creditsByUser.get(row.user_id) || { value: 0, name: row.user_id || "Unknown customer", userId: row.user_id };
    current.value += Math.abs(amount);
    creditsByUser.set(row.user_id, current);
  }

  let topCustomersByCredits = topEntries(creditsByUser);
  let topCustomersByPosts = topEntries(customerUsage);
  const topUserIds = [...new Set([...topCustomersByCredits, ...topCustomersByPosts].map((row) => row.userId).filter(Boolean))];
  const userDetails = new Map();
  await Promise.all(topUserIds.map(async (userId) => {
    try {
      const { data, error } = await context.admin.auth.admin.getUserById(userId);
      if (error) return;
      const user = data?.user;
      const metadata = user?.user_metadata || {};
      userDetails.set(userId, {
        name: String(metadata.full_name || metadata.name || metadata.display_name || metadata.company_name || user?.email || userId).trim(),
        email: user?.email || "",
      });
    } catch {}
  }));
  const enrichCustomer = (row) => ({ ...row, ...(userDetails.get(row.userId) || {}) });
  topCustomersByCredits = topCustomersByCredits.map(enrichCustomer);
  topCustomersByPosts = topCustomersByPosts.map(enrichCustomer);

  const occurrences = occurrencesResult.data || [];
  const completed = occurrences.filter((row) => row.status === "completed").length;
  const failed = occurrences.filter((row) => row.status === "failed_terminal").length;
  const attempts = completed + failed;
  const published = (postsResult.data || []).filter((row) => row.status === "published").length;
  const refunded = occurrences.reduce((sum, row) => sum + Math.max(0, Number(row.refunded_credits || 0)), 0);

  return {
    periodDays: 30,
    topCustomersByCredits,
    topCustomersByPosts,
    topBrands: topEntries(brandUsage),
    topFormats: topEntries(formatUsage),
    platforms: topEntries(platformUsage, 8),
    totals: {
      postsCreated: (postsResult.data || []).length,
      postsPublished: published,
      completed,
      failed,
      successRate: attempts ? completed / attempts : 1,
      creditsRefunded: refunded,
    },
  };
}

export async function GET(request) {
  const context = await getAdminContext(request);
  if (context.error) return adminContextError(context);

  const results = await Promise.all([
    safeAdminQuery("accounts", 0, () =>
      countRows(context.admin, "user_credit_balances")
    ),
    safeAdminQuery("brands", 0, () =>
      countRows(context.admin, "brand_profiles")
    ),
    safeAdminQuery("posts", 0, () => countRows(context.admin, "posts")),
    safeAdminQuery("activeAutomations", 0, () =>
      countRows(context.admin, "automation_rules", (query) =>
        query.eq("is_active", true)
      )
    ),
    safeAdminQuery("backgrounds", 0, () =>
      countRows(context.admin, "video_background_assets", (query) =>
        query.eq("active", true)
      )
    ),
    safeAdminQuery("imageBackgrounds", 0, () =>
      countRows(context.admin, "image_background_assets", (query) =>
        query.eq("active", true)
      )
    ),
    safeAdminQuery("failedMedia", 0, () =>
      // Only surface posts whose overall generation actually failed.
      // A post may still be usable as text even when an optional image failed.
      countRows(context.admin, "posts", (query) => query.eq("status", "failed"))
    ),
    safeAdminQuery("pendingApproval", 0, () =>
      countRows(context.admin, "posts", (query) =>
        query.eq("status", "pending_approval")
      )
    ),
    safeAdminQuery("completedOccurrences", 0, () =>
      countRows(context.admin, "automation_occurrences", (query) => {
        const now = new Date();
        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
        return query.eq("status", "completed").gte("started_at", monthStart);
      })
    ),
    safeAdminQuery("failedOccurrences", 0, () =>
      countRows(context.admin, "automation_occurrences", (query) => {
        const now = new Date();
        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
        return query.eq("status", "failed_terminal").gte("started_at", monthStart);
      })
    ),
    safeAdminQuery("monthlyOccurrenceTotals", { refundedCredits: 0, unexpectedAutomaticReruns: 0 }, async () => {
      const now = new Date();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
      const { data, error } = await context.admin
        .from("automation_occurrences")
        .select("refunded_credits, automatic_run_count")
        .gte("started_at", monthStart);
      if (error) throw error;
      return (data || []).reduce((totals, row) => ({
        refundedCredits: totals.refundedCredits + Math.max(0, Number(row.refunded_credits || 0)),
        unexpectedAutomaticReruns: totals.unexpectedAutomaticReruns + Math.max(0, Number(row.automatic_run_count || 1) - 1),
      }), { refundedCredits: 0, unexpectedAutomaticReruns: 0 });
    }),
    safeAdminQuery("businessInsights", { periodDays: 30, topCustomersByCredits: [], topCustomersByPosts: [], topBrands: [], topFormats: [], platforms: [], totals: {} }, () => loadBusinessInsights(context)),
    safeAdminQuery("recentAdjustments", [], async () => {
      const { data, error } = await context.admin
        .from("admin_credit_adjustments")
        .select(
          "id, admin_email, target_email, amount, previous_balance, new_balance, reason, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) throw error;
      return data || [];
    }),
  ]);

  const [
    users,
    brands,
    posts,
    activeAutomations,
    backgrounds,
    imageBackgrounds,
    failedMedia,
    pendingApproval,
    completedOccurrences,
    failedOccurrences,
    monthlyOccurrenceTotals,
    businessInsights,
    recentAdjustments,
  ] = results;
  const warnings = results.map((result) => result.warning).filter(Boolean);

  return Response.json({
    ok: true,
    partial: warnings.length > 0,
    warnings,
    stats: {
      users: users.value,
      brands: brands.value,
      posts: posts.value,
      activeAutomations: activeAutomations.value,
      backgrounds: backgrounds.value,
      imageBackgrounds: imageBackgrounds.value,
      failedMedia: failedMedia.value,
      pendingApproval: pendingApproval.value,
      completedOccurrences: completedOccurrences.value,
      failedOccurrences: failedOccurrences.value,
      refundedCredits: monthlyOccurrenceTotals.value.refundedCredits,
      unexpectedAutomaticReruns: monthlyOccurrenceTotals.value.unexpectedAutomaticReruns,
    },
    recentAdjustments: recentAdjustments.value,
    insights: businessInsights.value,
  });
}
