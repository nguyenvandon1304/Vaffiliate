import { NextRequest, NextResponse } from "next/server";
import { loginUser, logAudit } from "@/lib/db";
import { sendNewDeviceAlertEmail } from "@/lib/email";
import { notifyAdminLoginNewDevice } from "@/lib/telegram";
import { getRateLimitKey, rateLimit } from "@/lib/rate-limit";
import { CAPTCHA_THRESHOLD, computeFingerprint } from "@/lib/security";
import { getClientIp, verifyTurnstile } from "@/lib/turnstile";

export async function POST(request: NextRequest) {
  const limit = rateLimit(getRateLimitKey(request.headers, "login"), { max: 10, windowMs: 15 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: `Quá nhiều lần thử. Vui lòng đợi ${limit.retryAfterSec}s rồi thử lại.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const body = await request.json();
  const { username, password, captchaToken, totpCode } = body;

  if (!username || !password) {
    return NextResponse.json(
      { success: false, error: "Vui lòng điền đầy đủ thông tin" },
      { status: 400 }
    );
  }

  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent") ?? undefined;

  // Progressive CAPTCHA: chỉ bắt buộc khi đã có ≥ N fail từ IP này.
  // UX mượt hơn cho user thông thường, không bị spam captcha.
  // Implementation: chỉ skip verify khi rate-limit count < CAPTCHA_THRESHOLD.
  // Lookup count từ rate-limit map qua key tạm.
  const failKey = getRateLimitKey(request.headers, "login-fail");
  const probe = rateLimit(failKey, { max: 999_999, windowMs: 15 * 60 * 1000 });
  // probe.remaining = max - count → count = max - remaining - 1 (do probe vừa increment)
  const failCount = 999_999 - probe.remaining - 1;
  const requireCaptcha = failCount >= CAPTCHA_THRESHOLD;

  if (requireCaptcha) {
    const captcha = await verifyTurnstile(captchaToken, ip);
    if (!captcha.success) {
      return NextResponse.json(
        { success: false, error: captcha.error || "Xác minh captcha thất bại", needCaptcha: true },
        { status: 400 }
      );
    }
  }

  const fingerprint = computeFingerprint(userAgent ?? null, ip ?? null);
  const result = await loginUser(username, password, { ip, userAgent, totpCode, fingerprint });

  if (!result.success) {
    await logAudit("user.login.failed", {
      userId: result.user?.id ?? null,
      ip,
      userAgent,
      detail: typeof username === "string" ? `username=${username}${result.needTotp ? " (totp)" : ""}` : null,
    });
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        needEmailVerify: result.needEmailVerify,
        needTotp: result.needTotp,
        email: result.email,
        needCaptcha: requireCaptcha || failCount + 1 >= CAPTCHA_THRESHOLD,
      },
      { status: result.needEmailVerify ? 403 : (result.needTotp ? 401 : 401) }
    );
  }

  // Maintenance mode: cho phép admin login, chặn user thường.
  if (result.user && result.user.role !== "admin") {
    const { getSetting } = await import("@/lib/db");
    if ((await getSetting("maintenance_mode")) === "1") {
      const msg = (await getSetting("maintenance_message")) || "Hệ thống đang bảo trì.";
      return NextResponse.json({ success: false, error: msg }, { status: 503 });
    }
  }

  // Yêu cầu admin phải có 2FA nếu setting `require_admin_2fa=1`.
  if (result.user && result.user.role === "admin") {
    const { getSetting, getTotpStatus } = await import("@/lib/db");
    if ((await getSetting("require_admin_2fa")) === "1") {
      const status = await getTotpStatus(result.user.id);
      if (!status.enabled) {
        // Logout phiên vừa tạo để không có lỗ hổng leak admin.
        const { deleteSession } = await import("@/lib/db");
        if (result.token) await deleteSession(result.token);
        return NextResponse.json(
          { success: false, error: "Tài khoản admin phải bật xác thực 2 lớp (2FA) trước khi đăng nhập. Liên hệ admin khác để được kích hoạt." },
          { status: 403 },
        );
      }
    }
  }

  const response = NextResponse.json({
    success: true,
    message: "Đăng nhập thành công",
    user: result.user,
    isNewDevice: result.isNewDevice,
  });

  response.cookies.set("session_token", result.token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  await logAudit("user.login.success", {
    userId: result.user?.id ?? null,
    ip,
    userAgent,
    detail: result.isNewDevice ? "new_device=true" : null,
  });

  // Email alert thiết bị mới — fire-and-forget, không block response.
  if (result.isNewDevice && result.user?.email && process.env.SMTP_USER && process.env.SMTP_PASS) {
    void sendNewDeviceAlertEmail(result.user.email, result.user.username, {
      ip: ip ?? null,
      userAgent: userAgent ?? null,
      loginAt: new Date(),
    });
    await logAudit("user.login.new_device_alert", {
      userId: result.user.id,
      ip,
      userAgent,
    });
  }

  // Telegram alert cho admin login từ thiết bị lạ — security critical.
  // Chỉ alert khi role=admin để admin biết tài khoản admin có hoạt động bất thường.
  if (result.isNewDevice && result.user?.role === "admin") {
    void notifyAdminLoginNewDevice({
      username: result.user.username,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    });
  }

  return response;
}
