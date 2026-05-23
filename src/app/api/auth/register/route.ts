import { NextRequest, NextResponse } from "next/server";
import {
  registerUser,
  createNotification,
  createEmailVerificationToken,
  attachReferral,
  getSetting,
  logAudit,
} from "@/lib/db";
import { sendEmailVerification } from "@/lib/email";
import { getClientIp, verifyTurnstile } from "@/lib/turnstile";
import { getRateLimitKey, rateLimit } from "@/lib/rate-limit";
import { checkPwnedPassword, passwordStrength } from "@/lib/security";
import { isEmail, isUsername } from "@/lib/validate";

export async function POST(request: NextRequest) {
  // Cho phép admin tắt đăng ký mới qua /admin/settings.
  if ((await getSetting("registration_enabled")) === "0") {
    return NextResponse.json(
      { success: false, error: "Đăng ký mới đang tạm khoá. Vui lòng quay lại sau." },
      { status: 503 },
    );
  }

  const limit = rateLimit(getRateLimitKey(request.headers, "register"), { max: 5, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: `Quá nhiều lần đăng ký. Vui lòng đợi ${limit.retryAfterSec}s rồi thử lại.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const body = await request.json();
  const { username, email, password, captchaToken, ref } = body;

  if (!username || !email || !password) {
    return NextResponse.json(
      { success: false, error: "Vui lòng điền đầy đủ thông tin" },
      { status: 400 }
    );
  }

  if (!isUsername(username)) {
    return NextResponse.json(
      { success: false, error: "Tên đăng nhập chỉ chứa chữ, số, gạch dưới (3–20 ký tự)" },
      { status: 400 }
    );
  }

  if (typeof password !== "string" || password.length < 6) {
    return NextResponse.json(
      { success: false, error: "Mật khẩu phải có ít nhất 6 ký tự" },
      { status: 400 }
    );
  }

  // Password strength + pwned check — chặn user đặt mật khẩu yếu/đã leak.
  const strength = passwordStrength(password);
  if (strength.score < 2) {
    return NextResponse.json(
      { success: false, error: `Mật khẩu quá yếu. ${strength.hints.join(", ")}.` },
      { status: 400 }
    );
  }
  // Check HaveIBeenPwned (k-anonymity, password không leak ra ngoài).
  // Nếu service down → fail open để không chặn user. Cùng lắm bỏ qua.
  const pwnedCount = await checkPwnedPassword(password);
  if (pwnedCount > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Mật khẩu này đã xuất hiện trong ${pwnedCount.toLocaleString("vi-VN")} vụ rò rỉ dữ liệu. Vui lòng chọn mật khẩu khác để bảo vệ tài khoản.`,
      },
      { status: 400 }
    );
  }

  if (!isEmail(email)) {
    return NextResponse.json(
      { success: false, error: "Email không hợp lệ" },
      { status: 400 }
    );
  }

  const ip = getClientIp(request.headers);
  const captcha = await verifyTurnstile(captchaToken, ip);
  if (!captcha.success) {
    return NextResponse.json(
      { success: false, error: captcha.error || "Xác minh captcha thất bại" },
      { status: 400 }
    );
  }

  const result = await registerUser(username, email, password);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 409 }
    );
  }

  if (result.user) {
    await createNotification(result.user.id, "Chào mừng bạn!", "Chào mừng bạn đến với V-Affiliate! Hãy xác thực email để bắt đầu.", "welcome");

    // Gắn quan hệ giới thiệu nếu user đăng ký với ref hợp lệ.
    // Chỉ silent-fail (log lỗi) — không phải dữ liệu critical.
    if (typeof ref === "string" && ref.trim()) {
      const refResult = await attachReferral(result.user.id, ref.trim());
      if (!refResult.success) {
        console.warn("[Register] attachReferral failed:", refResult.error, "ref=", ref);
      }
    }

    // Gửi email xác thực — nếu SMTP chưa cấu hình thì bỏ qua, trả flag để user resend.
    let emailSent = false;
    let emailError: string | undefined;
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const { token } = await createEmailVerificationToken(result.user.id);
      const send = await sendEmailVerification(email, result.user.username, token);
      emailSent = send.success;
      emailError = send.error;
    } else {
      emailError = "SMTP chưa cấu hình. Liên hệ admin để xác thực email.";
    }

    await logAudit("user.register", {
      userId: result.user.id,
      ip,
      userAgent: request.headers.get("user-agent"),
      detail: emailSent ? "verification email sent" : emailError ?? null,
    });

    return NextResponse.json({
      success: true,
      message: emailSent
        ? "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản."
        : "Đăng ký thành công, nhưng chưa gửi được email xác thực.",
      needEmailVerify: true,
      emailSent,
      email,
      user: { ...result.user, has_withdraw_pin: false },
    });
  }

  return NextResponse.json({ success: true, message: "Đăng ký thành công" });
}
