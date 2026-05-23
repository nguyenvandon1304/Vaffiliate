import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getUserBadges, syncBadgesForUser } from "@/lib/achievements";

/**
 * GET /api/achievements — list badges + trạng thái earned của user hiện tại.
 *
 * Query string `?sync=1` → trigger syncBadgesForUser() để catch up badge cũ
 * (auto chạy ở lần đầu load referral page).
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const url = new URL(request.url);
  if (url.searchParams.get("sync") === "1") {
    // Fire-and-forget không block response — sync chạy nền, lần load sau mới có
    // dữ liệu mới. Nếu cần đồng bộ, bỏ "void" để await.
    await syncBadgesForUser(auth.user.id);
  }

  const badges = await getUserBadges(auth.user.id);
  return NextResponse.json({ success: true, badges });
}
