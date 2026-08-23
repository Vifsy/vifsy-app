import { createClient } from "@supabase/supabase-js";
import { attachGenerationSessionCostsToPost } from "../../../../lib/generationCostTracking.js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return Response.json({ error: "Missing authorization header." }, { status: 401 });
    }

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error: userError,
    } = await userSupabase.auth.getUser();
    if (userError || !user) {
      return Response.json({ error: "You must be logged in." }, { status: 401 });
    }

    const { postId, generationCostSessionId } = await request.json();
    if (!postId || !generationCostSessionId) {
      return Response.json({ error: "Missing post or generation session." }, { status: 400 });
    }

    // Cost data is service-role-only. Before using that role, prove that the
    // authenticated user owns the post that will receive the cost events.
    if (!serviceRoleKey) {
      return Response.json({ ok: true, tracked: false });
    }
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: ownedPost, error: postError } = await adminSupabase
      .from("posts")
      .select("id")
      .eq("id", postId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (postError) {
      return Response.json({ error: "Could not verify saved post." }, { status: 500 });
    }
    if (!ownedPost) {
      return Response.json({ error: "Post not found." }, { status: 404 });
    }

    await attachGenerationSessionCostsToPost(
      adminSupabase,
      generationCostSessionId,
      postId,
      user.id
    );

    return Response.json({ ok: true, tracked: true });
  } catch (error) {
    // This endpoint is called only after the post itself has already been
    // saved. A metering error must never turn a successful draft save into a
    // generation/save failure.
    console.warn("Manual generation cost binding failed", {
      message: error?.message || String(error),
    });
    return Response.json({ ok: true, tracked: false });
  }
}
