import { NextRequest, NextResponse } from "next/server";
import { getDashboardStats, getUserOrders, getUserWallet } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  // Chạy song song 3 query để giảm tổng latency.
  const [stats, orders, wallet] = await Promise.all([
    getDashboardStats(auth.user.id),
    getUserOrders(auth.user.id),
    getUserWallet(auth.user.id),
  ]);

  return NextResponse.json({
    success: true,
    user: auth.user,
    stats,
    orders,
    wallet,
  });
}
