import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sendEmailVerification } from "@/lib/email";

/**
 * POST /api/admin/test-email  body: { email }
 * Endpoint debug — gửi email test thật, đo thời gian + log error chi tiết.
 * Chỉ admin gọi được.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ success: false, error: "Email invalid" }, { status: 400 });
  }

  // Check env trước
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (!resendKey) {
    return NextResponse.json({
      success: false,
      error: "RESEND_API_KEY chưa cấu hình ở Render Environment",
      debug: {
        RESEND_API_KEY: "✗ MISSING",
        RESEND_FROM_EMAIL: fromEmail ?? "(default: V-Affiliate <noreply@vaffiliate.vn>)",
        NEXT_PUBLIC_BASE_URL: baseUrl ?? "(not set)",
      },
    }, { status: 500 });
  }

  const startMs = Date.now();
  try {
    const result = await sendEmailVerification(email, "test_user", "DEBUG_TOKEN_" + Date.now());
    const elapsedMs = Date.now() - startMs;
    return NextResponse.json({
      success: result.success,
      error: result.error,
      elapsedMs,
      debug: {
        RESEND_API_KEY: `✓ set (${resendKey.length} chars)`,
        RESEND_FROM_EMAIL: fromEmail ?? "(default)",
        BASE_URL: baseUrl,
        TARGET: email,
      },
    });
  } catch (err) {
    const elapsedMs = Date.now() - startMs;
    return NextResponse.json({
      success: false,
      error: String(err),
      elapsedMs,
    }, { status: 500 });
  }
}
