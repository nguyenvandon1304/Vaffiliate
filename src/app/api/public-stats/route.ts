import { NextResponse } from "next/server";
import { getPublicStats } from "@/lib/db";

/**
 * Public landing stats — không cần auth.
 * Dùng cho social proof bar trên trang login.
 *
 * Cache 60s để tránh hit DB liên tục từ visitors anonymous.
 */
export async function GET() {
  try {
    const stats = await getPublicStats();
    return NextResponse.json(
      { success: true, ...stats },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch (e) {
    console.error("[public-stats]", e);
    // Fallback values nếu DB error — không show 0 trên landing.
    return NextResponse.json({
      success: false,
      totalUsers: 0,
      totalCashback: 0,
      totalOrders: 0,
    });
  }
}
