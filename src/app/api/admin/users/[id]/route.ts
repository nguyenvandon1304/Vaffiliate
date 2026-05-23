import { NextRequest, NextResponse } from "next/server";
import {
  adminForceLogout,
  adminMarkEmailVerified,
  adminResetUserPassword,
  getUserDetail,
  logAudit,
} from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getClientIp } from "@/lib/turnstile";

interface Ctx {
  params: Promise<{ id: string }>;
}

/** GET /api/admin/users/:id — chi tiết 1 user (orders + wallet + bank + session). */
export async function GET(request: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;
  const { id } = await ctx.params;
  const userId = Number(id);
  if (!userId) return NextResponse.json({ success: false, error: "id không hợp lệ" }, { status: 400 });

  const detail = await getUserDetail(userId);
  if (!detail) return NextResponse.json({ success: false, error: "Không tìm thấy người dùng" }, { status: 404 });

  return NextResponse.json({ success: true, detail });
}

/**
 * POST /api/admin/users/:id
 *   body { action: "reset_password" | "force_logout" | "mark_verified" }
 */
export async function POST(request: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const { id } = await ctx.params;
  const userId = Number(id);
  if (!userId) return NextResponse.json({ success: false, error: "id không hợp lệ" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || "");
  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent");

  if (action === "reset_password") {
    const result = await adminResetUserPassword(userId, auth.user.id);
    if (!result.success) return NextResponse.json(result, { status: 400 });
    await logAudit("admin.user.reset_password", { userId: auth.user.id, target: `user_id=${userId}`, ip, userAgent });
    return NextResponse.json(result);
  }

  if (action === "force_logout") {
    const result = await adminForceLogout(userId, auth.user.id);
    if (!result.success) return NextResponse.json(result, { status: 400 });
    await logAudit("admin.user.force_logout", { userId: auth.user.id, target: `user_id=${userId}`, ip, userAgent, detail: `revoked=${result.revoked}` });
    return NextResponse.json(result);
  }

  if (action === "mark_verified") {
    const result = await adminMarkEmailVerified(userId);
    if (!result.success) return NextResponse.json(result, { status: 400 });
    await logAudit("admin.user.mark_verified", { userId: auth.user.id, target: `user_id=${userId}`, ip, userAgent });
    return NextResponse.json(result);
  }

  return NextResponse.json({ success: false, error: "action không hợp lệ" }, { status: 400 });
}
