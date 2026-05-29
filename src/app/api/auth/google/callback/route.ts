import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForProfile, isGoogleConfigured, verifyState } from "@/lib/oauth-google";
import { findOrCreateUserByGoogle, createSessionForUser, logAudit } from "@/lib/db";
import { getClientIp } from "@/lib/turnstile";

/**
 * GET /api/auth/google/callback?code=xxx&state=yyy
 *
 * Google redirect lại đây sau khi user chấp nhận. Backend:
 * 1. Verify state (chống CSRF)
 * 2. Exchange code → access_token → userinfo
 * 3. findOrCreateUserByGoogle → user record
 * 4. Create session → set cookie
 * 5. Redirect về `next` path từ state
 */
export async function GET(request: NextRequest) {
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(new URL("/?error=google_not_configured", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(new URL(`/?error=google_${errorParam}`, request.url));
  }
  if (!code || !stateRaw) {
    return NextResponse.redirect(new URL("/?error=google_missing_params", request.url));
  }

  const statePayload = verifyState(stateRaw);
  if (!statePayload) {
    return NextResponse.redirect(new URL("/?error=google_invalid_state", request.url));
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${url.protocol}//${url.host}`;
  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent") || undefined;
  const next = typeof statePayload.next === "string" && statePayload.next.startsWith("/")
    ? (statePayload.next as string)
    : "/dashboard";

  try {
    const profile = await exchangeCodeForProfile(code, baseUrl);
    if (!profile.email_verified) {
      return NextResponse.redirect(new URL("/?error=google_email_unverified", request.url));
    }

    const { user, isNew } = await findOrCreateUserByGoogle(profile, { ip, userAgent });
    if (!user.is_active) {
      return NextResponse.redirect(new URL("/?error=account_blocked", request.url));
    }

    const token = await createSessionForUser(user.id, { ip, userAgent });

    await logAudit(isNew ? "user.google.register" : "user.google.login", {
      userId: user.id,
      ip,
      userAgent,
      detail: `email=${user.email}`,
    });

    // Quyết định redirect: nếu admin → /admin, còn lại theo `next`
    const finalNext = user.role === "admin" ? "/admin" : next;
    const response = NextResponse.redirect(new URL(finalNext, request.url));
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
    return NextResponse.redirect(new URL("/?error=google_exchange_failed", request.url));
  }
}
