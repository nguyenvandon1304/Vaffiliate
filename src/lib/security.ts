/**
 * Helpers bảo mật runtime: pwned password check, password strength,
 * session fingerprint, CAPTCHA threshold.
 */

import crypto from "node:crypto";

/* ─────────────── Pwned password check (HIBP k-anonymity) ─────────────── */

/**
 * Check password đã bị leak hay chưa qua HaveIBeenPwned API.
 *
 * Sử dụng k-anonymity: chỉ gửi 5 ký tự đầu của SHA-1, server trả về list các
 * suffix khớp + count. Password thật KHÔNG BAO GIỜ rời browser của ta.
 *
 * Trả về số lần password bị leak. 0 = chưa leak. 1+ = đã có trong leak DB.
 *
 * Spec: https://haveibeenpwned.com/API/v3#PwnedPasswords
 */
export async function checkPwnedPassword(password: string): Promise<number> {
  if (!password) return 0;
  try {
    const sha1 = crypto.createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" }, // padding để không leak prefix qua response size
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return 0; // service down → fail open, không chặn user

    const text = await res.text();
    for (const line of text.split("\n")) {
      const [hashSuffix, count] = line.trim().split(":");
      if (hashSuffix === suffix) return Number(count) || 1;
    }
    return 0;
  } catch {
    return 0; // fail open
  }
}

/* ─────────────── Password strength scorer ─────────────── */

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  /** Vietnamese label: "Quá yếu" / "Yếu" / "Trung bình" / "Khá" / "Mạnh" */
  label: string;
  /** Suggestions để cải thiện. */
  hints: string[];
}

/**
 * Đánh giá mật khẩu 0-4. Đơn giản, không dùng zxcvbn (~700KB) — chỉ check
 * length + character classes + common patterns.
 */
export function passwordStrength(password: string): PasswordStrength {
  const hints: string[] = [];
  if (!password) return { score: 0, label: "Quá yếu", hints: ["Nhập mật khẩu"] };

  const len = password.length;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const classes = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;

  // Pattern phổ biến yếu
  const lower = password.toLowerCase();
  const COMMON_BAD = [
    "password", "123456", "qwerty", "abc123", "letmein", "111111",
    "matkhau", "12345678", "admin", "iloveyou", "welcome",
  ];
  const isCommon = COMMON_BAD.some((p) => lower.includes(p));
  const isSequential = /(?:abcd|0123|1234|2345|3456|4567|5678|6789|qwer)/i.test(password);
  const isRepeating = /(.)\1{3,}/.test(password); // 4+ ký tự giống nhau liên tiếp

  let score = 0;
  if (len >= 6) score++;
  if (len >= 10) score++;
  if (len >= 14) score++;
  if (classes >= 3) score++;

  if (isCommon || isSequential || isRepeating) {
    score = Math.max(0, score - 2);
    if (isCommon) hints.push("Tránh dùng từ phổ biến (password, 123456...)");
    if (isSequential) hints.push("Tránh chuỗi liên tiếp (abcd, 1234)");
    if (isRepeating) hints.push("Tránh ký tự lặp (aaaa, 1111)");
  }

  if (len < 6) hints.push("Ít nhất 6 ký tự");
  else if (len < 10) hints.push("Nên ≥ 10 ký tự");
  if (classes < 3) hints.push("Trộn chữ thường + HOA + số + ký tự đặc biệt");

  const finalScore = Math.min(4, Math.max(0, score)) as 0 | 1 | 2 | 3 | 4;
  const labels = ["Quá yếu", "Yếu", "Trung bình", "Khá", "Mạnh"];
  return { score: finalScore, label: labels[finalScore], hints };
}

/* ─────────────── Session fingerprint ─────────────── */

/**
 * Tính fingerprint đại diện thiết bị + network range. Dùng để nhận diện
 * "device đã biết" — không phải fingerprint chính xác (browser fingerprint
 * cần JS phía client) mà chỉ proxy của UA + IP/16.
 *
 * Ổn định khi user đổi IP trong cùng ISP, nhưng đổi khi user đổi network/
 * trình duyệt → đủ để cảnh báo "login từ thiết bị mới".
 */
export function computeFingerprint(userAgent: string | null, ip: string | null): string {
  // Lấy /16 của IPv4 hoặc /48 của IPv6 → ổn định trong cùng nhà cung cấp.
  let ipPrefix = "";
  if (ip) {
    if (ip.includes(":")) {
      // IPv6 → lấy 3 hextet đầu (~/48)
      ipPrefix = ip.split(":").slice(0, 3).join(":");
    } else {
      // IPv4 → lấy 2 octet đầu (/16)
      ipPrefix = ip.split(".").slice(0, 2).join(".");
    }
  }
  // UA phải parse simplified — không dùng full vì user agent đổi nhỏ (vd patch
  // version Chrome) sẽ làm fingerprint đổi → spam alert false-positive.
  const uaSimple = (userAgent || "")
    .match(/(Chrome|Firefox|Safari|Edge|OPR|Opera|MSIE|Trident|Mobile|iPhone|Android|Windows|Mac|Linux)/g)
    ?.sort()
    .join("|") ?? "unknown";

  return crypto
    .createHash("sha256")
    .update(`${uaSimple}|${ipPrefix}`)
    .digest("hex")
    .slice(0, 32);
}

/* ─────────────── CAPTCHA threshold ─────────────── */

/**
 * Bao nhiêu lần fail login trước khi yêu cầu CAPTCHA.
 * Trước threshold: cho phép skip để UX mượt cho user thông thường.
 * Sau threshold: bắt buộc CAPTCHA để chống automated attack.
 */
export const CAPTCHA_THRESHOLD = 2;
