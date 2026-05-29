import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForProfile, isGoogleConfigured, verifyState } from "@/lib/oauth-google";
import { findOrCreateUserByGoogle, createSessionForUser, logAudit } from "@/lib/db";
import { getClientIp } from "@/lib/turnstile";
import { notifyNewUser } from "@/lib/telegram";

/**
 * GET /api/auth/google/callback?code=xxx&state=yyy
 *
 * Google redirect lại đây sau khi user chấp nhận. Backend:
 * 1. Verify state (chống CSRF)
 * 2. Exchange code → access_token → userinfo
 * 3. findOrCreateUserByGoogle → user record
 * 4. Create session → set cookie
 * 5. Redirect về `next` path từ state
 *
 * QUAN TRỌNG: KHÔNG dùng request.url để build redirect URL vì Render proxy
 * trả về `http://localhost:10000` (internal) → browser ko resolve được.
 * Phải dùng `baseUrl` = NEXT_PUBLIC_BASE_URL hoặc forwarded host.
 */
function getPublicBaseUrl(request: NextRequest): string {
  // Ưu tiên NEXT_PUBLIC_BASE_URL — set sẵn trong Render env
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  // Fallback: dùng forwarded headers từ Cloudflare/Render proxy
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "vaffiliate.vn";
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const baseUrl = getPublicBaseUrl(request);

  if (!isGoogleConfigured()) {
    return NextResponse.redirect(`${baseUrl}/?error=google_not_configured`);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(`${baseUrl}/?error=google_${errorParam}`);
  }
  if (!code || !stateRaw) {
    return NextResponse.redirect(`${baseUrl}/?error=google_missing_params`);
  }

  const statePayload = verifyState(stateRaw);
  if (!statePayload) {
    return NextResponse.redirect(`${baseUrl}/?error=google_invalid_state`);
  }

  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent") || undefined;
  const next = typeof statePayload.next === "string" && statePayload.next.startsWith("/")
    ? (statePayload.next as string)
    : "/dashboard";

  try {
    const profile = await exchangeCodeForProfile(code, baseUrl);
    if (!profile.email_verified) {
      return NextResponse.redirect(`${baseUrl}/?error=google_email_unverified`);
    }

    const { user, isNew } = await findOrCreateUserByGoogle(profile, { ip, userAgent });
    if (!user.is_active) {
      return NextResponse.redirect(`${baseUrl}/?error=account_blocked`);
    }

    const token = await createSessionForUser(user.id, { ip, userAgent });

    await logAudit(isNew ? "user.google.register" : "user.google.login", {
      userId: user.id,
      ip,
      userAgent,
      detail: `email=${user.email}`,
    });

    // Telegram alert cho admin khi có user mới đăng ký qua Google.
    // Fire-and-forget — không block redirect. Skip nếu Telegram chưa setup.
    if (isNew) {
      void notifyNewUser({
        username: `${user.username} (Google)`,
        email: user.email,
      });
    }

    // Quyết định redirect: nếu admin → /admin, còn lại theo `next`
    const finalNext = user.role === "admin" ? "/admin" : next;
    const response = NextResponse.redirect(`${baseUrl}${finalNext}`);
    response.cookies.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
    if (isNew) {
      // Cookie tạm để frontend hiện toast "Chào mừng!" lần đầu
      response.cookies.set("welcome_new", "google", {
        maxAge: 60,
        path: "/",
        sameSite: "lax",
      });
    }
    return response;
  } catch (e) {
    console.error("[google/callback]", e);
    return NextResponse.redirect(`${baseUrl}/?error=google_exchange_failed`);
  }
}
