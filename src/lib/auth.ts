import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, type User } from "@/lib/db";
import { getClientIp } from "@/lib/turnstile";

/**
 * Lấy user hiện tại từ session cookie. Trả về { user, response } —
 * `response` khác null nếu không hợp lệ, route nên `return response` ngay.
 *
 * Cũng forward IP/UA cho sliding session.
 */
export async function requireUser(
  request: NextRequest,
): Promise<{ user: User; token: string } | { user: null; response: NextResponse }> {
  const token = request.cookies.get("session_token")?.value;
  if (!token) {
    return { user: null, response: NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 }) };
  }
  const user = await getUserByToken(token, {
    ip: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });
  if (!user) {
    return { user: null, response: NextResponse.json({ success: false, error: "Phiên hết hạn" }, { status: 401 }) };
  }
  return { user, token };
}

/** Như `requireUser` nhưng còn enforce role admin. */
export async function requireAdmin(
  request: NextRequest,
): Promise<{ user: User; token: string } | { user: null; response: NextResponse }> {
  const result = await requireUser(request);
  if (result.user === null) return { user: null, response: result.response };
  if (result.user.role !== "admin") {
    return {
      user: null,
      response: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }),
    };
  }
  return result;
}
