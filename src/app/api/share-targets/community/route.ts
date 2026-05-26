import { NextResponse } from "next/server";
import { getSetting } from "@/lib/db";

/**
 * /api/share-targets/community — trả về preset bài viết cộng đồng V-Affiliate.
 *
 * Khác với /api/share-targets (per-user CRUD), endpoint này trả 1 preset duy
 * nhất do admin cấu hình qua Settings: link bài viết ghim trong group V-Affiliate.
 * Mọi user đăng nhập sẽ thấy nút "📌 Đăng vào group V-Affiliate" → tăng traffic
 * group + warm-up domain vaffiliate.vn nhanh.
 *
 * Public endpoint — không cần auth.
 */
export async function GET() {
  const enabled = await getSetting("community_share_post_enabled");
  if (enabled !== "1") {
    return NextResponse.json({ success: true, target: null });
  }

  const url = await getSetting("community_share_post_url");
  const label = await getSetting("community_share_post_label");
  if (!url) {
    return NextResponse.json({ success: true, target: null });
  }

  return NextResponse.json({
    success: true,
    target: {
      url,
      label: label || "Group V-Affiliate (bài ghim)",
      platform: "facebook_post",
    },
  });
}
