import { NextRequest, NextResponse } from "next/server";
import { verifyResetToken, resetPassword, createNotification } from "@/lib/db";
import { getRateLimitKey, rateLimitAsync } from "@/lib/rate-limit";
import { checkPwnedPassword, passwordStrength } from "@/lib/security";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) return NextResponse.json({ valid: false });

  const result = await verifyResetToken(token);
  return NextResponse.json({ valid: result.valid });
}

export async function POST(request: NextRequest) {
  const limit = await rateLimitAsync(getRateLimitKey(request.headers, "reset"), { max: 10, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: `Quá nhiều lần thử. Vui lòng đợi ${limit.retryAfterSec}s rồi thử lại.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const body = await request.json();
  const { token, password } = body;

  if (!token || !password) {
    return NextResponse.json({ success: false, error: "Thiếu thông tin" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ success: false, error: "Mật khẩu phải có ít nhất 6 ký tự" }, { status: 400 });
  }

  const strength = passwordStrength(password);
  if (strength.score < 2) {
    return NextResponse.json({ success: false, error: `Mật khẩu quá yếu. ${strength.hints.join(", ")}.` }, { status: 400 });
  }
  const pwnedCount = await checkPwnedPassword(password);
  if (pwnedCount > 0) {
    return NextResponse.json(
      { success: false, error: `Mật khẩu đã rò rỉ trong ${pwnedCount.toLocaleString("vi-VN")} vụ. Chọn mật khẩu khác.` },
      { status: 400 }
    );
  }

  const check = await verifyResetToken(token);
  if (!check.valid) {
    return NextResponse.json({ success: false, error: "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn" }, { status: 400 });
  }

  const result = await resetPassword(token, password);

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  if (check.userId) {
    await createNotification(check.userId, "🔐 Mật khẩu đã đổi thành công", "Mật khẩu mới của bạn đã được lưu. Nếu không phải bạn thực hiện thao tác này, hãy liên hệ ngay với V-Affiliate để bảo vệ tài khoản!", "info");
  }

  return NextResponse.json({ success: true, message: "Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập lại." });
}
