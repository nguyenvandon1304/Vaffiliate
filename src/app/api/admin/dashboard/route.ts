import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminKPIDelta, getOnlineUsersCount, getRecentActivity } from "@/lib/db";

/**
 * GET /api/admin/dashboard — bundle 3 widget mới cho admin overview:
 *   - KPI delta (today vs yesterday)
 *   - Online users count
 *   - Recent activity feed
 *
 * Auth: admin only.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const [delta, online, activity] = await Promise.all([
    getAdminKPIDelta(),
    getOnlineUsersCount(),
    getRecentActivity(15),
  ]);

  return NextResponse.json({
    success: true,
    delta,
    online,
    activity,
  });
}
