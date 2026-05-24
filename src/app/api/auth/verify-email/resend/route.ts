import { NextRequest, NextResponse } from "next/server";
import {
  createEmailVerificationToken,
  getUserByEmail,
  logAudit,
} from "@/lib/db";
import { sendEmailVerification } from "@/lib/email";
import { getClientIp } from "@/lib/turnstile";
import { getRateLimitKey, rateLimitAsync } from "@/lib/rate-limit";
import { isEmail } from "@/lib/validate";

export async function POST(request: NextRequest) {
  const limit = await rateLimitAsync(getRateLimitKey(request.headers, "verify-resend"), { max: 5, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: `Quá nhiều yêu cầu. Vui lòng đợi ${limit.retryAfterSec}s rồi thử lại.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const body = await request.json().catch(() => ({}));
  const email = body?.email;
  if (!isEmail(email)) {
    return NextResponse.json({ success: false, error: "Email không hợp lệ" }, { status: 400 });
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return NextResponse.json({ success: false, error: "Chức năng gửi email chưa được cấu hình. Vui lòng liên hệ admin." }, { status: 500 });
  }

  const generic = { success: true, message: "Nếu email tồn tại và chưa xác thực, chúng tôi đã gửi lại link xác thực." };
  const user = await getUserByEmail(email);
  if (!user || user.email_verified) {
    // Tránh lộ trạng thái email tồn tại / đã xác thực.
    return NextResponse.json(generic);
  }

  const { token } = await createEmailVerificationToken(user.id);
  const send = await sendEmailVerification(email, user.username, token);

  await logAudit("user.email.resend", {
    userId: user.id,
    ip: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
    detail: send.success ? null : send.error ?? null,
  });

  if (!send.success) {
    return NextResponse.json({ success: false, error: send.error }, { status: 500 });
  }
  return NextResponse.json(generic);
}
