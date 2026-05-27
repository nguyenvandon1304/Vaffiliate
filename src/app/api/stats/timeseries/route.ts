import { NextRequest, NextResponse } from "next/server";
import { getUserTimeseries } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/**
 * GET /api/stats/timeseries — trả về dữ liệu 14 ngày cho user.
 * Dùng cho stat cards sparkline + compare badge.
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const data = await getUserTimeseries(auth.user.id);
  return NextResponse.json({ success: true, data });
}
