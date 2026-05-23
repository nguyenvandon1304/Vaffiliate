import { NextRequest, NextResponse } from "next/server";
import {
  deleteOtherSessions,
  deleteSessionById,
  listUserSessions,
  logAudit,
} from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getClientIp } from "@/lib/turnstile";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const sessions = await listUserSessions(auth.user.id, auth.token);
  return NextResponse.json({ success: true, sessions });
}

/** Body có `id` → revoke 1 session; không có id → revoke tất cả thiết bị khác. */
export async function DELETE(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => ({}));
  const sessionId: number | undefined = typeof body?.id === "number" ? body.id : undefined;

  if (sessionId !== undefined) {
    const result = await deleteSessionById(auth.user.id, sessionId);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }
    await logAudit("user.session.revoke", {
      userId: auth.user.id,
      ip: getClientIp(request.headers),
      userAgent: request.headers.get("user-agent"),
      detail: `session_id=${sessionId}`,
    });
    return NextResponse.json({ success: true, message: "Đã đăng xuất phiên đó" });
  }

  await deleteOtherSessions(auth.user.id, auth.token);
  await logAudit("user.session.revoke_all", {
    userId: auth.user.id,
    ip: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
  });
  return NextResponse.json({ success: true, message: "Đã đăng xuất tất cả thiết bị khác" });
}
