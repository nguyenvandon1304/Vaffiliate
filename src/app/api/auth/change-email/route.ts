import { NextRequest, NextResponse } from "next/server";
import {
  changeUnverifiedEmail,
  createEmailVerificationToken,
  logAudit,
} from "@/lib/db";
import { sendEmailVerification } from "@/lib/email";
import { getClientIp } from "@/lib/turnstile";
import { getRateLimitKey, rateLimitAsync } from "@/lib/rate-limit";
import { isEmail } from "@/lib/validate";

/**
 * POST /api/auth/change-email
 * body: { username, password, newEmail }
 *
 * Đổi email cho user chưa verify. Yêu cầu password để xác thực.
 * Sau khi đổi xong → tự động gửi email verify đến địa chỉ mới.
 */
export async function POST(request: NextRequest) {
  const limit = await rateLimitAsync(getRateLimitKey(request.headers, "change-email"), { max: 5, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: `Quá nhiều yêu cầu. Vui lòng đợi ${limit.retryAfterSec}s rồi thử lại.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const body = await request.json().catch(() => ({}));
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  const newEmail = String(body.newEmail ?? "").trim();

  if (!username || !password || !newEmail) {
    return NextResponse.json({ success: false, error: "Vui lòng điền đầy đủ thông tin" }, { status: 400 });
  }
  if (!isEmail(newEmail)) {
    return NextResponse.json({ success: false, error: "Email mới không hợp lệ" }, { status: 400 });
  }

  const result = await changeUnverifiedEmail(username, password, newEmail);
  if (!result.success || !result.userId) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent");

  await logAudit("user.email.changed_unverified", {
    userId: result.userId,
    ip,
    userAgent,
    detail: `new email: ${newEmail}`,
  });

  // Gửi email verify đến địa chỉ mới — fire-and-forget để response nhanh
  if (process.env.RESEND_API_KEY) {
    void (async () => {
      try {
        const { token } = await createEmailVerificationToken(result.userId!);
        await sendEmailVerification(newEmail, username, token);
      } catch (e) {
        console.error("[change-email] send verification failed:", e);
      }
    })();
  }

  return NextResponse.json({
    success: true,
    message: "Đã đổi email thành công. Email xác minh đang được gửi đến địa chỉ mới (có thể mất vài phút).",
    email: newEmail,
  });
}
