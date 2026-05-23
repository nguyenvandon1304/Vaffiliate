import { NextRequest, NextResponse } from "next/server";
import {
  getAllUsersPaged,
  logAudit,
  setUserRole,
  toggleUserActive,
  type UserListFilter,
} from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getClientIp } from "@/lib/turnstile";

/**
 * GET /api/admin/users
 *   Query params: search, role, status, page, pageSize
 *   Trả về { rows, total, page, pageSize }.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const url = new URL(request.url);
  const filter: UserListFilter = {
    search: url.searchParams.get("search") ?? undefined,
    role: (url.searchParams.get("role") as UserListFilter["role"]) ?? undefined,
    status: (url.searchParams.get("status") as UserListFilter["status"]) ?? undefined,
    page: Number(url.searchParams.get("page")) || 1,
    pageSize: Number(url.searchParams.get("pageSize")) || 20,
  };

  const result = await getAllUsersPaged(filter);
  return NextResponse.json({
    success: true,
    users: result.rows,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  });
}

/**
 * PATCH /api/admin/users
 *   - body { userId } → toggle is_active (giữ tương thích với UI cũ)
 *   - body { userId, role: "admin" | "user" } → đổi role
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => ({}));
  const userId = body?.userId;
  if (!userId) return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });

  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent");

  // Action: đổi role
  if (body?.role === "admin" || body?.role === "user") {
    const result = await setUserRole(userId, body.role, auth.user.id);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    await logAudit(`admin.user.role.${body.role}`, {
      userId: auth.user.id,
      target: `user_id=${userId}`,
      ip,
      userAgent,
    });
    return NextResponse.json(result);
  }

  // Mặc định: toggle is_active
  const result = await toggleUserActive(userId, auth.user.id);
  if (result.success) {
    await logAudit("admin.user.toggle_active", {
      userId: auth.user.id,
      target: `user_id=${userId}`,
      ip,
      userAgent,
    });
  } else {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
