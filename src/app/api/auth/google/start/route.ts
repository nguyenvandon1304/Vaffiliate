import { NextRequest, NextResponse } from "next/server";
import { isGoogleConfigured, buildAuthorizeUrl, signState } from "@/lib/oauth-google";

/**
 * GET /api/auth/google/start?next=/dashboard&ref=username
 *
 * Bắt đầu Google OAuth flow. Redirect tới Google authorize URL.
 *
 * Query params:
 * - next?: path để redirect sau login (default /dashboard)
 * - ref?:  username người giới thiệu, lưu vào state để xử lý ở callback
 */
export async function GET(request: NextRequest) {
  if (!isGoogleConfigured()) {
    return NextResponse.json(
      { success: false, error: "Google đăng nhập chưa được kích hoạt. Vui lòng dùng email/mật khẩu." },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/dashboard";
  const ref = url.searchParams.get("ref") || "";

  // Whitelist: chỉ cho redirect về path nội bộ, không phải URL ngoài.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${url.protocol}//${url.host}`;
  const state = signState({ next: safeNext, ref });

  const authorizeUrl = buildAuthorizeUrl({ baseUrl, state });
  return NextResponse.redirect(authorizeUrl);
}
