import { NextRequest, NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { getClientIp, verifyTurnstile } from "@/lib/turnstile";
import { getRateLimitKey, rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const limit = rateLimit(getRateLimitKey(request.headers, "forgot"), { max: 5, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: `Quá nhiều yêu cầu. Vui lòng đợi ${limit.retryAfterSec}s rồi thử lại.` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
      );
    }

    const body = await request.json();
    const { email, captchaToken } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ success: false, error: "Vui lòng nhập email" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: "Email không hợp lệ" }, { status: 400 });
    }

    const captcha = await verifyTurnstile(captchaToken, getClientIp(request.headers));
    if (!captcha.success) {
      return NextResponse.json(
        { success: false, error: captcha.error || "Xác minh captcha thất bại" },
        { status: 400 }
      );
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error("[ForgotPassword] SMTP_USER hoặc SMTP_PASS chưa được cấu hình trong .env.local");
      return NextResponse.json({ success: false, error: "Chức năng gửi email chưa được cấu hình. Vui lòng liên hệ admin." }, { status: 500 });
    }

    const result = await createPasswordResetToken(email);

    if (!result.success) {
      return NextResponse.json({ success: true, message: "Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu." });
    }

    const emailResult = await sendPasswordResetEmail(email, result.username!, result.token!);

    if (!emailResult.success) {
      return NextResponse.json({ success: false, error: emailResult.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Chúng tôi đã gửi link đặt lại mật khẩu vào email của bạn." });
  } catch (err) {
    console.error("[ForgotPassword] Error:", err);
    return NextResponse.json({ success: false, error: "Lỗi hệ thống. Vui lòng thử lại sau." }, { status: 500 });
  }
}
