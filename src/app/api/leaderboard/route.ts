import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") === "month" ? "month" : "all";

  const leaderboard = await getLeaderboard(period);
  return NextResponse.json({ success: true, leaderboard });
}
