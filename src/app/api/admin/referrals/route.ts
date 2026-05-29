import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getReferralAdminOverview, getReferralChildren } from "@/lib/db";

/**
 * GET /api/admin/referrals          → overview + top referrers
 * GET /api/admin/referrals?userId=X → danh sách người được mời trực tiếp bởi user X
 *
 * Dùng cho tab "Mạng lưới giới thiệu" — admin xem ai mời ai, drill xuống cây.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const url = new URL(request.url);
  const userIdParam = url.searchParams.get("userId");

  try {
    if (userIdParam) {
      const userId = Number(userIdParam);
      if (!Number.isFinite(userId) || userId <= 0) {
        return NextResponse.json({ success: false, error: "userId không hợp lệ" }, { status: 400 });
      }
      const children = await getReferralChildren(userId);
      return NextResponse.json({ success: true, children });
    }

    const overview = await getReferralAdminOverview();
    return NextResponse.json(
      { success: true, overview },
      { headers: { "Cache-Control": "private, max-age=60" } },
    );
  } catch (e) {
    console.error("[admin/referrals]", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Lỗi tải dữ liệu" },
      { status: 500 },
    );
  }
}
