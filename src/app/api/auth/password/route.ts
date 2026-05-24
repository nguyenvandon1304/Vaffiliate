import { NextRequest, NextResponse } from "next/server";
import { changeUserPassword, createNotification, logAudit } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getClientIp } from "@/lib/turnstile";
import { getRateLimitKey, rateLimitAsync } from "@/lib/rate-limit";
import { checkPwnedPassword, passwordStrength } from "@/lib/security";

export async function PUT(request: NextRequest) {
  const limit = await rateLimitAsync(getRateLimitKey(request.headers, "change-password"), { max: 10, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: `Quá nhiều lần thử. Vui lòng đợi ${limit.retryAfterSec}s rồi thử lại.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => ({}));
  const { current_password, new_password } = body;

  if (typeof current_password !== "string" || typeof new_password !== "string") {
    return NextResponse.json({ success: false, error: "Thiếu thông tin" }, { status: 400 });
  }

  // Strength + pwned check trước khi đổi
  const strength = passwordStrength(new_password);
  if (strength.score < 2) {
    return NextResponse.json(
      { success: false, error: `Mật khẩu mới quá yếu. ${strength.hints.join(", ")}.` },
      { status: 400 }
    );
  }
  const pwnedCount = await checkPwnedPassword(new_password);
  if (pwnedCount > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Mật khẩu mới đã xuất hiện trong ${pwnedCount.toLocaleString("vi-VN")} vụ rò rỉ dữ liệu. Chọn mật khẩu khác.`,
      },
      { status: 400 }
    );
  }

  const result = await changeUserPassword(auth.user.id, current_password, new_password, { keepToken: auth.token });
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  await createNotification(
    auth.user.id,
    "Mật khẩu đã thay đổi",
    "Mật khẩu tài khoản của bạn vừa được cập nhật. Mọi thiết bị khác đã được đăng xuất.",
    "info",
  );
  await logAudit("user.password.change", {
    userId: auth.user.id,
    ip: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ success: true, message: "Đổi mật khẩu thành công. Mọi thiết bị khác đã được đăng xuất." });
}
