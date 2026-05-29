import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSpinAdminStats } from "@/lib/db";

/**
 * GET /api/admin/spin — thống kê vòng quay may mắn cho admin.
 *
 * Trả về: tổng lượt quay, tổng tiền đã chi, breakdown theo segment,
 * recent wins, top winners. Dùng để track chi phí promotion + phát hiện bất thường.
 *
 * Cache 60s vì dữ liệu thống kê không cần realtime.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  try {
    const stats = await getSpinAdminStats();
    return NextResponse.json(
      { success: true, stats },
      { headers: { "Cache-Control": "private, max-age=60" } },
    );
  } catch (e) {
    console.error("[admin/spin]", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Lỗi tải thống kê" },
      { status: 500 },
    );
  }
}
