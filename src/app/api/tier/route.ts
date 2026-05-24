import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getUserTier, getTiers } from "@/lib/tier";

/**
 * GET /api/tier — trả về tier info của user + danh sách tất cả tier
 * (để UI hiển thị bảng so sánh).
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const [info, allTiers] = await Promise.all([
    getUserTier(auth.user.id),
    getTiers(),
  ]);

  return NextResponse.json({
    success: true,
    info,
    tiers: allTiers,
  });
}
