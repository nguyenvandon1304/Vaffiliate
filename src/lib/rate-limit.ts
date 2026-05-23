/**
 * Rate limiter in-memory tối giản, dùng cho các route auth nhạy cảm.
 *
 * Hạn chế:
 *  - Mất dữ liệu khi server restart
 *  - Không share giữa nhiều instance (Vercel multi-region…)
 *  - Đủ dùng cho dev / single-instance. Production multi-instance nên dùng
 *    Redis hoặc Upstash để có rate-limit toàn cục.
 *
 * Tắt hoàn toàn khi `DISABLE_RATE_LIMIT=1` (tiện cho test e2e/dev nội bộ).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

// Trạng thái global để Hot Reload không reset map.
const globalForRL = globalThis as unknown as {
  __rl_buckets?: Map<string, Bucket>;
  __rl_lastSweep?: number;
};

const buckets = globalForRL.__rl_buckets ?? new Map<string, Bucket>();
globalForRL.__rl_buckets = buckets;

const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 phút
const DEFAULT_MAX = 10;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000; // 5 phút quét cleanup một lần

/** Quét xoá bucket đã hết hạn để Map không grow vô hạn. */
function maybeSweep(now: number) {
  const last = globalForRL.__rl_lastSweep ?? 0;
  if (now - last < SWEEP_INTERVAL_MS) return;
  globalForRL.__rl_lastSweep = now;
  for (const [key, b] of buckets) {
    if (b.resetAt < now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit(
  key: string,
  options: { max?: number; windowMs?: number } = {},
): RateLimitResult {
  if (process.env.DISABLE_RATE_LIMIT === "1") {
    return { allowed: true, remaining: Infinity, retryAfterSec: 0 };
  }

  const max = options.max ?? DEFAULT_MAX;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const now = Date.now();
  maybeSweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, retryAfterSec: 0 };
  }

  bucket.count++;
  if (bucket.count > max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, remaining: max - bucket.count, retryAfterSec: 0 };
}

/**
 * Lấy IP client từ header phổ biến (giữ tách biệt với turnstile.ts để không phụ thuộc).
 */
export function getRateLimitKey(headers: Headers, suffix: string): string {
  const ip =
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  return `${suffix}:${ip}`;
}
