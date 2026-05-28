import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getCohortRetentionWeekly } from "@/lib/db";

/**
 * GET /api/admin/cohort?weeks=8 — cohort retention analysis cho admin.
 * Cache 1 giờ vì data không thay đổi nhanh.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const url = new URL(request.url);
  const weeks = Math.min(Math.max(Number(url.searchParams.get("weeks") ?? 8), 4), 12);

  const cohorts = await getCohortRetentionWeekly(weeks);
  return NextResponse.json(
    { success: true, cohorts, weeks },
    {
      headers: { "Cache-Control": "private, max-age=3600" },
    },
  );
}
