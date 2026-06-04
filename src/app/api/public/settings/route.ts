import { NextResponse } from "next/server";
import { getSetting } from "@/lib/db";

/**
 * Public settings — không cần auth.
 * Chỉ trả về những setting được phép public (hiện tại: facebook_post_url).
 * Dùng cho client fetch trên cashback page.
 *
 * Cache 5 phút.
 */
export async function GET() {
  try {
    const facebookPostUrl = await getSetting("facebook_post_url");
    return NextResponse.json(
      { success: true, facebookPostUrl },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch (e) {
    console.error("[public-settings]", e);
    return NextResponse.json({ success: false, facebookPostUrl: "" });
  }
}
