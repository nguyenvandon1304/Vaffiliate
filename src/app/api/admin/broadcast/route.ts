import { NextRequest, NextResponse } from "next/server";
import { broadcastNotification, logAudit } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getClientIp } from "@/lib/turnstile";

/**
 * POST /api/admin/broadcast
 *   body { title, message, targetRole?: "all" | "user" | "admin" }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => ({}));
  const title = String(body?.title || "").trim();
  const message = String(body?.message || "").trim();
  const targetRole = (body?.targetRole === "user" || body?.targetRole === "admin" || body?.targetRole === "all") ? body.targetRole : "all";

  if (!title || title.length > 200) {
    return NextResponse.json({ success: false, error: "Tiêu đề bắt buộc, tối đa 200 ký tự" }, { status: 400 });
  }
  if (!message || message.length > 2000) {
    return NextResponse.json({ success: false, error: "Nội dung bắt buộc, tối đa 2000 ký tự" }, { status: 400 });
  }

  const result = await broadcastNotification(title, message, { targetRole });
  await logAudit("admin.broadcast", {
    userId: auth.user.id,
    ip: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
    detail: `target=${targetRole}, count=${result.count}, title=${title.slice(0, 80)}`,
  });
  return NextResponse.json({ success: true, count: result.count });
}
