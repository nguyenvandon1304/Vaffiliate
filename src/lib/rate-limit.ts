/**
 * Rate limiter — auto-detect Upstash Redis (production) hoặc fallback in-memory (dev).
 *
 * Strategy:
 *  - Khi có UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN → dùng @upstash/ratelimit
 *    (sliding window, share giữa các instance, survive restart)
 *  - Fallback in-memory khi:
 *    - Không có credential (dev local)
 *    - Upstash error (network down) — graceful degradation
 *  - Tắt hoàn toàn khi `DISABLE_RATE_LIMIT=1` (test e2e)
 *
 * Lý do dùng Upstash:
 *  - Free tier: 10,000 requests/day → đủ cho V-Affiliate
 *  - HTTP REST API → không cần TCP socket, hoạt động tốt với Render free
 *  - Latency ~50-100ms — chấp nhận được cho rate-limit check
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

interface Bucket {
  count: number;
  resetAt: number;
}

// Trạng thái global để Hot Reload không reset map.
const globalForRL = globalThis as unknown as {
  __rl_buckets?: Map<string, Bucket>;
  __rl_lastSweep?: number;
  __rl_upstash_clients?: Map<string, Ratelimit>;
  __rl_upstash_unavailable_until?: number;
};

const buckets = globalForRL.__rl_buckets ?? new Map<string, Bucket>();
globalForRL.__rl_buckets = buckets;

const upstashClients = globalForRL.__rl_upstash_clients ?? new Map<string, Ratelimit>();
globalForRL.__rl_upstash_clients = upstashClients;

const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 phút
const DEFAULT_MAX = 10;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000; // 5 phút quét cleanup một lần
const UPSTASH_DOWN_BACKOFF_MS = 60 * 1000; // 1 phút sau khi fail → ngưng thử

/** Singleton Redis client */
let _redisClient: Redis | null = null;
let _redisInitError = false;

function getRedisClient(): Redis | null {
  if (_redisInitError) return null;
  if (_redisClient) return _redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    _redisClient = new Redis({ url, token });
  } catch {
    _redisInitError = true;
    return null;
  }
  return _redisClient;
}

/**
 * Lấy/tạo Ratelimit instance theo (max, windowMs). Cache để không tạo nhiều
 * client trùng config.
 */
function getUpstashLimiter(max: number, windowMs: number): Ratelimit | null {
  const redis = getRedisClient();
  if (!redis) return null;

  const cacheKey = `${max}@${windowMs}`;
  const cached = upstashClients.get(cacheKey);
  if (cached) return cached;

  // Convert windowMs → Upstash duration string
  const seconds = Math.max(1, Math.round(windowMs / 1000));
  const durationStr = `${seconds} s` as `${number} s`;

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, durationStr),
    prefix: "vaff:rl",
    analytics: false, // Tiết kiệm Redis ops
  });
  upstashClients.set(cacheKey, limiter);
  return limiter;
}

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
  /** Backend đã serve request này — debug + observability */
  backend?: "memory" | "upstash";
}

/**
 * In-memory fallback. Đồng bộ, nhanh.
 */
function rateLimitMemory(
  key: string,
  max: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  maybeSweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, retryAfterSec: 0, backend: "memory" };
  }

  bucket.count++;
  if (bucket.count > max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      backend: "memory",
    };
  }
  return { allowed: true, remaining: max - bucket.count, retryAfterSec: 0, backend: "memory" };
}

/**
 * Async version — dùng Upstash khi có cấu hình, fallback in-memory khi lỗi.
 *
 * KHUYẾN NGHỊ DÙNG ở mọi route handler mới (await được).
 */
export async function rateLimitAsync(
  key: string,
  options: { max?: number; windowMs?: number } = {},
): Promise<RateLimitResult> {
  if (process.env.DISABLE_RATE_LIMIT === "1") {
    return { allowed: true, remaining: Infinity, retryAfterSec: 0, backend: "memory" };
  }

  const max = options.max ?? DEFAULT_MAX;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;

  // Backoff nếu Upstash đang down — không spam thử lại
  const downUntil = globalForRL.__rl_upstash_unavailable_until ?? 0;
  if (Date.now() < downUntil) {
    return rateLimitMemory(key, max, windowMs);
  }

  // Lấy limiter trong try/catch: new Redis()/new Ratelimit() có thể THROW đồng bộ
  // nếu URL/token Upstash sai định dạng (vd thiếu https://). Không được để crash
  // request → fail open về in-memory.
  let limiter: Ratelimit | null;
  try {
    limiter = getUpstashLimiter(max, windowMs);
  } catch (err) {
    console.error("[rate-limit] Upstash init error, fallback to memory:", err);
    globalForRL.__rl_upstash_unavailable_until = Date.now() + UPSTASH_DOWN_BACKOFF_MS;
    return rateLimitMemory(key, max, windowMs);
  }
  if (!limiter) {
    // Không có credential → in-memory
    return rateLimitMemory(key, max, windowMs);
  }

  try {
    const result = await limiter.limit(key);
    const retryAfterSec = result.reset
      ? Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))
      : 0;
    return {
      allowed: result.success,
      remaining: result.remaining,
      retryAfterSec: result.success ? 0 : retryAfterSec,
      backend: "upstash",
    };
  } catch (err) {
    console.error("[rate-limit] Upstash error, fallback to memory:", err);
    globalForRL.__rl_upstash_unavailable_until = Date.now() + UPSTASH_DOWN_BACKOFF_MS;
    return rateLimitMemory(key, max, windowMs);
  }
}

/**
 * Sync version — backwards compatible với code cũ. Chỉ dùng in-memory.
 *
 * @deprecated Dùng `rateLimitAsync` để tận dụng Upstash distributed rate limit.
 */
export function rateLimit(
  key: string,
  options: { max?: number; windowMs?: number } = {},
): RateLimitResult {
  if (process.env.DISABLE_RATE_LIMIT === "1") {
    return { allowed: true, remaining: Infinity, retryAfterSec: 0, backend: "memory" };
  }
  const max = options.max ?? DEFAULT_MAX;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  return rateLimitMemory(key, max, windowMs);
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

/**
 * Trả về backend đang dùng — cho health check / debug page.
 */
export function getRateLimitBackend(): "upstash" | "memory" | "disabled" {
  if (process.env.DISABLE_RATE_LIMIT === "1") return "disabled";
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) return "upstash";
  return "memory";
}
