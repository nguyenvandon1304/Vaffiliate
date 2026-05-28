import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/db";

/**
 * GET /api/leaderboard — top users theo cashback.
 * Cache 5 phút server-side để giảm DB load (data không cần realtime).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") === "month" ? "month" : "all";

  const leaderboard = await getLeaderboard(period);
  return NextResponse.json(
    { success: true, leaderboard },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
