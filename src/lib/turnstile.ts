/**
 * Server-side helper xác minh Cloudflare Turnstile token.
 *
 * Khi `TURNSTILE_SECRET_KEY` chưa được cấu hình, hàm trả về thành công
 * kèm `skipped: true` để dev/local vẫn chạy được mà không bị chặn.
 *
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

const VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileResult {
  success: boolean;
  skipped?: boolean;
  error?: string;
  errorCodes?: string[];
}

interface SiteverifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
  "error-codes"?: string[];
}

export async function verifyTurnstile(
  token: string | undefined | null,
  ip?: string,
): Promise<TurnstileResult> {
  // Cờ test/dev: tắt verify để chạy smoke / e2e mà không cần token thật.
  if (process.env.DISABLE_TURNSTILE === "1") {
    return { success: true, skipped: true };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    // Chưa cấu hình Turnstile — bỏ qua để không chặn dev/local.
    return { success: true, skipped: true };
  }

  if (!token) {
    return { success: false, error: "Thiếu captcha. Vui lòng thử lại." };
  }

  try {
    const body = new URLSearchParams();
    body.append("secret", secret);
    body.append("response", token);
    if (ip) body.append("remoteip", ip);

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      // Siteverify chấp nhận application/x-www-form-urlencoded (mặc định).
      cache: "no-store",
    });

    const data = (await res.json()) as SiteverifyResponse;
    if (data.success) return { success: true };

    return {
      success: false,
      error: "Captcha không hợp lệ. Vui lòng thử lại.",
      errorCodes: data["error-codes"],
    };
  } catch (err) {
    console.error("[Turnstile] verify error:", err);
    return {
      success: false,
      error: "Không xác minh được captcha. Vui lòng thử lại.",
    };
  }
}

/**
 * Lấy IP client từ các header phổ biến (CDN / reverse proxy).
 */
export function getClientIp(headers: Headers): string | undefined {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || undefined;
  const real = headers.get("x-real-ip");
  if (real) return real;
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf;
  return undefined;
}
