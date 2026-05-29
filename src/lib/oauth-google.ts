/**
 * Google OAuth 2.0 — implement thuần (không thêm thư viện) để giảm bundle.
 *
 * Flow:
 * 1. /api/auth/google/start → redirect tới Google authorize URL kèm state CSRF
 * 2. User chấp nhận → Google redirect lại /api/auth/google/callback?code=...&state=...
 * 3. Backend exchange code → access_token + id_token
 * 4. Fetch userinfo → email, name, picture, sub
 * 5. findOrCreateUserByGoogle() → tạo user mới hoặc link với existing
 * 6. Set session_token cookie → redirect /dashboard
 *
 * Setup env:
 *   GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
 *   GOOGLE_CLIENT_SECRET=GOCSPX-xxx
 *
 * Authorized redirect URI (set ở Google Cloud Console):
 *   https://vaffiliate.vn/api/auth/google/callback
 *   http://localhost:3000/api/auth/google/callback  (dev)
 */

import crypto from "node:crypto";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

export function isGoogleConfigured(): boolean {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

export function getRedirectUri(baseUrl: string): string {
  return `${baseUrl}/api/auth/google/callback`;
}

/**
 * Tạo URL authorize. State được sign HMAC để verify khi callback (chống CSRF + open redirect).
 */
export function buildAuthorizeUrl(opts: {
  baseUrl: string;
  state: string; // raw state (sẽ được encode chứa nextPath)
}): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: getRedirectUri(opts.baseUrl),
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state: opts.state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/**
 * Sign state với HMAC để chống tamper. Format: `<payloadBase64>.<signature>`
 */
const STATE_SECRET = process.env.OAUTH_STATE_SECRET || process.env.APP_ENCRYPTION_KEY || "vaff-oauth-fallback-key-change-me";

export function signState(payload: Record<string, unknown>): string {
  const json = JSON.stringify({ ...payload, ts: Date.now() });
  const b64 = Buffer.from(json).toString("base64url");
  const sig = crypto.createHmac("sha256", STATE_SECRET).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

export function verifyState(state: string, maxAgeMs = 10 * 60 * 1000): Record<string, unknown> | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [b64, sig] = parts;
  const expected = crypto.createHmac("sha256", STATE_SECRET).update(b64).digest("base64url");
  // timing-safe compare
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf8")) as Record<string, unknown>;
    const ts = Number(payload.ts);
    if (!ts || Date.now() - ts > maxAgeMs) return null;
    return payload;
  } catch {
    return null;
  }
}

export interface GoogleProfile {
  sub: string;          // unique Google user ID
  email: string;
  email_verified: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

/**
 * Exchange authorization code → access_token, sau đó fetch userinfo.
 * Throws nếu Google trả lỗi.
 */
export async function exchangeCodeForProfile(code: string, baseUrl: string): Promise<GoogleProfile> {
  // Step 1: Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: getRedirectUri(baseUrl),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.text().catch(() => "");
    throw new Error(`Google token exchange failed: ${tokenRes.status} ${err.slice(0, 200)}`);
  }
  const tokenData = (await tokenRes.json()) as { access_token?: string; id_token?: string; error?: string };
  if (!tokenData.access_token) {
    throw new Error(`No access_token in response: ${tokenData.error ?? "unknown"}`);
  }

  // Step 2: Fetch userinfo
  const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
    cache: "no-store",
  });
  if (!infoRes.ok) {
    throw new Error(`Google userinfo failed: ${infoRes.status}`);
  }
  const profile = (await infoRes.json()) as GoogleProfile;
  if (!profile.email || !profile.sub) {
    throw new Error("Google profile missing email or sub");
  }
  return profile;
}

/**
 * Convert email Gmail → username hợp lệ cho V-Affiliate.
 * "[email protected]" → "john_doe"
 * Nếu username đã tồn tại, suffix _<random4digit>.
 */
export function emailToUsername(email: string): string {
  const local = email.split("@")[0].toLowerCase();
  // Replace dấu chấm + ký tự không hợp lệ thành _
  let base = local.replace(/[^a-z0-9]/g, "_").replace(/_{2,}/g, "_").replace(/^_+|_+$/g, "");
  if (base.length < 3) base = `user_${base}`;
  if (base.length > 16) base = base.slice(0, 16);
  return base;
}
