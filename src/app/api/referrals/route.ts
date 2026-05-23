import { NextRequest, NextResponse } from "next/server";
import { getCashbackRateForUser, getReferralStats } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/** GET /api/referrals — thống kê giới thiệu + tier rate hiện tại của user. */
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const [stats, rate] = await Promise.all([
    getReferralStats(auth.user.id),
    getCashbackRateForUser(auth.user.id),
  ]);

  return NextResponse.json({ success: true, stats, rate });
}
