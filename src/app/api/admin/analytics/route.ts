import { NextRequest, NextResponse } from "next/server";
import { getFunnelData, getHourlyHeatmap, getTopProducts, getCohortRetention } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * GET /api/admin/analytics
 * Trả về tất cả dữ liệu analytics chi tiết: funnel + heatmap + top products + cohort.
 *
 * Query params:
 * - heatmapDays?: number (default 30)
 * - topLimit?: number (default 10)
 * - cohortMonths?: number (default 6)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const { searchParams } = new URL(request.url);
  const heatmapDays = Math.min(Math.max(Number(searchParams.get("heatmapDays") ?? 30) || 30, 1), 365);
  const topLimit = Math.min(Math.max(Number(searchParams.get("topLimit") ?? 10) || 10, 1), 50);
  const cohortMonths = Math.min(Math.max(Number(searchParams.get("cohortMonths") ?? 6) || 6, 1), 24);

  const [funnel, heatmap, topProducts, cohort] = await Promise.all([
    getFunnelData(),
    getHourlyHeatmap(heatmapDays),
    getTopProducts(topLimit),
    getCohortRetention(cohortMonths),
  ]);

  return NextResponse.json({
    success: true,
    funnel,
    heatmap,
    topProducts,
    cohort,
  });
}
