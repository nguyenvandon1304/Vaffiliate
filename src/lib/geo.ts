/**
 * IP Geolocation + IP blocklist (Group 5 #19).
 *
 * Strategy:
 * - Cloudflare proxy đã set sẵn `cf-ipcountry` header → lấy free, không gọi API
 * - Render free tier có thể không có cf-ipcountry → fallback ipapi.co (free 30k/month)
 * - Cache trong-process 1h để tiết kiệm API call
 *
 * IP Blocklist:
 * - Track fail attempts per IP qua audit_logs / login_failed_count
 * - Block IP sau 20 fail trong 1h từ ≥3 username khác nhau (rotation pattern)
 * - Block 24h, sau đó tự unblock
 */

import { getDb } from "@/lib/db";

interface GeoCache {
  country: string | null;
  expiresAt: number;
}

// In-memory cache 1h. Hot reload preserve.
const globalForGeo = globalThis as unknown as {
  __geo_cache?: Map<string, GeoCache>;
  __ip_block_cache?: Map<string, { blocked: boolean; expiresAt: number }>;
};
const geoCache = globalForGeo.__geo_cache ?? new Map<string, GeoCache>();
globalForGeo.__geo_cache = geoCache;

const ipBlockCache = globalForGeo.__ip_block_cache ?? new Map<string, { blocked: boolean; expiresAt: number }>();
globalForGeo.__ip_block_cache = ipBlockCache;

const CACHE_MS = 60 * 60 * 1000; // 1h
const IP_BLOCK_CACHE_MS = 60 * 1000; // 1 phút

/**
 * Lấy country code (2 ký tự ISO) từ IP. Trả về null nếu không xác định.
 *
 * 1. Header `cf-ipcountry` (Cloudflare đặt — free, không tốn quota)
 * 2. Cache hit → trả ngay
 * 3. Fallback ipapi.co/json/{ip} — free tier 30k/month, không cần API key
 */
export async function getCountryFromIp(
  ip: string | null | undefined,
  headers?: Headers,
): Promise<string | null> {
  if (!ip || ip === "unknown" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return null;
  }

  // 1. Cloudflare header trước
  if (headers) {
    const cfCountry = headers.get("cf-ipcountry");
    if (cfCountry && cfCountry !== "XX" && cfCountry !== "T1") {
      return cfCountry.toUpperCase();
    }
  }

  // 2. Cache
  const cached = geoCache.get(ip);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.country;
  }

  // 3. ipapi.co fallback
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/country/`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (!res.ok) {
      geoCache.set(ip, { country: null, expiresAt: Date.now() + CACHE_MS });
      return null;
    }
    const text = (await res.text()).trim();
    // Response thường là 2 chữ ISO code, hoặc "Undefined" nếu IP private
    const country = /^[A-Z]{2}$/.test(text) ? text : null;
    geoCache.set(ip, { country, expiresAt: Date.now() + CACHE_MS });
    return country;
  } catch (err) {
    console.warn("[geo] ipapi lookup failed:", err);
    geoCache.set(ip, { country: null, expiresAt: Date.now() + CACHE_MS });
    return null;
  }
}

/**
 * Convert country code → emoji flag (chỉ dùng cho hiển thị).
 */
export function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return "🌐";
  const codePoints = code
    .toUpperCase()
    .split("")
    .map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/**
 * Convert country code → tên VN. Đủ dùng cho các country phổ biến.
 */
const COUNTRY_NAMES_VI: Record<string, string> = {
  VN: "Việt Nam",
  US: "Mỹ",
  CN: "Trung Quốc",
  JP: "Nhật Bản",
  KR: "Hàn Quốc",
  TH: "Thái Lan",
  SG: "Singapore",
  MY: "Malaysia",
  ID: "Indonesia",
  PH: "Philippines",
  IN: "Ấn Độ",
  GB: "Anh",
  DE: "Đức",
  FR: "Pháp",
  RU: "Nga",
  AU: "Úc",
  CA: "Canada",
  HK: "Hong Kong",
  TW: "Đài Loan",
  KH: "Campuchia",
  LA: "Lào",
};

export function countryNameVi(code: string | null): string {
  if (!code) return "Không xác định";
  return COUNTRY_NAMES_VI[code.toUpperCase()] ?? code.toUpperCase();
}

/* ─────────────── IP Blocklist ─────────────── */

/**
 * Check IP có đang bị block không (cache 1 phút).
 */
export async function isIpBlocked(ip: string | null | undefined): Promise<boolean> {
  if (!ip || ip === "unknown") return false;

  const cached = ipBlockCache.get(ip);
  if (cached && cached.expiresAt > Date.now()) return cached.blocked;

  const db = await getDb();
  const row = await db.get(
    "SELECT id FROM ip_blocklist WHERE ip = ? AND (blocked_until IS NULL OR blocked_until > NOW())",
    [ip],
  );
  const blocked = !!row;
  ipBlockCache.set(ip, { blocked, expiresAt: Date.now() + IP_BLOCK_CACHE_MS });
  return blocked;
}

/**
 * Block IP trong N giờ. Tăng fail_count nếu IP đã có trong blocklist.
 */
export async function blockIp(ip: string, reason: string, hours: number = 24): Promise<void> {
  if (!ip || ip === "unknown") return;
  const db = await getDb();
  await db.run(
    `INSERT INTO ip_blocklist (ip, reason, blocked_until, fail_count)
     VALUES (?, ?, NOW() + (? || ' hours')::interval, 1)
     ON CONFLICT (ip) DO UPDATE SET
       reason = EXCLUDED.reason,
       blocked_until = EXCLUDED.blocked_until,
       fail_count = ip_blocklist.fail_count + 1`,
    [ip, reason, String(hours)],
  );
  // Invalidate cache
  ipBlockCache.delete(ip);
}

/**
 * Unblock IP thủ công (admin action).
 */
export async function unblockIp(ip: string): Promise<void> {
  const db = await getDb();
  await db.run("DELETE FROM ip_blocklist WHERE ip = ?", [ip]);
  ipBlockCache.delete(ip);
}

/**
 * Detect IP rotation pattern: 1 IP fail login với ≥3 username khác nhau trong 1h.
 *
 * Gọi sau mỗi login fail. Nếu phát hiện → auto block IP 24h.
 */
export async function detectAndBlockRotation(ip: string | null | undefined): Promise<{ blocked: boolean; reason?: string }> {
  if (!ip || ip === "unknown") return { blocked: false };

  const db = await getDb();
  // Đếm số username distinct mà IP này fail login trong 1h
  const row = await db.get(
    `SELECT COUNT(DISTINCT target) AS unique_users, COUNT(*) AS total_fails
     FROM audit_logs
     WHERE ip = ? AND action = 'user.login.failed'
       AND created_at > NOW() - INTERVAL '1 hour'`,
    [ip],
  );
  const uniqueUsers = Number(row?.unique_users ?? 0);
  const totalFails = Number(row?.total_fails ?? 0);

  // Threshold: ≥3 username khác nhau, ≥10 fail tổng → IP rotation pattern
  if (uniqueUsers >= 3 && totalFails >= 10) {
    await blockIp(ip, `IP rotation: ${uniqueUsers} username khác nhau, ${totalFails} fail trong 1h`, 24);
    return { blocked: true, reason: `Phát hiện IP rotation (${uniqueUsers} username, ${totalFails} fail)` };
  }
  return { blocked: false };
}

/* ─────────────── Login history ─────────────── */

export interface LoginHistoryEntry {
  id: number;
  ip: string | null;
  country: string | null;
  user_agent: string | null;
  is_new_device: boolean;
  is_new_country: boolean;
  created_at: string;
}

export async function recordLoginHistory(
  userId: number,
  meta: { ip: string | null; country: string | null; userAgent: string | null; isNewDevice: boolean; isNewCountry: boolean },
): Promise<void> {
  const db = await getDb();
  await db.run(
    `INSERT INTO login_history (user_id, ip, country, user_agent, is_new_device, is_new_country)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, meta.ip, meta.country, meta.userAgent, meta.isNewDevice ? 1 : 0, meta.isNewCountry ? 1 : 0],
  );
}

export async function getUserLoginHistory(userId: number, limit: number = 50): Promise<LoginHistoryEntry[]> {
  const db = await getDb();
  const safeLimit = Math.min(Math.max(limit, 1), 200);
  const rows = await db.all(
    `SELECT id, ip, country, user_agent, is_new_device, is_new_country, created_at
     FROM login_history WHERE user_id = ? ORDER BY id DESC LIMIT ?`,
    [userId, safeLimit],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    ip: r.ip === null ? null : String(r.ip),
    country: r.country === null ? null : String(r.country),
    user_agent: r.user_agent === null ? null : String(r.user_agent),
    is_new_device: Number(r.is_new_device) === 1,
    is_new_country: Number(r.is_new_country) === 1,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }));
}

/**
 * Check user đã từng login từ country này chưa.
 */
export async function hasLoggedFromCountry(userId: number, country: string | null): Promise<boolean> {
  if (!country) return true; // Không xác định → coi như đã thấy, không alert
  const db = await getDb();
  const row = await db.get(
    "SELECT id FROM login_history WHERE user_id = ? AND country = ? LIMIT 1",
    [userId, country],
  );
  return !!row;
}
