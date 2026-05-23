import { NextRequest, NextResponse } from "next/server";
import { cleanupExpired, logAudit } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getClientIp } from "@/lib/turnstile";

/**
 * POST /api/admin/cleanup
 *   body { vacuum?: boolean, notifKeepDays?: number }
 *   Dọn session/token hết hạn + tuỳ chọn VACUUM. Khuyến nghị:
 *     - cron hằng đêm: { vacuum: false }
 *     - cron hằng tuần: { vacuum: true } (lock DB lâu hơn)
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => ({}));
  const result = await cleanupExpired({
    notifKeepDays: typeof body?.notifKeepDays === "number" ? body.notifKeepDays : undefined,
    vacuum: !!body?.vacuum,
  });

  await logAudit("admin.cleanup", {
    userId: auth.user.id,
    ip: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
    detail: JSON.stringify(result),
  });

  return NextResponse.json({ success: true, result });
}
