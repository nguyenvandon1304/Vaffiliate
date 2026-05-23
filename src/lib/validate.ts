/**
 * Helpers validate input nhỏ gọn, không phụ thuộc thư viện.
 * Dùng cho các route auth/profile để giữ thông điệp lỗi nhất quán.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export function isEmail(value: unknown): value is string {
  return typeof value === "string" && EMAIL_RE.test(value);
}

export function isUsername(value: unknown): value is string {
  return typeof value === "string" && USERNAME_RE.test(value);
}

export function isNonEmptyString(value: unknown, max = 200): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

export function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && Math.floor(value) === value;
}

export function pickString(input: unknown, max = 1000): string | undefined {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, max);
}
