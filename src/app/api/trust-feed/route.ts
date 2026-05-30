import { NextResponse } from "next/server";
import { getPublicTrustStats, getPublicActivityFeed } from "@/lib/db";

/**
 * Public trust feed — không cần auth.
 * Trả về số liệu tin cậy ĐÃ XÁC THỰC + feed hoạt động thật (ẩn danh).
 * Tất cả là dữ liệu thật từ DB; nếu rỗng client sẽ không hiển thị (không bịa).
 *
 * Cache 60s để giảm tải DB từ nhiều client.
 */
export async function GET() {
  try {
    const [stats, feed] = await Promise.all([
      getPublicTrustStats(),
      getPublicActivityFeed(8),
    ]);
    return NextResponse.json(
      { success: true, stats, feed },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch (e) {
    console.error("[trust-feed]", e);
    return NextResponse.json({
      success: false,
      stats: { completedOrders: 0, totalCashbackPaid: 0, totalWithdrawn: 0, withdrawalsApproved: 0 },
      feed: [],
    });
  }
}
