import { NextResponse } from "next/server";
import { createSupabaseAdminClient, fetchPinterestBoards } from "../../../../lib/pinterestOAuth";

function bearer(request) {
  const value = request.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

async function authenticatedUser({ supabaseAdmin, request }) {
  const token = bearer(request);
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  return error ? null : user;
}

async function getConnection({ supabaseAdmin, connectionId, userId }) {
  const { data, error } = await supabaseAdmin
    .from("social_connections")
    .select("id, user_id, brand_profile_id, platform, page_id, page_name, page_access_token, status")
    .eq("id", connectionId)
    .eq("user_id", userId)
    .eq("platform", "pinterest")
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function getBrand({ supabaseAdmin, brandProfileId, userId }) {
  const { data, error } = await supabaseAdmin
    .from("brand_profiles")
    .select("id, business_name")
    .eq("id", brandProfileId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function GET(request) {
  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const user = await authenticatedUser({ supabaseAdmin, request });
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const connectionId = String(new URL(request.url).searchParams.get("connection_id") || "").trim();
    if (!connectionId) return NextResponse.json({ error: "Missing connection_id" }, { status: 400 });

    const connection = await getConnection({ supabaseAdmin, connectionId, userId: user.id });
    if (!connection?.page_access_token) return NextResponse.json({ error: "Pinterest connection not found" }, { status: 404 });

    const [boards, brand] = await Promise.all([
      fetchPinterestBoards(connection.page_access_token),
      getBrand({ supabaseAdmin, brandProfileId: connection.brand_profile_id, userId: user.id }),
    ]);

    return NextResponse.json({
      boards: boards.map((board) => ({
        id: String(board.id),
        name: board.name || "Pinterest board",
        description: board.description || "",
        privacy: board.privacy || "PUBLIC",
      })),
      brand,
    });
  } catch (error) {
    console.error("Pinterest board list failed", error);
    return NextResponse.json({ error: error.message || "Could not load Pinterest boards" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const user = await authenticatedUser({ supabaseAdmin, request });
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const connectionId = String(body?.connection_id || "").trim();
    const boardId = String(body?.board_id || "").trim();
    if (!connectionId || !boardId) return NextResponse.json({ error: "Missing Pinterest board selection" }, { status: 400 });

    const connection = await getConnection({ supabaseAdmin, connectionId, userId: user.id });
    if (!connection?.page_access_token) return NextResponse.json({ error: "Pinterest connection not found" }, { status: 404 });

    const boards = await fetchPinterestBoards(connection.page_access_token);
    const selected = boards.find((board) => String(board.id) === boardId);
    if (!selected) return NextResponse.json({ error: "Selected Pinterest board is not available" }, { status: 404 });

    const nowIso = new Date().toISOString();
    const { data: existingBoardConnection, error: existingBoardError } = await supabaseAdmin
      .from("social_connections")
      .select("id")
      .eq("user_id", user.id)
      .eq("platform", "pinterest")
      .eq("page_id", String(selected.id))
      .maybeSingle();
    if (existingBoardError) throw existingBoardError;

    if (existingBoardConnection?.id && existingBoardConnection.id !== connectionId) {
      const { error: moveError } = await supabaseAdmin
        .from("social_connections")
        .update({
          brand_profile_id: connection.brand_profile_id,
          page_name: selected.name || "Pinterest board",
          page_access_token: connection.page_access_token,
          status: "connected",
          updated_at: nowIso,
        })
        .eq("id", existingBoardConnection.id)
        .eq("user_id", user.id);
      if (moveError) throw moveError;

      const { error: deletePendingError } = await supabaseAdmin
        .from("social_connections")
        .delete()
        .eq("id", connectionId)
        .eq("user_id", user.id)
        .eq("platform", "pinterest");
      if (deletePendingError) throw deletePendingError;
    } else {
      const { error } = await supabaseAdmin
        .from("social_connections")
        .update({
          page_id: String(selected.id),
          page_name: selected.name || "Pinterest board",
          status: "connected",
          updated_at: nowIso,
        })
        .eq("id", connectionId)
        .eq("user_id", user.id)
        .eq("platform", "pinterest");
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, board: { id: String(selected.id), name: selected.name || "Pinterest board" } });
  } catch (error) {
    console.error("Pinterest board selection failed", error);
    return NextResponse.json({ error: error.message || "Could not connect Pinterest board" }, { status: 500 });
  }
}
