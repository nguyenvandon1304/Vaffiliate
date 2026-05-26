/**
 * Kiểm tra cấu hình env bắt buộc khi chạy production. Gọi 1 lần lúc boot
 * (qua `getDb` hoặc bất kỳ entry server nào). In cảnh báo to trên console
 * nếu thiếu — không crash để dev cục bộ vẫn chạy được.
 */

let alreadyWarned = false;

export function warnMissingEnv(): void {
  if (alreadyWarned) return;
  alreadyWarned = true;
  if (process.env.NODE_ENV !== "production") return;

  const issues: string[] = [];
  const critical: string[] = [];

  // Captcha — nếu site key có nhưng secret không có, request thật sẽ fail.
  const hasSiteKey = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const hasSecret = !!process.env.TURNSTILE_SECRET_KEY;
  if (hasSiteKey && !hasSecret) {
    issues.push("TURNSTILE_SECRET_KEY chưa cấu hình (đã có SITE_KEY phía client) → siteverify sẽ luôn fail.");
  }
  if (!hasSiteKey && !hasSecret) {
    issues.push("NEXT_PUBLIC_TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY chưa cấu hình → captcha không bảo vệ được brute-force.");
  }

  // Email (Resend)
  if (!process.env.RESEND_API_KEY) {
    issues.push("RESEND_API_KEY chưa cấu hình → reset password & verify email sẽ không gửi được. Đăng ký free tại https://resend.com.");
  }

  // Base URL — link trong email sẽ trỏ về localhost
  if (!process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL.includes("localhost")) {
    issues.push("NEXT_PUBLIC_BASE_URL chưa được set sang domain production → email sẽ chứa link localhost không click được.");
  }

  // Encryption key — bắt buộc cho TOTP / sensitive data
  if (!process.env.APP_ENCRYPTION_KEY) {
    critical.push("APP_ENCRYPTION_KEY chưa cấu hình → TOTP secret được encrypt bằng key fallback yếu. Sinh key mới: openssl rand -hex 32");
  } else {
    const k = process.env.APP_ENCRYPTION_KEY;
    const okHex = /^[0-9a-fA-F]{64}$/.test(k);
    let okBase64 = false;
    try { okBase64 = Buffer.from(k, "base64").length === 32; } catch { /* nope */ }
    if (!okHex && !okBase64) {
      critical.push("APP_ENCRYPTION_KEY phải là 32 byte ở dạng hex (64 ký tự) hoặc base64 (44 ký tự).");
    }
  }

  // Admin seed password
  if (!process.env.ADMIN_SEED_PASSWORD) {
    issues.push("ADMIN_SEED_PASSWORD chưa cấu hình → admin seed dùng 'admin123' (đổi ngay sau khi boot lần đầu).");
  }

  // DATABASE_URL — bắt buộc cho Supabase Postgres
  if (!process.env.DATABASE_URL) {
    critical.push("DATABASE_URL chưa cấu hình → app không kết nối được DB. Lấy URL Pooler tại Supabase → Project Settings → Database → Connection pooling.");
  }

  // Allowed origins (cho CSRF check trong middleware)
  if (!process.env.ALLOWED_ORIGINS && process.env.NEXT_PUBLIC_BASE_URL) {
    issues.push("ALLOWED_ORIGINS chưa cấu hình → middleware sẽ chỉ accept request cùng host với NEXT_PUBLIC_BASE_URL.");
  }

  // Disable flags không nên bật ở production
  if (process.env.DISABLE_RATE_LIMIT === "1") {
    critical.push("DISABLE_RATE_LIMIT=1 đang bật ở production → brute-force không bị chặn!");
  }
  if (process.env.DISABLE_TURNSTILE === "1") {
    critical.push("DISABLE_TURNSTILE=1 đang bật ở production → mọi captcha đều pass!");
  }

  if (issues.length === 0 && critical.length === 0) return;

  console.warn("┌─────────────────────────────────────────────────────────");
  console.warn("│ [V-Affiliate] ⚠️  Cảnh báo cấu hình production:");
  for (const issue of critical) {
    console.warn(`│   🔴 CRITICAL: ${issue}`);
  }
  for (const issue of issues) {
    console.warn(`│   • ${issue}`);
  }
  console.warn("└─────────────────────────────────────────────────────────");
}
