import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getFinanceReconciliation } from "@/lib/db";

/**
 * GET /api/admin/finance — đối soát tài chính toàn hệ thống.
 *
 * Trả về tổng tiền vào/ra ví phân loại theo nguồn, đối soát chéo với bảng
 * withdrawals, và các cờ cảnh báo lệch. Dùng để admin kiểm tra dòng tiền khớp.
 *
 * Cache 60s — số liệu đối soát không cần realtime.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  try {
    const data = await getFinanceReconciliation();
    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "private, max-age=60" } },
    );
  } catch (e) {
    console.error("[admin/finance]", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Lỗi đối soát" },
      { status: 500 },
    );
  }
}
