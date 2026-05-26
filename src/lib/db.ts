import postgres from "postgres";
import crypto from "crypto";
import { warnMissingEnv } from "@/lib/env-check";

/**
 * V-Affiliate DB layer — Supabase / PostgreSQL.
 *
 * Đã migrate từ `node:sqlite` (file local, sync API) sang `postgres` (network,
 * async). Giữ nguyên signature các hàm export để không phải sửa callsite.
 *
 * Yêu cầu env: DATABASE_URL (connection string Postgres của Supabase).
 * Format: `postgres://postgres.<ref>:<password>@<host>:5432/postgres`
 */

const DATABASE_URL = process.env.DATABASE_URL || "";

type SqlValue = string | number | boolean | null | Buffer | Date;

/**
 * Convert placeholder SQLite `?` → PostgreSQL `$1, $2, ...` để ko phải rewrite
 * SQL ở callsite. Hỗ trợ cả `?1, ?2` của SQLite (không reuse được — replace
 * nguyên dạng theo thứ tự xuất hiện).
 */
function convertPlaceholders(sql: string): string {
  // Trước: `?1, ?2, ?1` (SQLite reuse) → đổi thành dạng `$1, $2, $1` (Postgres reuse được).
  let out = sql.replace(/\?(\d+)/g, (_, n) => `$${n}`);
  // Sau: `?, ?, ?` không số → tăng dần $1, $2...
  let i = 0;
  out = out.replace(/\?/g, () => `$${++i}`);
  return out;
}

/**
 * Adapter mỏng quanh postgres.Sql với API tương thích node:sqlite Adapter cũ.
 * Mỗi method async (Postgres là network call). Caller PHẢI `await`.
 */
class DbAdapter {
  constructor(public readonly sql: postgres.Sql) {}

  /**
   * Chạy 1 statement — SELECT trả mảng row, INSERT/UPDATE/DELETE trả changes.
   * Cho INSERT cần `lastInsertRowid`, hãy thêm `RETURNING id` vào SQL rồi đọc
   * result.lastInsertRowid (postgres-js trả về .count + rows mảng).
   */
  async run(
    sqlText: string,
    params: SqlValue[] = [],
  ): Promise<{ lastInsertRowid: number; changes: number }> {
    const converted = convertPlaceholders(sqlText);
    const result = await this.sql.unsafe(converted, params as never[]);
    const rows = result as unknown as Record<string, unknown>[];
    const first = rows[0] as { id?: number | string } | undefined;
    return {
      lastInsertRowid: first?.id !== undefined ? Number(first.id) : 0,
      changes: (result as unknown as { count?: number }).count ?? rows.length,
    };
  }

  /** Lấy 1 row đầu tiên (giống .get() của SQLite). null nếu rỗng. */
  async get(
    sqlText: string,
    params: SqlValue[] = [],
  ): Promise<Record<string, unknown> | null> {
    const converted = convertPlaceholders(sqlText);
    const result = await this.sql.unsafe(converted, params as never[]);
    const rows = result as unknown as Record<string, unknown>[];
    return rows[0] ?? null;
  }

  /** Lấy toàn bộ row (giống .all() của SQLite). */
  async all(
    sqlText: string,
    params: SqlValue[] = [],
  ): Promise<Record<string, unknown>[]> {
    const converted = convertPlaceholders(sqlText);
    const result = await this.sql.unsafe(converted, params as never[]);
    return result as unknown as Record<string, unknown>[];
  }

  /** Chạy SQL không có params (DDL, multiple statement). */
  async exec(sqlText: string): Promise<void> {
    await this.sql.unsafe(sqlText);
  }

  /**
   * Transaction — postgres-js wrap trong `sql.begin()`. Callback nhận adapter
   * mới wrap quanh tx connection để mọi query bên trong cùng transaction.
   */
  async transaction<T>(fn: (tx: DbAdapter) => Promise<T>): Promise<T> {
    return (await this.sql.begin(async (txSql) => {
      return await fn(new DbAdapter(txSql as unknown as postgres.Sql));
    })) as T;
  }
}

const globalForDb = globalThis as unknown as {
  __vaff_db: DbAdapter | null;
  __vaff_sql: postgres.Sql | null;
};

/** No-op để giữ tương thích — postgres tự persist sau mỗi statement. */
function saveDb(): void {
  /* postgres tự ghi DB. */
}

let initPromise: Promise<DbAdapter> | null = null;

export async function getDb(): Promise<DbAdapter> {
  if (globalForDb.__vaff_db) return globalForDb.__vaff_db;
  // Chống race khi nhiều request đầu tiên cùng init.
  if (!initPromise) initPromise = doInit();
  return initPromise;
}

async function doInit(): Promise<DbAdapter> {
  warnMissingEnv();
  if (!DATABASE_URL) {
    throw new Error(
      "[V-Affiliate] DATABASE_URL chưa được set. Lấy connection string Supabase tại Project Settings → Database → Connection pooling (Transaction mode).",
    );
  }

  const sql = postgres(DATABASE_URL, {
    ssl: "require",
    max: 10,                  // pool tối đa 10 conn — đủ cho Vercel free tier
    idle_timeout: 20,         // giây — đóng conn idle để giải phóng slot
    connect_timeout: 10,      // giây — fail nhanh nếu Supabase down
    prepare: false,           // tương thích Supabase pgbouncer (transaction mode)
  });

  const adapter = new DbAdapter(sql);
  globalForDb.__vaff_sql = sql;
  globalForDb.__vaff_db = adapter;

  await initSchema(adapter);
  return adapter;
}

/**
 * Tạo schema + migration nhẹ. Postgres hỗ trợ `ADD COLUMN IF NOT EXISTS` nên
 * không cần try/catch như SQLite.
 */
async function initSchema(database: DbAdapter): Promise<void> {
  await database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      display_name TEXT,
      phone TEXT,
      withdraw_pin_hash TEXT,
      withdraw_pin_salt TEXT,
      withdraw_pin_failed_count INTEGER DEFAULT 0,
      withdraw_pin_locked_until TIMESTAMPTZ,
      totp_secret TEXT,
      totp_enabled INTEGER DEFAULT 0,
      login_failed_count INTEGER DEFAULT 0,
      login_locked_until TIMESTAMPTZ,
      email_verified INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      role TEXT DEFAULT 'user',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      last_login TIMESTAMPTZ
    )
  `);
  await database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      ip TEXT,
      user_agent TEXT,
      last_seen_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await database.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      order_code TEXT NOT NULL UNIQUE,
      store TEXT NOT NULL DEFAULT 'Shopee',
      amount BIGINT NOT NULL DEFAULT 0,
      cashback BIGINT NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Chờ xác nhận',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await database.exec(`
    CREATE TABLE IF NOT EXISTS wallet (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      amount BIGINT NOT NULL,
      type TEXT NOT NULL DEFAULT 'credit',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await database.exec(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      bank_code TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      account_holder TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await database.exec(`
    CREATE TABLE IF NOT EXISTS withdrawals (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      bank_account_id BIGINT NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
      amount BIGINT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Đang xử lý',
      admin_note TEXT,
      updated_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await database.exec(`
    CREATE TABLE IF NOT EXISTS affiliate_links (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      shop_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      product_name TEXT,
      product_price BIGINT DEFAULT 0,
      commission BIGINT DEFAULT 0,
      commission_rate TEXT,
      cashback BIGINT DEFAULT 0,
      affiliate_link TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // ─── Short links (URL shortener cho copy/share trên Facebook) ───
  // Vấn đề: link Shopee đầy đủ ~200+ ký tự với nhiều query param → Facebook
  // KHÔNG auto-link (link bị đen, không click được). Sinh code 8 ký tự,
  // redirect 302 server-side sang URL gốc → FB nhận diện được như link bình
  // thường + mỗi lần click count luôn cho analytics.
  await database.exec(`
    CREATE TABLE IF NOT EXISTS short_links (
      id BIGSERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      target_url TEXT NOT NULL,
      shop_id TEXT,
      item_id TEXT,
      click_count BIGINT DEFAULT 0,
      last_clicked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await database.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await database.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await database.exec(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await database.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      target TEXT,
      ip TEXT,
      user_agent TEXT,
      detail TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await database.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await database.exec(`
    CREATE TABLE IF NOT EXISTS import_history (
      id BIGSERIAL PRIMARY KEY,
      admin_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      file_name TEXT,
      total INTEGER DEFAULT 0,
      matched INTEGER DEFAULT 0,
      updated INTEGER DEFAULT 0,
      duplicated INTEGER DEFAULT 0,
      unmatched INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await database.exec(`
    CREATE TABLE IF NOT EXISTS totp_backup_codes (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_hash TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await database.exec(`
    CREATE TABLE IF NOT EXISTS known_devices (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      fp_hash TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      first_seen TIMESTAMPTZ DEFAULT NOW(),
      last_seen TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, fp_hash)
    )
  `);
  await database.exec(`
    CREATE TABLE IF NOT EXISTS referrals (
      id BIGSERIAL PRIMARY KEY,
      referrer_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      referee_user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      bonus_credited INTEGER DEFAULT 0,
      bonus_credited_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Bảng achievements — track huy hiệu user đã đạt được. Mỗi user 1 record / badge.
  await database.exec(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      badge_code TEXT NOT NULL,
      earned_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, badge_code)
    )
  `);

  // Lịch sử quay vòng — mỗi lần spin tạo 1 row. Dùng để check cooldown 24h.
  await database.exec(`
    CREATE TABLE IF NOT EXISTS spin_history (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reward_amount BIGINT NOT NULL DEFAULT 0,
      reward_label TEXT NOT NULL,
      segment_index INTEGER NOT NULL,
      spun_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Wishlist — user paste link Shopee để theo dõi giá. App tự check giá định kỳ
  // (lazy check khi user mở trang) và notify khi giảm giá.
  await database.exec(`
    CREATE TABLE IF NOT EXISTS wishlist (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      shop_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      product_image TEXT,
      product_link TEXT NOT NULL,
      affiliate_link TEXT,
      initial_price BIGINT NOT NULL DEFAULT 0,
      current_price BIGINT NOT NULL DEFAULT 0,
      lowest_price BIGINT NOT NULL DEFAULT 0,
      commission_rate TEXT,
      last_checked_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, shop_id, item_id)
    )
  `);

  // Anti-fraud — flag hành vi bất thường để admin review.
  // type: same_ip_register | self_referral | rapid_withdraw | suspicious_login
  // severity: low | medium | high
  await database.exec(`
    CREATE TABLE IF NOT EXISTS fraud_flags (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'medium',
      detail TEXT,
      resolved INTEGER DEFAULT 0,
      resolved_at TIMESTAMPTZ,
      resolved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Indexes — all idempotent
  await database.exec("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(user_id, status)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_wallet_user ON wallet(user_id)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_wallet_user_type ON wallet(user_id, type)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_bank_user ON bank_accounts(user_id)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_affiliate_links_user ON affiliate_links(user_id)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_short_links_code ON short_links(code)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_short_links_user ON short_links(user_id, created_at DESC)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_reset_token ON password_reset_tokens(token)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_email_verify_token ON email_verification_tokens(token)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_import_history_created ON import_history(created_at DESC)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_backup_codes_user ON totp_backup_codes(user_id)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_known_devices_user ON known_devices(user_id)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_id)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_spin_user_time ON spin_history(user_id, spun_at DESC)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_fraud_unresolved ON fraud_flags(resolved, severity, created_at DESC)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_fraud_user ON fraud_flags(user_id)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id, created_at DESC)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_wishlist_check ON wishlist(last_checked_at)");

  // ─── Migrations idempotent: thêm cột country cho known_devices ───
  // Postgres không có "ADD COLUMN IF NOT EXISTS" trên một số version cũ → dùng try/catch
  try {
    await database.exec("ALTER TABLE known_devices ADD COLUMN IF NOT EXISTS country TEXT");
  } catch (e) {
    console.warn("[migration] add country column to known_devices:", e);
  }

  // ─── Login history (Group 5 #19) ───
  // Lưu mỗi lần login thành công kèm IP + country + UA → user xem map IP đã login.
  await database.exec(`
    CREATE TABLE IF NOT EXISTS login_history (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ip TEXT,
      country TEXT,
      user_agent TEXT,
      is_new_device INTEGER DEFAULT 0,
      is_new_country INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await database.exec("CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id, created_at DESC)");

  // ─── IP blocklist (Group 5 #19) ───
  // IP bị auto-block sau X lần fail rotation. Auto expire sau time-to-live.
  await database.exec(`
    CREATE TABLE IF NOT EXISTS ip_blocklist (
      id BIGSERIAL PRIMARY KEY,
      ip TEXT NOT NULL UNIQUE,
      reason TEXT,
      blocked_until TIMESTAMPTZ,
      fail_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await database.exec("CREATE INDEX IF NOT EXISTS idx_ip_blocklist_ip ON ip_blocklist(ip)");
  await database.exec("CREATE INDEX IF NOT EXISTS idx_ip_blocklist_until ON ip_blocklist(blocked_until)");

  // Seed default admin
  const adminExists = await database.get("SELECT id FROM users WHERE username = 'admin'", []);
  if (!adminExists) {
    const seedPassword = process.env.ADMIN_SEED_PASSWORD || "admin123";
    const passwordHash = await hashPasswordEncoded(seedPassword);
    await database.run(
      "INSERT INTO users (username, email, password_hash, salt, display_name, role, email_verified) VALUES (?, ?, ?, ?, ?, ?, 1)",
      ["admin", "admin@v-affiliate.vn", passwordHash, "", "Admin", "admin"],
    );
    if (process.env.NODE_ENV === "production" && !process.env.ADMIN_SEED_PASSWORD) {
      console.warn(
        "[V-Affiliate] ⚠️  Tài khoản admin đã được tạo với password mặc định 'admin123'. " +
        "ĐĂNG NHẬP NGAY và đổi password (vào /dashboard/security), hoặc set ADMIN_SEED_PASSWORD trước khi deploy lần sau.",
      );
    }
  }

  // Fix old labels (idempotent)
  await database.run(
    "UPDATE wallet SET label = 'Biến động số dư' WHERE label IN ('Cong so du', 'C?ng s? du', 'Cộng số dư')",
    [],
  );
}

/* ─────────────── Crypto helpers ─────────────── */

const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = "sha512";

function pbkdf2Async(password: string, salt: string, iterations: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, PBKDF2_KEYLEN, PBKDF2_DIGEST, (err, derived) => {
      if (err) reject(err);
      else resolve(derived);
    });
  });
}

async function hashPasswordEncoded(password: string, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await pbkdf2Async(password, salt, iterations);
  return `pbkdf2$${iterations}$${salt}$${derived.toString("hex")}`;
}

async function verifyPassword(
  password: string,
  storedHash: string,
  legacySalt?: string | null,
): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  if (typeof storedHash !== "string" || storedHash.length === 0) {
    return { valid: false, needsUpgrade: false };
  }
  if (storedHash.startsWith("pbkdf2$")) {
    const parts = storedHash.split("$");
    if (parts.length !== 4) return { valid: false, needsUpgrade: false };
    const iterations = Number(parts[1]);
    const salt = parts[2];
    const expectedHex = parts[3];
    if (!Number.isFinite(iterations) || iterations <= 0) {
      return { valid: false, needsUpgrade: false };
    }
    const computed = await pbkdf2Async(password, salt, iterations);
    const expected = Buffer.from(expectedHex, "hex");
    if (computed.length !== expected.length) {
      return { valid: false, needsUpgrade: false };
    }
    const valid = crypto.timingSafeEqual(computed, expected);
    return { valid, needsUpgrade: valid && iterations < PBKDF2_ITERATIONS };
  }
  if (!legacySalt) return { valid: false, needsUpgrade: false };
  const computed = await pbkdf2Async(password, legacySalt, 10_000);
  const expected = Buffer.from(storedHash, "hex");
  if (computed.length !== expected.length) return { valid: false, needsUpgrade: false };
  const valid = crypto.timingSafeEqual(computed, expected);
  return { valid, needsUpgrade: valid };
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getEncKey(): Buffer {
  const envKey = process.env.APP_ENCRYPTION_KEY;
  if (envKey) {
    if (/^[0-9a-fA-F]{64}$/.test(envKey)) return Buffer.from(envKey, "hex");
    try {
      const buf = Buffer.from(envKey, "base64");
      if (buf.length === 32) return buf;
    } catch { /* fallthrough */ }
    console.warn("[V-Affiliate] ⚠️  APP_ENCRYPTION_KEY định dạng không hợp lệ, dùng fallback derived key.");
  }
  // Fallback (KHÔNG dùng production) — derive từ DATABASE_URL để mỗi env có key khác.
  return crypto.createHash("sha256").update(`v-affiliate:${DATABASE_URL || "no-db"}`).digest();
}

export function encryptSecret(plain: string): string {
  if (!plain) return "";
  const key = getEncKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("hex")}:${tag.toString("hex")}:${ct.toString("hex")}`;
}

export function decryptSecret(payload: string): string | null {
  if (!payload) return null;
  if (/^[A-Z2-7]+=*$/.test(payload)) return payload;
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  try {
    const key = getEncKey();
    const iv = Buffer.from(parts[1], "hex");
    const tag = Buffer.from(parts[2], "hex");
    const ct = Buffer.from(parts[3], "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const out = Buffer.concat([decipher.update(ct), decipher.final()]);
    return out.toString("utf8");
  } catch {
    return null;
  }
}

/* ─────────────── User core ─────────────── */

export interface User {
  id: number;
  username: string;
  email: string;
  display_name: string | null;
  phone: string | null;
  has_withdraw_pin: boolean;
  email_verified: boolean;
  created_at: string;
  last_login: string | null;
  is_active: number;
  role: string;
}

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: Number(row.id),
    username: row.username as string,
    email: row.email as string,
    display_name: (row.display_name as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    has_withdraw_pin: !!row.withdraw_pin_hash,
    email_verified: Number(row.email_verified) === 1,
    created_at: toIso(row.created_at),
    last_login: row.last_login ? toIso(row.last_login) : null,
    is_active: Number(row.is_active),
    role: (row.role as string) || "user",
  };
}

/** Postgres trả TIMESTAMPTZ thành Date object. Convert về ISO string cho UI cũ. */
function toIso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return new Date().toISOString();
}

export async function registerUser(
  username: string,
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string; user?: User }> {
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return { success: false, error: "Tên đăng nhập chỉ chứa chữ, số, gạch dưới (3–20 ký tự)" };
  }

  // Chuẩn hóa username về lowercase khi lưu — login sẽ so sánh case-insensitive
  // Email cũng lowercase để khớp các flow gửi/xác minh email.
  const normalizedUsername = username.toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();

  const database = await getDb();

  // Check trùng username case-insensitive
  const existingUser = await database.get(
    "SELECT id FROM users WHERE LOWER(username) = LOWER(?)",
    [normalizedUsername],
  );
  if (existingUser) return { success: false, error: "Tên đăng nhập đã tồn tại" };

  const existingEmail = await database.get(
    "SELECT id FROM users WHERE LOWER(email) = LOWER(?)",
    [normalizedEmail],
  );
  if (existingEmail) return { success: false, error: "Email đã được sử dụng" };

  const passwordHash = await hashPasswordEncoded(password);

  await database.run(
    "INSERT INTO users (username, email, password_hash, salt, display_name, email_verified) VALUES (?, ?, ?, ?, ?, 0)",
    [normalizedUsername, normalizedEmail, passwordHash, "", username],
  );

  const row = await database.get(
    "SELECT id, username, email, display_name, phone, withdraw_pin_hash, role, email_verified, created_at, last_login, is_active FROM users WHERE username = ?",
    [normalizedUsername],
  );
  saveDb();

  if (!row) return { success: false, error: "Không thể tạo tài khoản" };
  return { success: true, user: rowToUser(row) };
}

export async function loginUser(
  username: string,
  password: string,
  meta: { ip?: string; userAgent?: string; totpCode?: string; fingerprint?: string } = {},
): Promise<{
  success: boolean;
  error?: string;
  needEmailVerify?: boolean;
  needTotp?: boolean;
  email?: string;
  user?: User;
  token?: string;
  isNewDevice?: boolean;
}> {
  const database = await getDb();

  // Username so sánh "loose": cho phép nhập đúng nguyên username gốc HOẶC
  // chỉ viết hoa chữ cái ĐẦU. Ví dụ user gốc "nguyenvandon" thì:
  //   - "nguyenvandon"  ✅
  //   - "Nguyenvandon"  ✅ (capitalize chữ đầu)
  //   - "NGUYENVANDON"  ❌
  //   - "NguyenVanDon"  ❌
  const row = await database.get(
    `SELECT id, username, email, password_hash, salt, display_name, phone, role,
            email_verified, created_at, last_login, is_active,
            login_failed_count, login_locked_until, totp_enabled, totp_secret,
            withdraw_pin_hash
     FROM users WHERE LOWER(username) = LOWER(?)`,
    [username],
  );

  const generic = "Tên đăng nhập hoặc mật khẩu không đúng";
  if (!row) {
    await verifyPassword(password, "pbkdf2$10000$00$00", null);
    return { success: false, error: generic };
  }

  // Validate format username: exact match HOẶC capitalize chữ đầu
  const storedUsername = String(row.username);
  const capitalizedFirst = storedUsername.charAt(0).toUpperCase() + storedUsername.slice(1);
  if (username !== storedUsername && username !== capitalizedFirst) {
    // Cố tình verify password để giữ timing constant — chống timing attack
    await verifyPassword(password, "pbkdf2$10000$00$00", null);
    return { success: false, error: generic };
  }

  const userId = Number(row.id);

  // Lock per-username
  const lockedUntilRaw = row.login_locked_until as Date | string | null;
  if (lockedUntilRaw) {
    const lockedUntil = new Date(lockedUntilRaw);
    if (lockedUntil > new Date()) {
      const minutes = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 60000));
      await verifyPassword(password, row.password_hash as string, row.salt as string | null);
      return {
        success: false,
        error: `Tài khoản tạm khoá do nhập sai nhiều lần. Thử lại sau ~${minutes} phút.`,
      };
    }
    await database.run("UPDATE users SET login_failed_count = 0, login_locked_until = NULL WHERE id = ?", [userId]);
  }

  const check = await verifyPassword(password, row.password_hash as string, row.salt as string | null);
  if (!check.valid) {
    const failed = (Number(row.login_failed_count) || 0) + 1;
    const MAX_LOGIN_FAIL = 10;
    const LOCK_MS = 15 * 60 * 1000;
    if (failed >= MAX_LOGIN_FAIL) {
      const lockedUntilIso = new Date(Date.now() + LOCK_MS).toISOString();
      await database.run(
        "UPDATE users SET login_failed_count = ?, login_locked_until = ? WHERE id = ?",
        [failed, lockedUntilIso, userId],
      );
      return { success: false, error: "Tài khoản tạm khoá do nhập sai nhiều lần. Thử lại sau ~15 phút." };
    }
    await database.run("UPDATE users SET login_failed_count = ? WHERE id = ?", [failed, userId]);
    return { success: false, error: generic };
  }

  if (Number(row.is_active) === 0) {
    return { success: false, error: "Tài khoản đã bị khoá. Vui lòng liên hệ hỗ trợ." };
  }

  // Email chưa verify: KHÔNG block đăng nhập (Phương án C — Soft Email Gate).
  // User vẫn login được, dashboard hiện banner cảnh báo. Các API nhạy cảm
  // (rút tiền, đổi password, 2FA, referral bonus) sẽ check qua requireVerified()
  // và trả 403.

  // 2FA TOTP
  if (Number(row.totp_enabled) === 1) {
    const code = meta.totpCode;
    if (!code) {
      return { success: false, needTotp: true, error: "Yêu cầu mã xác thực 2 lớp" };
    }
    const secretEnc = row.totp_secret as string | null;
    const secret = secretEnc ? decryptSecret(secretEnc) : null;
    let totpOk = false;
    if (secret && verifyTotpCode(secret, code)) {
      totpOk = true;
    } else {
      const cleaned = code.replace(/\s/g, "").toUpperCase();
      if (/^[A-Z2-9]{4}-?[A-Z2-9]{4}$/.test(cleaned)) {
        totpOk = await consumeBackupCode(userId, cleaned);
      }
    }
    if (!totpOk) {
      const failed = (Number(row.login_failed_count) || 0) + 1;
      const MAX_LOGIN_FAIL = 10;
      const LOCK_MS = 15 * 60 * 1000;
      if (failed >= MAX_LOGIN_FAIL) {
        const lockedUntilIso = new Date(Date.now() + LOCK_MS).toISOString();
        await database.run(
          "UPDATE users SET login_failed_count = ?, login_locked_until = ? WHERE id = ?",
          [failed, lockedUntilIso, userId],
        );
        return { success: false, needTotp: true, error: "Tài khoản tạm khoá do sai nhiều lần. Thử lại sau ~15 phút." };
      }
      await database.run("UPDATE users SET login_failed_count = ? WHERE id = ?", [failed, userId]);
      return { success: false, needTotp: true, error: "Mã xác thực 2 lớp hoặc backup code không đúng" };
    }
  }

  // Reset fail count
  await database.run("UPDATE users SET login_failed_count = 0, login_locked_until = NULL WHERE id = ?", [userId]);

  // Lazy upgrade hash
  if (check.needsUpgrade) {
    const upgraded = await hashPasswordEncoded(password);
    await database.run(
      "UPDATE users SET password_hash = ?, salt = ?, updated_at = NOW() WHERE id = ?",
      [upgraded, "", userId],
    );
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await database.run(
    "INSERT INTO sessions (user_id, token, expires_at, last_seen_at, ip, user_agent) VALUES (?, ?, ?, NOW(), ?, ?)",
    [userId, token, expiresAt, meta.ip ?? null, meta.userAgent ?? null],
  );
  await database.run("UPDATE users SET last_login = NOW() WHERE id = ?", [userId]);

  const user: User = {
    id: userId,
    username: row.username as string,
    email: row.email as string,
    display_name: (row.display_name as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    has_withdraw_pin: !!row.withdraw_pin_hash,
    email_verified: !!row.email_verified,
    created_at: toIso(row.created_at),
    last_login: new Date().toISOString(),
    is_active: Number(row.is_active),
    role: (row.role as string) || "user",
  };

  let isNewDevice = false;
  if (meta.fingerprint) {
    try {
      const tracked = await trackKnownDevice(userId, meta.fingerprint, {
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      });
      isNewDevice = tracked.isNew;
    } catch (e) {
      console.error("[loginUser] trackKnownDevice failed:", e);
    }
  }

  return { success: true, user, token, isNewDevice };
}

const SESSION_SLIDING_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_ABSOLUTE_MAX_MS = 30 * 24 * 60 * 60 * 1000;

export async function getUserByToken(
  token: string,
  meta: { ip?: string; userAgent?: string } = {},
): Promise<User | null> {
  const database = await getDb();

  const session = await database.get(
    "SELECT id, user_id, expires_at, created_at FROM sessions WHERE token = ?",
    [token],
  );
  if (!session) return null;

  const now = Date.now();
  if (new Date(session.expires_at as Date | string).getTime() < now) {
    await database.run("DELETE FROM sessions WHERE token = ?", [token]);
    return null;
  }

  const row = await database.get(
    "SELECT id, username, email, display_name, phone, withdraw_pin_hash, role, email_verified, created_at, last_login, is_active FROM users WHERE id = ?",
    [Number(session.user_id)],
  );
  if (!row) return null;
  if (Number(row.is_active) === 0) {
    await database.run("DELETE FROM sessions WHERE user_id = ?", [Number(row.id)]);
    return null;
  }

  const sessionCreated = new Date(session.created_at as Date | string).getTime();
  const newExpiry = Math.min(now + SESSION_SLIDING_MS, sessionCreated + SESSION_ABSOLUTE_MAX_MS);
  await database.run(
    "UPDATE sessions SET expires_at = ?, last_seen_at = NOW(), ip = COALESCE(?, ip), user_agent = COALESCE(?, user_agent) WHERE id = ?",
    [new Date(newExpiry).toISOString(), meta.ip ?? null, meta.userAgent ?? null, Number(session.id)],
  );

  return rowToUser(row);
}

export async function deleteSession(token: string): Promise<void> {
  const database = await getDb();
  await database.run("DELETE FROM sessions WHERE token = ?", [token]);
}

/* ─────────────── Sessions / account ─────────────── */

export interface SessionInfo {
  id: number;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string | null;
  expires_at: string;
  is_current: boolean;
}

export async function listUserSessions(userId: number, currentToken?: string): Promise<SessionInfo[]> {
  const database = await getDb();
  const rows = await database.all(
    "SELECT id, token, ip, user_agent, created_at, last_seen_at, expires_at FROM sessions WHERE user_id = ? AND expires_at > NOW() ORDER BY last_seen_at DESC, created_at DESC",
    [userId],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    ip: (r.ip as string | null) ?? null,
    user_agent: (r.user_agent as string | null) ?? null,
    created_at: toIso(r.created_at),
    last_seen_at: r.last_seen_at ? toIso(r.last_seen_at) : null,
    expires_at: toIso(r.expires_at),
    is_current: !!currentToken && r.token === currentToken,
  }));
}

export async function deleteOtherSessions(userId: number, keepToken: string): Promise<void> {
  const database = await getDb();
  await database.run("DELETE FROM sessions WHERE user_id = ? AND token != ?", [userId, keepToken]);
}

export async function deleteSessionById(
  userId: number,
  sessionId: number,
): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const row = await database.get(
    "SELECT id FROM sessions WHERE id = ? AND user_id = ?",
    [sessionId, userId],
  );
  if (!row) return { success: false, error: "Session không tồn tại" };
  await database.run("DELETE FROM sessions WHERE id = ?", [sessionId]);
  return { success: true };
}

export async function changeUserPassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
  options: { keepToken?: string } = {},
): Promise<{ success: boolean; error?: string }> {
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return { success: false, error: "Mật khẩu mới phải có ít nhất 6 ký tự" };
  }
  if (newPassword === currentPassword) {
    return { success: false, error: "Mật khẩu mới phải khác mật khẩu hiện tại" };
  }

  const database = await getDb();
  const row = await database.get("SELECT password_hash, salt FROM users WHERE id = ?", [userId]);
  if (!row) return { success: false, error: "Không tìm thấy người dùng" };

  const check = await verifyPassword(currentPassword, row.password_hash as string, row.salt as string | null);
  if (!check.valid) return { success: false, error: "Mật khẩu hiện tại không đúng" };

  const newHash = await hashPasswordEncoded(newPassword);
  await database.run(
    "UPDATE users SET password_hash = ?, salt = ?, updated_at = NOW() WHERE id = ?",
    [newHash, "", userId],
  );
  if (options.keepToken) {
    await database.run("DELETE FROM sessions WHERE user_id = ? AND token != ?", [userId, options.keepToken]);
  } else {
    await database.run("DELETE FROM sessions WHERE user_id = ?", [userId]);
  }
  return { success: true };
}

export async function deleteUserAccount(
  userId: number,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const row = await database.get("SELECT password_hash, salt, role FROM users WHERE id = ?", [userId]);
  if (!row) return { success: false, error: "Không tìm thấy người dùng" };
  if ((row.role as string) === "admin") return { success: false, error: "Tài khoản admin không thể tự xoá" };

  const check = await verifyPassword(password, row.password_hash as string, row.salt as string | null);
  if (!check.valid) return { success: false, error: "Mật khẩu không đúng" };

  await database.run("DELETE FROM users WHERE id = ?", [userId]);
  return { success: true };
}


/* ─────────────── Email verification ─────────────── */

export async function createEmailVerificationToken(
  userId: number,
): Promise<{ token: string; expiresAt: string }> {
  const database = await getDb();
  await database.run(
    "UPDATE email_verification_tokens SET used = 1 WHERE user_id = ? AND used = 0",
    [userId],
  );
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await database.run(
    "INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
    [userId, tokenHash, expiresAt],
  );
  return { token, expiresAt };
}

export async function verifyEmailToken(
  token: string,
): Promise<{ success: boolean; error?: string; userId?: number }> {
  const database = await getDb();
  const tokenHash = hashToken(token);
  const row = await database.get(
    "SELECT id, user_id, expires_at, used FROM email_verification_tokens WHERE token = ?",
    [tokenHash],
  );
  if (!row) return { success: false, error: "Link xác thực không hợp lệ" };
  if (Number(row.used) === 1) return { success: false, error: "Link đã được sử dụng" };
  if (new Date(row.expires_at as Date | string) < new Date()) {
    return { success: false, error: "Link đã hết hạn (24h)" };
  }

  await database.run("UPDATE email_verification_tokens SET used = 1 WHERE id = ?", [Number(row.id)]);
  await database.run(
    "UPDATE users SET email_verified = 1, updated_at = NOW() WHERE id = ?",
    [Number(row.user_id)],
  );
  return { success: true, userId: Number(row.user_id) };
}

export async function getUserByEmail(
  email: string,
): Promise<{ id: number; username: string; email_verified: boolean } | null> {
  const database = await getDb();
  const row = await database.get(
    "SELECT id, username, email_verified FROM users WHERE LOWER(email) = LOWER(?)",
    [email],
  );
  if (!row) return null;
  return {
    id: Number(row.id),
    username: row.username as string,
    email_verified: Number(row.email_verified) === 1,
  };
}

/**
 * Đổi email cho user CHƯA verify — chỉ cho phép khi email_verified = 0.
 * Dùng khi user nhập sai email lúc đăng ký, muốn sửa lại.
 *
 * Bảo mật:
 * - Yêu cầu username + password để xác thực owner
 * - Email mới phải chưa được dùng bởi user khác
 * - Không cho dùng nếu user đã verify (đã có email + dùng forgot-password / profile thay)
 */
export async function changeUnverifiedEmail(
  username: string,
  password: string,
  newEmail: string,
): Promise<{ success: boolean; error?: string; userId?: number }> {
  const database = await getDb();
  const row = await database.get(
    "SELECT id, password_hash, email_verified FROM users WHERE LOWER(username) = LOWER(?)",
    [username],
  );
  if (!row) {
    // Verify password để giữ timing constant
    await verifyPassword(password, "pbkdf2$10000$00$00", null);
    return { success: false, error: "Tên đăng nhập hoặc mật khẩu không đúng" };
  }
  const ok = await verifyPassword(password, row.password_hash as string, null);
  if (!ok) return { success: false, error: "Tên đăng nhập hoặc mật khẩu không đúng" };

  if (Number(row.email_verified) === 1) {
    return { success: false, error: "Tài khoản đã xác minh email. Vui lòng dùng tính năng cập nhật profile để đổi email." };
  }

  const userId = Number(row.id);
  const normalizedEmail = newEmail.trim().toLowerCase();

  // Check email mới chưa bị user khác dùng
  const existing = await database.get(
    "SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?",
    [normalizedEmail, userId],
  );
  if (existing) {
    return { success: false, error: "Email đã được tài khoản khác sử dụng" };
  }

  await database.run(
    "UPDATE users SET email = ?, updated_at = NOW() WHERE id = ?",
    [normalizedEmail, userId],
  );

  // Vô hiệu hoá tất cả token verify cũ (để link cũ không dùng được nữa)
  await database.run(
    "UPDATE email_verification_tokens SET used = 1 WHERE user_id = ? AND used = 0",
    [userId],
  );

  return { success: true, userId };
}

/* ─────────────── Audit log ─────────────── */

export async function logAudit(
  action: string,
  options: {
    userId?: number | null;
    target?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    detail?: string | null;
  } = {},
): Promise<void> {
  const database = await getDb();
  await database.run(
    "INSERT INTO audit_logs (user_id, action, target, ip, user_agent, detail) VALUES (?, ?, ?, ?, ?, ?)",
    [
      options.userId ?? null,
      action,
      options.target ?? null,
      options.ip ?? null,
      options.userAgent ?? null,
      options.detail ?? null,
    ],
  );
}

export async function getAuditLogs(limit: number = 200): Promise<Record<string, unknown>[]> {
  // Backwards compatible — basic limit-only fetch.
  const database = await getDb();
  return await database.all(
    "SELECT id, user_id, action, target, ip, user_agent, detail, created_at FROM audit_logs ORDER BY id DESC LIMIT ?",
    [limit],
  );
}

export interface AuditLogFilter {
  action?: string;
  userId?: number;
  username?: string;
  ip?: string;
  search?: string;
  fromDate?: string; // ISO yyyy-mm-dd
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogResult {
  rows: Array<{
    id: number;
    user_id: number | null;
    username: string | null;
    display_name: string | null;
    action: string;
    target: string | null;
    ip: string | null;
    user_agent: string | null;
    detail: string | null;
    created_at: string;
  }>;
  total: number;
}

/**
 * Filter audit logs với nhiều tiêu chí + JOIN users để hiện username.
 * Dùng cho UI advanced + export CSV.
 */
export async function searchAuditLogs(filter: AuditLogFilter): Promise<AuditLogResult> {
  const database = await getDb();
  const limit = Math.min(Math.max(filter.limit ?? 100, 1), 5000);
  const offset = Math.max(filter.offset ?? 0, 0);

  const where: string[] = [];
  const params: SqlValue[] = [];
  if (filter.action) { where.push("a.action = ?"); params.push(filter.action); }
  if (filter.userId) { where.push("a.user_id = ?"); params.push(filter.userId); }
  if (filter.username) { where.push("u.username = ?"); params.push(filter.username); }
  if (filter.ip) { where.push("a.ip = ?"); params.push(filter.ip); }
  if (filter.fromDate) { where.push("a.created_at >= ?::timestamp"); params.push(filter.fromDate); }
  if (filter.toDate) { where.push("a.created_at < (?::date + interval '1 day')"); params.push(filter.toDate); }
  if (filter.search) {
    where.push("(a.action ILIKE ? OR a.target ILIKE ? OR a.detail ILIKE ? OR u.username ILIKE ?)");
    const q = `%${filter.search}%`;
    params.push(q, q, q, q);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countRow = await database.get(
    `SELECT COUNT(*) AS c FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id ${whereSql}`,
    params,
  );
  const rows = await database.all(
    `SELECT a.id, a.user_id, u.username, u.display_name, a.action, a.target, a.ip, a.user_agent, a.detail, a.created_at
     FROM audit_logs a
     LEFT JOIN users u ON a.user_id = u.id
     ${whereSql}
     ORDER BY a.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return {
    rows: rows.map((r) => ({
      id: Number(r.id),
      user_id: r.user_id === null ? null : Number(r.user_id),
      username: r.username === null ? null : String(r.username),
      display_name: r.display_name === null ? null : String(r.display_name),
      action: String(r.action),
      target: r.target === null ? null : String(r.target),
      ip: r.ip === null ? null : String(r.ip),
      user_agent: r.user_agent === null ? null : String(r.user_agent),
      detail: r.detail === null ? null : String(r.detail),
      created_at: String(r.created_at),
    })),
    total: Number(countRow?.c ?? 0),
  };
}

/** Lấy danh sách distinct action values — cho dropdown filter */
export async function getDistinctAuditActions(): Promise<string[]> {
  const database = await getDb();
  const rows = await database.all("SELECT DISTINCT action FROM audit_logs ORDER BY action");
  return rows.map((r) => String(r.action));
}

/* ─────────────── User dashboard ─────────────── */

export interface Order {
  id: number;
  order_code: string;
  store: string;
  amount: number;
  cashback: number;
  status: string;
  created_at: string;
}

export interface WalletEntry {
  id: number;
  label: string;
  amount: number;
  type: string;
  created_at: string;
}

export interface DashboardStats {
  totalCashback: number;
  totalOrders: number;
  pendingOrders: number;
  walletBalance: number;
}

export interface BankAccount {
  id: number;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  is_default: number;
  created_at: string;
}

export async function getUserOrders(userId: number): Promise<Order[]> {
  const database = await getDb();
  const rows = await database.all(
    "SELECT id, order_code, store, amount, cashback, status, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC",
    [userId],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    order_code: r.order_code as string,
    store: r.store as string,
    amount: Number(r.amount),
    cashback: Number(r.cashback),
    status: r.status as string,
    created_at: toIso(r.created_at),
  }));
}

export async function getUserWallet(userId: number): Promise<WalletEntry[]> {
  const database = await getDb();
  const rows = await database.all(
    "SELECT id, label, amount, type, created_at FROM wallet WHERE user_id = ? ORDER BY created_at DESC",
    [userId],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    label: r.label as string,
    amount: Number(r.amount),
    type: r.type as string,
    created_at: toIso(r.created_at),
  }));
}

export async function getDashboardStats(userId: number): Promise<DashboardStats> {
  const database = await getDb();
  const row = await database.get(
    `SELECT
      COALESCE((SELECT SUM(cashback) FROM orders WHERE user_id = $1 AND status = 'Đã hoàn tiền'), 0) AS total_cashback,
      COALESCE((SELECT COUNT(*) FROM orders WHERE user_id = $1), 0) AS total_orders,
      COALESCE((SELECT COUNT(*) FROM orders WHERE user_id = $1 AND status IN ('Đang xử lý', 'Chờ xác nhận')), 0) AS pending_orders,
      COALESCE((SELECT SUM(CASE WHEN type='credit' THEN amount ELSE -amount END) FROM wallet WHERE user_id = $1), 0) AS wallet_balance`,
    [userId],
  );
  return {
    totalCashback: Number(row?.total_cashback ?? 0),
    totalOrders: Number(row?.total_orders ?? 0),
    pendingOrders: Number(row?.pending_orders ?? 0),
    walletBalance: Number(row?.wallet_balance ?? 0),
  };
}

export interface LeaderboardEntry {
  display_name: string;
  total_orders: number;
  total_cashback: number;
}

export async function getLeaderboard(period: "month" | "all" = "all"): Promise<LeaderboardEntry[]> {
  const database = await getDb();
  // Postgres dùng `date_trunc('month', NOW())` thay cho SQLite `date('now', 'start of month')`.
  const dateFilter = period === "month" ? "AND o.created_at >= date_trunc('month', NOW())" : "";
  const rows = await database.all(`
    SELECT u.display_name, COUNT(o.id) AS total_orders, COALESCE(SUM(o.cashback), 0) AS total_cashback
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id ${dateFilter}
    GROUP BY u.id
    HAVING COALESCE(SUM(o.cashback), 0) > 0
    ORDER BY total_cashback DESC
    LIMIT 10
  `);
  return rows.map((r) => ({
    display_name: (r.display_name as string) || "",
    total_orders: Number(r.total_orders),
    total_cashback: Number(r.total_cashback),
  }));
}

export async function updateUserProfile(
  userId: number,
  data: { display_name?: string; email?: string; phone?: string },
): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();

  if (data.email) {
    const existing = await database.get("SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?", [
      data.email,
      userId,
    ]);
    if (existing) return { success: false, error: "Email đã được sử dụng bởi tài khoản khác" };
  }

  const fields: string[] = [];
  const values: SqlValue[] = [];

  if (data.display_name !== undefined) { fields.push("display_name = ?"); values.push(data.display_name); }
  if (data.email !== undefined) { fields.push("email = ?"); values.push(data.email); }
  if (data.phone !== undefined) { fields.push("phone = ?"); values.push(data.phone); }

  if (fields.length === 0) return { success: false, error: "Không có thông tin cần cập nhật" };

  fields.push("updated_at = NOW()");
  values.push(userId);

  await database.run(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
  return { success: true };
}

/* ─────────────── Bank accounts + withdraw PIN + withdrawals ─────────────── */

export async function getUserBankAccounts(userId: number): Promise<BankAccount[]> {
  const database = await getDb();
  const rows = await database.all(
    "SELECT id, bank_code, bank_name, account_number, account_holder, is_default, created_at FROM bank_accounts WHERE user_id = ? ORDER BY is_default DESC, created_at DESC",
    [userId],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    bank_code: r.bank_code as string,
    bank_name: r.bank_name as string,
    account_number: r.account_number as string,
    account_holder: r.account_holder as string,
    is_default: Number(r.is_default),
    created_at: toIso(r.created_at),
  }));
}

export async function addBankAccount(
  userId: number,
  data: { bank_code: string; bank_name: string; account_number: string; account_holder: string },
): Promise<{ success: boolean; id?: number; error?: string }> {
  const bankCode = (data.bank_code || "").trim();
  const bankName = (data.bank_name || "").trim();
  const accountNumber = (data.account_number || "").trim();
  const accountHolder = (data.account_holder || "").trim();

  if (!bankCode || !bankName) return { success: false, error: "Vui lòng chọn ngân hàng" };
  if (!/^\d{6,20}$/.test(accountNumber)) {
    return { success: false, error: "Số tài khoản phải là 6–20 chữ số" };
  }
  if (accountHolder.length < 2 || accountHolder.length > 100) {
    return { success: false, error: "Tên chủ tài khoản không hợp lệ" };
  }

  const database = await getDb();
  const count = await database.get(
    "SELECT COUNT(*) AS c FROM bank_accounts WHERE user_id = ?",
    [userId],
  );
  const isDefault = Number(count?.c ?? 0) === 0 ? 1 : 0;

  const result = await database.run(
    "INSERT INTO bank_accounts (user_id, bank_code, bank_name, account_number, account_holder, is_default) VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
    [userId, bankCode, bankName, accountNumber, accountHolder, isDefault],
  );
  return { success: true, id: result.lastInsertRowid };
}

export async function deleteBankAccount(
  userId: number,
  bankId: number,
): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const row = await database.get(
    "SELECT id FROM bank_accounts WHERE id = ? AND user_id = ?",
    [bankId, userId],
  );
  if (!row) return { success: false, error: "Tài khoản ngân hàng không tồn tại" };

  await database.run("DELETE FROM bank_accounts WHERE id = ? AND user_id = ?", [bankId, userId]);
  return { success: true };
}

export async function setDefaultBankAccount(
  userId: number,
  bankId: number,
): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const row = await database.get(
    "SELECT id FROM bank_accounts WHERE id = ? AND user_id = ?",
    [bankId, userId],
  );
  if (!row) return { success: false, error: "Tài khoản ngân hàng không tồn tại" };

  await database.run("UPDATE bank_accounts SET is_default = 0 WHERE user_id = ?", [userId]);
  await database.run(
    "UPDATE bank_accounts SET is_default = 1 WHERE id = ? AND user_id = ?",
    [bankId, userId],
  );
  return { success: true };
}

export async function setWithdrawPin(
  userId: number,
  pin: string,
): Promise<{ success: boolean; error?: string }> {
  if (typeof pin !== "string" || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
    return { success: false, error: "Mật khẩu rút tiền phải là 4–6 chữ số" };
  }
  const database = await getDb();
  const encoded = await hashPasswordEncoded(pin);
  await database.run(
    "UPDATE users SET withdraw_pin_hash = ?, withdraw_pin_salt = ?, withdraw_pin_failed_count = 0, withdraw_pin_locked_until = NULL, updated_at = NOW() WHERE id = ?",
    [encoded, "", userId],
  );
  return { success: true };
}

export async function verifyWithdrawPin(
  userId: number,
  pin: string,
): Promise<{ valid: boolean; lockedUntil?: string; remaining?: number }> {
  const database = await getDb();
  const row = await database.get(
    "SELECT withdraw_pin_hash, withdraw_pin_salt, withdraw_pin_failed_count, withdraw_pin_locked_until FROM users WHERE id = ?",
    [userId],
  );
  if (!row || !row.withdraw_pin_hash) return { valid: false };

  const lockedUntilRaw = row.withdraw_pin_locked_until as Date | string | null;
  if (lockedUntilRaw) {
    const lockedUntil = new Date(lockedUntilRaw);
    if (lockedUntil > new Date()) {
      return { valid: false, lockedUntil: lockedUntil.toISOString() };
    }
    await database.run(
      "UPDATE users SET withdraw_pin_failed_count = 0, withdraw_pin_locked_until = NULL WHERE id = ?",
      [userId],
    );
  }

  const stored = row.withdraw_pin_hash as string;
  const legacySalt = row.withdraw_pin_salt as string | null;
  const result = await verifyPassword(pin, stored, legacySalt);

  if (result.valid) {
    if (result.needsUpgrade) {
      const upgraded = await hashPasswordEncoded(pin);
      await database.run(
        "UPDATE users SET withdraw_pin_hash = ?, withdraw_pin_salt = ?, withdraw_pin_failed_count = 0, withdraw_pin_locked_until = NULL, updated_at = NOW() WHERE id = ?",
        [upgraded, "", userId],
      );
    } else {
      await database.run(
        "UPDATE users SET withdraw_pin_failed_count = 0, withdraw_pin_locked_until = NULL WHERE id = ?",
        [userId],
      );
    }
    return { valid: true };
  }

  const failed = (Number(row.withdraw_pin_failed_count) || 0) + 1;
  const MAX_ATTEMPTS = 5;
  const LOCK_MS = 15 * 60 * 1000;
  if (failed >= MAX_ATTEMPTS) {
    const lockedUntilIso = new Date(Date.now() + LOCK_MS).toISOString();
    await database.run(
      "UPDATE users SET withdraw_pin_failed_count = ?, withdraw_pin_locked_until = ? WHERE id = ?",
      [failed, lockedUntilIso, userId],
    );
    return { valid: false, lockedUntil: lockedUntilIso, remaining: 0 };
  }
  await database.run("UPDATE users SET withdraw_pin_failed_count = ? WHERE id = ?", [failed, userId]);
  return { valid: false, remaining: MAX_ATTEMPTS - failed };
}

export async function createWithdrawRequest(
  userId: number,
  bankAccountId: number,
  amount: number,
  pin: string,
): Promise<{ success: boolean; error?: string }> {
  if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: "Số tiền không hợp lệ" };
  amount = Math.floor(amount);

  const database = await getDb();

  const userRow = await database.get("SELECT withdraw_pin_hash FROM users WHERE id = ?", [userId]);
  if (!userRow?.withdraw_pin_hash) {
    return { success: false, error: "Vui lòng cài đặt mật khẩu rút tiền trước" };
  }

  const pinResult = await verifyWithdrawPin(userId, pin);
  if (!pinResult.valid) {
    if (pinResult.lockedUntil) {
      const minutes = Math.max(
        1,
        Math.ceil((new Date(pinResult.lockedUntil).getTime() - Date.now()) / 60000),
      );
      return {
        success: false,
        error: `Mật khẩu rút tiền bị khoá tạm thời. Thử lại sau ~${minutes} phút.`,
      };
    }
    if (pinResult.remaining !== undefined) {
      return { success: false, error: `Mật khẩu rút tiền không đúng (còn ${pinResult.remaining} lần thử)` };
    }
    return { success: false, error: "Mật khẩu rút tiền không đúng" };
  }

  const bank = await database.get(
    "SELECT id FROM bank_accounts WHERE id = ? AND user_id = ?",
    [bankAccountId, userId],
  );
  if (!bank) return { success: false, error: "Tài khoản ngân hàng không hợp lệ" };

  const walletRow = await database.get(
    "SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE -amount END), 0) AS balance FROM wallet WHERE user_id = ?",
    [userId],
  );
  const balance = Number(walletRow?.balance ?? 0);
  if (amount > balance) return { success: false, error: "Số dư không đủ" };

  await database.transaction(async (tx) => {
    await tx.run(
      "INSERT INTO withdrawals (user_id, bank_account_id, amount) VALUES (?, ?, ?)",
      [userId, bankAccountId, amount],
    );
    await tx.run(
      "INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)",
      [userId, "Rút tiền", amount, "debit"],
    );
  });
  return { success: true };
}


/* ─────────────── Wallet helpers (admin manual adjust) ─────────────── */

export async function resetWallet(username: string): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const user = await database.get("SELECT id FROM users WHERE LOWER(username) = LOWER(?)", [username]);
  if (!user) return { success: false, error: "Không tìm thấy người dùng" };
  await database.run("DELETE FROM wallet WHERE user_id = ?", [Number(user.id)]);
  return { success: true };
}

export async function getWalletBalance(
  username: string,
): Promise<{ success: boolean; balance?: number; error?: string }> {
  const database = await getDb();
  const user = await database.get("SELECT id FROM users WHERE LOWER(username) = LOWER(?)", [username]);
  if (!user) return { success: false, error: "Không tìm thấy người dùng" };
  const row = await database.get(
    "SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE -amount END), 0) AS balance FROM wallet WHERE user_id = ?",
    [Number(user.id)],
  );
  return { success: true, balance: Number(row?.balance ?? 0) };
}

export async function addBalance(
  username: string,
  amount: number,
  label: string = "Biến động số dư",
): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const user = await database.get("SELECT id FROM users WHERE LOWER(username) = LOWER(?)", [username]);
  if (!user) return { success: false, error: "Không tìm thấy người dùng" };
  await database.run(
    "INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)",
    [Number(user.id), label, amount, "credit"],
  );
  return { success: true };
}

export async function subtractBalance(
  username: string,
  amount: number,
  label: string = "Biến động số dư",
): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const user = await database.get("SELECT id FROM users WHERE LOWER(username) = LOWER(?)", [username]);
  if (!user) return { success: false, error: "Không tìm thấy người dùng" };

  const row = await database.get(
    "SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE -amount END), 0) AS balance FROM wallet WHERE user_id = ?",
    [Number(user.id)],
  );
  const balance = Number(row?.balance ?? 0);
  if (amount > balance) return { success: false, error: "Số dư không đủ" };

  await database.run(
    "INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)",
    [Number(user.id), label, amount, "debit"],
  );
  return { success: true };
}

/* ─────────────── Notifications ─────────────── */

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: number;
  created_at: string;
}

export async function createNotification(
  userId: number,
  title: string,
  message: string,
  type: string = "info",
): Promise<void> {
  const database = await getDb();
  await database.run(
    "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
    [userId, title, message, type],
  );
}

export async function getUserNotifications(userId: number, limit: number = 30): Promise<Notification[]> {
  const database = await getDb();
  const rows = await database.all(
    "SELECT id, title, message, type, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
    [userId, limit],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    title: r.title as string,
    message: r.message as string,
    type: r.type as string,
    is_read: Number(r.is_read),
    created_at: toIso(r.created_at),
  }));
}

export async function getUnreadCount(userId: number): Promise<number> {
  const database = await getDb();
  const row = await database.get(
    "SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0",
    [userId],
  );
  return Number(row?.c ?? 0);
}

export async function markNotificationsRead(userId: number): Promise<void> {
  const database = await getDb();
  await database.run(
    "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
    [userId],
  );
}

export async function markOneNotificationRead(userId: number, notifId: number): Promise<void> {
  const database = await getDb();
  await database.run(
    "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
    [notifId, userId],
  );
}

export async function deleteNotification(
  userId: number,
  notifId: number,
): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const row = await database.get(
    "SELECT id FROM notifications WHERE id = ? AND user_id = ?",
    [notifId, userId],
  );
  if (!row) return { success: false, error: "Thông báo không tồn tại" };
  await database.run("DELETE FROM notifications WHERE id = ?", [notifId]);
  return { success: true };
}

/* ─────────────── Password reset ─────────────── */

export async function createPasswordResetToken(
  email: string,
): Promise<{ success: boolean; token?: string; userId?: number; username?: string; error?: string }> {
  const database = await getDb();
  const user = await database.get(
    "SELECT id, username, is_active FROM users WHERE LOWER(email) = LOWER(?)",
    [email],
  );
  if (!user) return { success: false, error: "Email không hợp lệ" };
  if (Number(user.is_active) === 0) return { success: false, error: "Email không hợp lệ" };

  await database.run(
    "UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0",
    [Number(user.id)],
  );

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  await database.run(
    "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
    [Number(user.id), tokenHash, expiresAt],
  );

  return { success: true, token, userId: Number(user.id), username: user.username as string };
}

export async function verifyResetToken(token: string): Promise<{ valid: boolean; userId?: number }> {
  const database = await getDb();
  const tokenHash = hashToken(token);
  const row = await database.get(
    "SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token = ?",
    [tokenHash],
  );
  if (!row) return { valid: false };
  if (Number(row.used) === 1) return { valid: false };
  if (new Date(row.expires_at as Date | string) < new Date()) return { valid: false };
  return { valid: true, userId: Number(row.user_id) };
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const tokenHash = hashToken(token);
  const row = await database.get(
    "SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token = ?",
    [tokenHash],
  );
  if (!row) return { success: false, error: "Link đặt lại mật khẩu không hợp lệ" };
  if (Number(row.used) === 1) return { success: false, error: "Link đã được sử dụng" };
  if (new Date(row.expires_at as Date | string) < new Date()) {
    return { success: false, error: "Link đã hết hạn (30 phút)" };
  }

  const passwordHash = await hashPasswordEncoded(newPassword);

  await database.transaction(async (tx) => {
    await tx.run(
      "UPDATE users SET password_hash = ?, salt = ?, login_failed_count = 0, login_locked_until = NULL, updated_at = NOW() WHERE id = ?",
      [passwordHash, "", Number(row.user_id)],
    );
    await tx.run("UPDATE password_reset_tokens SET used = 1 WHERE token = ?", [tokenHash]);
    await tx.run("DELETE FROM sessions WHERE user_id = ?", [Number(row.user_id)]);
  });

  return { success: true };
}

/* ─────────────── ADMIN: timeseries + stats ─────────────── */

export interface AdminTimeseriesPoint {
  date: string;
  orders: number;
  cashback: number;
  revenue: number;
}

export async function getAdminTimeseries(days: number = 7): Promise<AdminTimeseriesPoint[]> {
  const database = await getDb();
  const safeDays = Math.min(Math.max(days, 1), 90);
  const rows = await database.all(
    `SELECT
      to_char(created_at::date, 'YYYY-MM-DD') AS day,
      COUNT(*) AS orders,
      COALESCE(SUM(cashback), 0) AS cashback,
      COALESCE(SUM(amount), 0) AS revenue
     FROM orders
     WHERE created_at::date >= (NOW() - ($1 || ' days')::interval)::date
     GROUP BY day
     ORDER BY day ASC`,
    [safeDays - 1],
  );

  const map = new Map<string, AdminTimeseriesPoint>();
  for (const r of rows) {
    map.set(r.day as string, {
      date: r.day as string,
      orders: Number(r.orders) || 0,
      cashback: Number(r.cashback) || 0,
      revenue: Number(r.revenue) || 0,
    });
  }

  const out: AdminTimeseriesPoint[] = [];
  const now = new Date();
  for (let i = safeDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    out.push(map.get(iso) ?? { date: iso, orders: 0, cashback: 0, revenue: 0 });
  }
  return out;
}

export async function getAdminStats(): Promise<Record<string, unknown>> {
  const database = await getDb();
  const row = await database.get(
    `SELECT
      COALESCE((SELECT COUNT(*) FROM users WHERE role = 'user'), 0) AS total_users,
      COALESCE((SELECT COUNT(*) FROM orders), 0) AS total_orders,
      COALESCE((SELECT SUM(cashback) FROM orders), 0) AS total_cashback,
      COALESCE((SELECT COUNT(*) FROM withdrawals WHERE status = 'pending'), 0) AS pending_withdrawals,
      COALESCE((SELECT SUM(amount) FROM withdrawals WHERE status = 'approved'), 0) AS total_withdrawn`,
    [],
  );
  return {
    totalUsers: Number(row?.total_users ?? 0),
    totalOrders: Number(row?.total_orders ?? 0),
    totalCashback: Number(row?.total_cashback ?? 0),
    pendingWithdrawals: Number(row?.pending_withdrawals ?? 0),
    totalWithdrawn: Number(row?.total_withdrawn ?? 0),
  };
}

export async function getAllUsers(): Promise<Record<string, unknown>[]> {
  const database = await getDb();
  return await database.all(
    "SELECT id, username, email, display_name, phone, role, is_active, email_verified, created_at, last_login FROM users ORDER BY id DESC",
  );
}

/* ─────────────── ADMIN: ANALYTICS (Group 3 #9) ─────────────── */

export interface FunnelData {
  totalUsers: number;
  usersWithLink: number;
  usersWithOrder: number;
  usersWithCompletedOrder: number;
  totalLinks: number;
  totalOrders: number;
  completedOrders: number;
  /** Conversion: tỷ lệ user có order / user có link */
  linkToOrderRate: number;
  /** Conversion: tỷ lệ order completed / order tổng */
  orderToCompletedRate: number;
}

/**
 * Funnel conversion từ user → click (link) → order → completed order.
 * Đếm DISTINCT user_id để tránh trùng lặp.
 */
export async function getFunnelData(): Promise<FunnelData> {
  const database = await getDb();
  const row = await database.get(
    `SELECT
      COALESCE((SELECT COUNT(*) FROM users WHERE role = 'user'), 0) AS total_users,
      COALESCE((SELECT COUNT(DISTINCT user_id) FROM affiliate_links), 0) AS users_with_link,
      COALESCE((SELECT COUNT(DISTINCT user_id) FROM orders), 0) AS users_with_order,
      COALESCE((SELECT COUNT(DISTINCT user_id) FROM orders WHERE status = 'Đã hoàn tiền'), 0) AS users_with_completed,
      COALESCE((SELECT COUNT(*) FROM affiliate_links), 0) AS total_links,
      COALESCE((SELECT COUNT(*) FROM orders), 0) AS total_orders,
      COALESCE((SELECT COUNT(*) FROM orders WHERE status = 'Đã hoàn tiền'), 0) AS completed_orders`,
    [],
  );
  const usersWithLink = Number(row?.users_with_link ?? 0);
  const usersWithOrder = Number(row?.users_with_order ?? 0);
  const totalOrders = Number(row?.total_orders ?? 0);
  const completedOrders = Number(row?.completed_orders ?? 0);
  return {
    totalUsers: Number(row?.total_users ?? 0),
    usersWithLink,
    usersWithOrder,
    usersWithCompletedOrder: Number(row?.users_with_completed ?? 0),
    totalLinks: Number(row?.total_links ?? 0),
    totalOrders,
    completedOrders,
    linkToOrderRate: usersWithLink > 0 ? Math.round((usersWithOrder / usersWithLink) * 1000) / 10 : 0,
    orderToCompletedRate: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 1000) / 10 : 0,
  };
}

export interface HourlyHeatmapPoint {
  /** 0 = CN, 1 = T2 ... 6 = T7 */
  dayOfWeek: number;
  /** 0..23 */
  hour: number;
  count: number;
}

/**
 * Heatmap đơn hàng theo (dayOfWeek × hour).
 * Lấy từ `orders` trong N ngày gần nhất (mặc định 30).
 */
export async function getHourlyHeatmap(days: number = 30): Promise<HourlyHeatmapPoint[]> {
  const database = await getDb();
  const safeDays = Math.min(Math.max(days, 1), 365);
  const rows = await database.all(
    `SELECT
       EXTRACT(DOW FROM created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS dow,
       EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS hr,
       COUNT(*) AS c
     FROM orders
     WHERE created_at >= NOW() - ($1 || ' days')::interval
     GROUP BY dow, hr`,
    [String(safeDays)],
  );
  // Fill 7×24 zero matrix
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(`${r.dow}-${r.hr}`, Number(r.c) || 0);
  }
  const out: HourlyHeatmapPoint[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      out.push({ dayOfWeek: d, hour: h, count: map.get(`${d}-${h}`) ?? 0 });
    }
  }
  return out;
}

export interface TopProduct {
  itemId: string;
  shopId: string;
  productName: string;
  totalSold: number;
  totalRevenue: number;
  totalCommission: number;
}

/**
 * Top sản phẩm bán nhiều nhất — match qua `affiliate_links` (item_id).
 * Vì `orders` không có item_id trực tiếp, ta join qua user_id + thời gian gần
 * nhau (nếu có cấu trúc đó). Hiện tại đơn giản: lấy top theo `affiliate_links`
 * có nhiều click/order nhất → fallback lấy từ affiliate_links có cashback > 0.
 */
export async function getTopProducts(limit: number = 10): Promise<TopProduct[]> {
  const database = await getDb();
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  // Group affiliate_links theo (shop_id, item_id) — đếm số user đã tạo link
  // và tổng commission. Đây là proxy cho "sản phẩm phổ biến".
  const rows = await database.all(
    `SELECT
        item_id,
        shop_id,
        MAX(product_name) AS product_name,
        COUNT(*) AS total_sold,
        COALESCE(SUM(product_price), 0) AS total_revenue,
        COALESCE(SUM(commission), 0) AS total_commission
     FROM affiliate_links
     GROUP BY item_id, shop_id
     ORDER BY total_sold DESC, total_commission DESC
     LIMIT ?`,
    [safeLimit],
  );
  return rows.map((r) => ({
    itemId: String(r.item_id ?? ""),
    shopId: String(r.shop_id ?? ""),
    productName: String(r.product_name ?? "—"),
    totalSold: Number(r.total_sold ?? 0),
    totalRevenue: Number(r.total_revenue ?? 0),
    totalCommission: Number(r.total_commission ?? 0),
  }));
}

export interface CohortRow {
  /** ISO yyyy-mm */
  cohortMonth: string;
  /** Tổng user đăng ký trong tháng đó */
  totalUsers: number;
  /** mảng tỉ lệ retention từ tháng 0..N (0 = tháng đăng ký, 1 = tháng sau...) */
  retention: number[];
}

/**
 * Cohort retention: nhóm user theo tháng đăng ký, đo % user còn active trong N
 * tháng tiếp theo (active = có session hoặc order trong tháng đó).
 *
 * Trả về mảng cohort, mỗi cohort kèm mảng retention[i] = % user còn active ở tháng thứ i.
 */
export async function getCohortRetention(monthsBack: number = 6): Promise<CohortRow[]> {
  const database = await getDb();
  const safeMonths = Math.min(Math.max(monthsBack, 1), 24);

  // 1) Lấy users theo cohort tháng đăng ký
  const cohortUsers = await database.all(
    `SELECT
        to_char(date_trunc('month', created_at), 'YYYY-MM') AS cohort_month,
        id AS user_id
     FROM users
     WHERE role = 'user'
       AND created_at >= date_trunc('month', NOW() - ($1 || ' months')::interval)
     ORDER BY created_at`,
    [String(safeMonths)],
  );

  // 2) Lấy active months (user có order trong tháng nào)
  const activity = await database.all(
    `SELECT
        user_id,
        to_char(date_trunc('month', created_at), 'YYYY-MM') AS active_month
     FROM orders
     WHERE created_at >= date_trunc('month', NOW() - ($1 || ' months')::interval)
     GROUP BY user_id, active_month
     UNION
     SELECT
        user_id,
        to_char(date_trunc('month', created_at), 'YYYY-MM') AS active_month
     FROM sessions
     WHERE created_at >= date_trunc('month', NOW() - ($1 || ' months')::interval)
     GROUP BY user_id, active_month`,
    [String(safeMonths)],
  );

  // Build map: user_id → set of active_months
  const userActivity = new Map<number, Set<string>>();
  for (const a of activity) {
    const uid = Number(a.user_id);
    if (!userActivity.has(uid)) userActivity.set(uid, new Set());
    userActivity.get(uid)!.add(String(a.active_month));
  }

  // Build cohorts: cohort_month → user_ids
  const cohortMap = new Map<string, number[]>();
  for (const c of cohortUsers) {
    const m = String(c.cohort_month);
    if (!cohortMap.has(m)) cohortMap.set(m, []);
    cohortMap.get(m)!.push(Number(c.user_id));
  }

  // Tính retention cho mỗi cohort
  const sortedCohorts = Array.from(cohortMap.keys()).sort();
  const result: CohortRow[] = [];
  const now = new Date();
  for (const cohort of sortedCohorts) {
    const userIds = cohortMap.get(cohort)!;
    const total = userIds.length;
    if (total === 0) continue;
    const [yStr, mStr] = cohort.split("-");
    const cohortDate = new Date(Number(yStr), Number(mStr) - 1, 1);
    const monthsSince = (now.getFullYear() - cohortDate.getFullYear()) * 12 + (now.getMonth() - cohortDate.getMonth());
    const retention: number[] = [];
    for (let i = 0; i <= monthsSince && i < safeMonths; i++) {
      const targetDate = new Date(cohortDate.getFullYear(), cohortDate.getMonth() + i, 1);
      const targetMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`;
      const activeCount = userIds.filter((uid) => userActivity.get(uid)?.has(targetMonth)).length;
      retention.push(Math.round((activeCount / total) * 1000) / 10);
    }
    result.push({ cohortMonth: cohort, totalUsers: total, retention });
  }
  return result;
}

/* ─────────────── ADMIN: paged lists ─────────────── */

export interface PagedResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserListFilter {
  search?: string;
  role?: "admin" | "user" | "all";
  status?: "active" | "blocked" | "unverified" | "all";
  page?: number;
  pageSize?: number;
}

export async function getAllUsersPaged(
  filter: UserListFilter = {},
): Promise<PagedResult<Record<string, unknown>>> {
  const database = await getDb();
  const page = Math.max(1, Math.floor(filter.page || 1));
  const pageSize = Math.min(100, Math.max(10, Math.floor(filter.pageSize || 20)));
  const offset = (page - 1) * pageSize;

  const where: string[] = [];
  const params: SqlValue[] = [];
  if (filter.search && filter.search.trim()) {
    const q = `%${filter.search.trim().toLowerCase()}%`;
    where.push("(LOWER(username) LIKE ? OR LOWER(email) LIKE ? OR LOWER(COALESCE(display_name,'')) LIKE ?)");
    params.push(q, q, q);
  }
  if (filter.role === "admin" || filter.role === "user") {
    where.push("role = ?"); params.push(filter.role);
  }
  if (filter.status === "active") where.push("is_active = 1 AND email_verified = 1");
  else if (filter.status === "blocked") where.push("is_active = 0");
  else if (filter.status === "unverified") where.push("email_verified = 0");

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const totalRow = await database.get(`SELECT COUNT(*) AS c FROM users ${whereSql}`, params);
  const total = Number(totalRow?.c ?? 0);
  const rows = await database.all(
    `SELECT id, username, email, display_name, phone, role, is_active, email_verified, created_at, last_login
     FROM users ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return { rows, total, page, pageSize };
}

export interface OrderListFilter {
  search?: string;
  status?: "Đã hoàn tiền" | "Đang xử lý" | "Chờ xác nhận" | "Đã hủy" | "all";
  store?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export async function getAllOrdersPaged(
  filter: OrderListFilter = {},
): Promise<PagedResult<Record<string, unknown>>> {
  const database = await getDb();
  const page = Math.max(1, Math.floor(filter.page || 1));
  const pageSize = Math.min(100, Math.max(10, Math.floor(filter.pageSize || 20)));
  const offset = (page - 1) * pageSize;

  const where: string[] = [];
  const params: SqlValue[] = [];
  if (filter.search && filter.search.trim()) {
    const q = `%${filter.search.trim().toLowerCase()}%`;
    where.push("(LOWER(o.order_code) LIKE ? OR LOWER(u.username) LIKE ? OR LOWER(COALESCE(u.display_name,'')) LIKE ?)");
    params.push(q, q, q);
  }
  if (filter.status && filter.status !== "all") { where.push("o.status = ?"); params.push(filter.status); }
  if (filter.store && filter.store.trim()) { where.push("o.store = ?"); params.push(filter.store.trim()); }
  if (filter.fromDate) { where.push("o.created_at::date >= ?::date"); params.push(filter.fromDate); }
  if (filter.toDate) { where.push("o.created_at::date <= ?::date"); params.push(filter.toDate); }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const totalRow = await database.get(
    `SELECT COUNT(*) AS c FROM orders o LEFT JOIN users u ON o.user_id = u.id ${whereSql}`,
    params,
  );
  const total = Number(totalRow?.c ?? 0);
  const rows = await database.all(
    `SELECT o.*, u.username, u.display_name
     FROM orders o LEFT JOIN users u ON o.user_id = u.id
     ${whereSql} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return { rows, total, page, pageSize };
}

export interface WithdrawalListFilter {
  search?: string;
  status?: "pending" | "approved" | "rejected" | "all";
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export async function getAllWithdrawalsPaged(
  filter: WithdrawalListFilter = {},
): Promise<PagedResult<Record<string, unknown>>> {
  const database = await getDb();
  const page = Math.max(1, Math.floor(filter.page || 1));
  const pageSize = Math.min(100, Math.max(10, Math.floor(filter.pageSize || 20)));
  const offset = (page - 1) * pageSize;

  const where: string[] = [];
  const params: SqlValue[] = [];
  if (filter.search && filter.search.trim()) {
    const q = `%${filter.search.trim().toLowerCase()}%`;
    where.push("(LOWER(u.username) LIKE ? OR LOWER(COALESCE(u.display_name,'')) LIKE ? OR LOWER(COALESCE(b.account_number,'')) LIKE ?)");
    params.push(q, q, q);
  }
  if (filter.status && filter.status !== "all") { where.push("w.status = ?"); params.push(filter.status); }
  if (filter.fromDate) { where.push("w.created_at::date >= ?::date"); params.push(filter.fromDate); }
  if (filter.toDate) { where.push("w.created_at::date <= ?::date"); params.push(filter.toDate); }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const totalRow = await database.get(
    `SELECT COUNT(*) AS c FROM withdrawals w
     LEFT JOIN users u ON w.user_id = u.id
     LEFT JOIN bank_accounts b ON w.bank_account_id = b.id
     ${whereSql}`,
    params,
  );
  const total = Number(totalRow?.c ?? 0);
  const rows = await database.all(
    `SELECT w.*, u.username, u.display_name, b.bank_name, b.account_number, b.account_holder
     FROM withdrawals w
     LEFT JOIN users u ON w.user_id = u.id
     LEFT JOIN bank_accounts b ON w.bank_account_id = b.id
     ${whereSql} ORDER BY w.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return { rows, total, page, pageSize };
}

export async function getAllOrders(): Promise<Record<string, unknown>[]> {
  const database = await getDb();
  return await database.all(`
    SELECT o.*, u.username, u.display_name
    FROM orders o LEFT JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
  `);
}

export async function getAllWithdrawals(): Promise<Record<string, unknown>[]> {
  const database = await getDb();
  return await database.all(`
    SELECT w.*, u.username, u.display_name, b.bank_name, b.account_number, b.account_holder
    FROM withdrawals w
    LEFT JOIN users u ON w.user_id = u.id
    LEFT JOIN bank_accounts b ON w.bank_account_id = b.id
    ORDER BY w.created_at DESC
  `);
}

export async function updateWithdrawalStatus(
  withdrawalId: number,
  status: string,
  adminNote?: string | null,
): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const row = await database.get(
    "SELECT id, user_id, amount, status FROM withdrawals WHERE id = ?",
    [withdrawalId],
  );
  if (!row) return { success: false, error: "Yêu cầu rút tiền không tồn tại" };
  if ((row.status as string) !== "pending") return { success: false, error: "Yêu cầu đã được xử lý" };

  const note = (adminNote ?? "").toString().trim().slice(0, 500) || null;

  await database.transaction(async (tx) => {
    await tx.run(
      "UPDATE withdrawals SET status = ?, admin_note = ?, updated_at = NOW() WHERE id = ?",
      [status, note, withdrawalId],
    );

    const userId = Number(row.user_id);
    const amount = Number(row.amount);
    if (status === "rejected") {
      await tx.run(
        "INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)",
        [userId, "Hoàn tiền rút bị từ chối", amount, "credit"],
      );
      const msg = note
        ? `Yêu cầu rút ${amount.toLocaleString("vi-VN")}đ bị từ chối. Lý do: ${note}. Số tiền đã hoàn lại ví.`
        : `Yêu cầu rút ${amount.toLocaleString("vi-VN")}đ bị từ chối. Số tiền đã hoàn lại ví.`;
      await tx.run(
        "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
        [userId, "Rút tiền bị từ chối", msg, "withdrawal"],
      );
    } else if (status === "approved") {
      await tx.run(
        "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
        [
          userId,
          "Rút tiền đã duyệt",
          `Yêu cầu rút ${amount.toLocaleString("vi-VN")}đ đã được duyệt và đang chuyển khoản.`,
          "withdrawal",
        ],
      );
    }
  });

  return { success: true };
}

export async function adminCreateOrder(
  userId: number,
  orderCode: string,
  store: string,
  amount: number,
  cashback: number,
  status: string,
): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const user = await database.get("SELECT id FROM users WHERE id = ?", [userId]);
  if (!user) return { success: false, error: "User không tồn tại" };

  await database.run(
    "INSERT INTO orders (user_id, order_code, store, amount, cashback, status) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, orderCode, store, amount, cashback, status],
  );

  if (status === "Đã hoàn tiền") {
    await database.run(
      "INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)",
      [userId, "Hoàn tiền đơn hàng", cashback, "credit"],
    );
    await markRefereeActive(userId);
  }

  return { success: true };
}

export async function toggleUserActive(
  userId: number,
  currentAdminId?: number,
): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const user = await database.get(
    "SELECT id, is_active, role FROM users WHERE id = ?",
    [userId],
  );
  if (!user) return { success: false, error: "Không tìm thấy người dùng" };

  if (currentAdminId !== undefined && Number(user.id) === currentAdminId) {
    return { success: false, error: "Bạn không thể khoá chính mình" };
  }
  if ((user.role as string) === "admin") {
    return { success: false, error: "Không thể khoá tài khoản admin" };
  }

  const newStatus = Number(user.is_active) === 1 ? 0 : 1;
  await database.run("UPDATE users SET is_active = ? WHERE id = ?", [newStatus, userId]);
  if (newStatus === 0) {
    await database.run("DELETE FROM sessions WHERE user_id = ?", [userId]);
  }
  return { success: true };
}

export async function setUserRole(
  userId: number,
  newRole: "admin" | "user",
  currentAdminId?: number,
): Promise<{ success: boolean; error?: string }> {
  if (newRole !== "admin" && newRole !== "user") {
    return { success: false, error: "Role không hợp lệ" };
  }
  const database = await getDb();
  const user = await database.get(
    "SELECT id, role, email_verified, is_active FROM users WHERE id = ?",
    [userId],
  );
  if (!user) return { success: false, error: "Không tìm thấy người dùng" };

  if (currentAdminId !== undefined && Number(user.id) === currentAdminId) {
    return { success: false, error: "Bạn không thể đổi role của chính mình" };
  }

  const currentRole = (user.role as string) || "user";
  if (currentRole === newRole) return { success: false, error: "Người dùng đã có role này" };

  if (newRole === "admin") {
    if (Number(user.is_active) === 0) {
      return { success: false, error: "Không thể cấp quyền admin cho tài khoản đang bị khoá" };
    }
    if (Number(user.email_verified) === 0) {
      return { success: false, error: "Người dùng cần xác thực email trước khi được cấp quyền admin" };
    }
  } else {
    const adminCountRow = await database.get(
      "SELECT COUNT(*) AS c FROM users WHERE role = 'admin'",
      [],
    );
    if (Number(adminCountRow?.c ?? 0) <= 1) {
      return { success: false, error: "Không thể hạ cấp admin cuối cùng" };
    }
  }

  await database.run(
    "UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?",
    [newRole, userId],
  );
  if (newRole === "user") {
    await database.run("DELETE FROM sessions WHERE user_id = ?", [userId]);
  }
  return { success: true };
}


/* ─────────────── Import orders ─────────────── */

export interface ImportOrderItem {
  orderCode: string;
  shopId: string;
  itemId: string;
  productName: string;
  amount: number;
  commission: number;
  status: string;
  subId?: string;
}

export interface ImportResult {
  total: number;
  matched: number;
  unmatched: number;
  duplicated: number;
  updated: number;
  results: {
    orderCode: string;
    itemId: string;
    userId?: number;
    username?: string;
    status: string;
    message: string;
  }[];
}

export async function importOrders(items: ImportOrderItem[]): Promise<ImportResult> {
  const database = await getDb();
  const result: ImportResult = {
    total: items.length,
    matched: 0,
    unmatched: 0,
    duplicated: 0,
    updated: 0,
    results: [],
  };

  const statusRank: Record<string, number> = {
    "Đã hủy": 0,
    "Chờ xác nhận": 1,
    "Đang xử lý": 2,
    "Đã hoàn tiền": 3,
  };

  // Pre-load tier list 1 lần — tier system mới (Bronze/Silver/Gold/VIP).
  const { getTiers } = await import("@/lib/tier");
  const tierList = await getTiers();

  // Async cache rate per user — tính rate dựa trên tier (orders + referrals).
  // Cache trong batch tránh query lặp lại với cùng user.
  const rateCache = new Map<number, number>();
  async function getRate(tx: DbAdapter, userId: number): Promise<number> {
    const cached = rateCache.get(userId);
    if (cached !== undefined) return cached;
    const row = await tx.get(
      `SELECT
        COALESCE((SELECT COUNT(*) FROM orders WHERE user_id = $1 AND status = 'Đã hoàn tiền'), 0) AS orders_count,
        COALESCE((SELECT COUNT(*) FROM referrals WHERE referrer_user_id = $1 AND bonus_credited = 1), 0) AS referrals_count`,
      [userId],
    );
    const ordersCount = Number(row?.orders_count ?? 0);
    const referralsCount = Number(row?.referrals_count ?? 0);

    // Duyệt từ VIP xuống → tìm tier cao nhất user qualified.
    let rate = tierList[0].cashbackPercent; // Bronze fallback
    for (let i = tierList.length - 1; i >= 0; i--) {
      const t = tierList[i];
      if (ordersCount >= t.minOrders || referralsCount >= t.minReferrals) {
        rate = t.cashbackPercent;
        break;
      }
    }
    rateCache.set(userId, rate);
    return rate;
  }
  function invalidateRate(userId: number) { rateCache.delete(userId); }

  function mapStatus(shopeeStatus: string): string {
    const raw = (shopeeStatus || "").trim().replace(/\s+/g, " ");
    const s = raw.toUpperCase();
    if (
      s === "COMPLETED" || s === "HOÀN THÀNH" || s === "HOAN THANH" ||
      s === "PAID" || s === "ĐÃ THANH TOÁN" || s === "DA THANH TOAN"
    ) return "Đã hoàn tiền";
    if (
      s === "PENDING" || s === "PROCESSING" ||
      s === "ĐANG CHỜ XỬ LÝ" || s === "DANG CHO XU LY" ||
      s === "ĐANG XỬ LÝ" || s === "DANG XU LY" ||
      s === "ĐANG CHỜ" || s === "DANG CHO"
    ) return "Đang xử lý";
    if (
      s === "CANCELLED" || s === "CANCELED" ||
      s === "ĐÃ HỦY" || s === "ĐÃ HUỶ" || s === "DA HUY" ||
      s === "INVALID" || s === "VÔ HIỆU" || s === "VO HIEU"
    ) return "Đã hủy";
    if (s === "UNPAID" || s === "CHƯA THANH TOÁN" || s === "CHUA THANH TOAN") {
      return "Chờ xác nhận";
    }
    return "Chờ xác nhận";
  }

  await database.transaction(async (tx) => {
    for (const item of items) {
      const newStatus = mapStatus(item.status);

      const existingOrder = await tx.get(
        "SELECT id, user_id, status, cashback FROM orders WHERE order_code = ?",
        [item.orderCode],
      );

      if (existingOrder) {
        const oldStatus = existingOrder.status as string;
        const oldRank = statusRank[oldStatus] ?? 1;
        const newRank = statusRank[newStatus] ?? 1;

        if (newRank > oldRank) {
          const userId = Number(existingOrder.user_id);
          const oldCashback = Number(existingOrder.cashback);
          const ratePercent = await getRate(tx, userId);
          const cashback = Math.round((item.commission * ratePercent) / 100);

          await tx.run(
            "UPDATE orders SET status = ?, cashback = ? WHERE id = ?",
            [newStatus, cashback, Number(existingOrder.id)],
          );

          if (newStatus === "Đã hoàn tiền" && oldStatus !== "Đã hoàn tiền" && cashback > 0) {
            await tx.run(
              "INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)",
              [userId, `Hoàn tiền đơn ${item.orderCode}`, cashback, "credit"],
            );
            await tx.run(
              "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
              [
                userId,
                "Đơn hàng đã duyệt",
                `Đơn ${item.orderCode} đã hoàn thành! +${cashback.toLocaleString("vi-VN")}đ đã cộng vào ví.`,
                "order",
              ],
            );

            // Mark referrer active inline
            const refRow = await tx.get(
              "SELECT id, referrer_user_id, bonus_credited FROM referrals WHERE referee_user_id = ?",
              [userId],
            );
            if (refRow && Number(refRow.bonus_credited) === 0) {
              await tx.run(
                "UPDATE referrals SET bonus_credited = 1, bonus_credited_at = NOW() WHERE id = ?",
                [Number(refRow.id)],
              );
              const refUserId = Number(refRow.referrer_user_id);
              invalidateRate(refUserId);
              // Generic notification — tier system check riêng (gọi cuối transaction).
              await tx.run(
                "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
                [
                  refUserId,
                  "🤝 Bạn bè đã có đơn đầu tiên!",
                  `Bạn bè bạn giới thiệu đã có đơn hoàn tiền. Tiếp tục mời để lên tier cao hơn!`,
                  "referral",
                ],
              );
            }
          } else if (newStatus === "Đã hủy" && oldStatus === "Đã hoàn tiền" && oldCashback > 0) {
            await tx.run(
              "INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)",
              [userId, `Hủy đơn ${item.orderCode} - trừ hoàn tiền`, oldCashback, "debit"],
            );
            await tx.run(
              "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
              [
                userId,
                "Đơn hàng bị hủy",
                `Đơn ${item.orderCode} đã bị hủy. -${oldCashback.toLocaleString("vi-VN")}đ.`,
                "order",
              ],
            );
          }

          result.updated++;
          result.results.push({
            orderCode: item.orderCode,
            itemId: item.itemId,
            status: "updated",
            message: `Cập nhật: ${oldStatus} → ${newStatus}`,
          });
        } else {
          result.duplicated++;
          result.results.push({
            orderCode: item.orderCode,
            itemId: item.itemId,
            status: "skip",
            message: `Đã tồn tại (${oldStatus}), không cần cập nhật`,
          });
        }
        continue;
      }

      // New order
      let userId: number | null = null;
      let username = "";

      if (item.subId) {
        const uidMatch = item.subId.match(/uid[_-]?(\d+)/i);
        if (uidMatch) {
          const directUser = await tx.get(
            "SELECT id, username, display_name FROM users WHERE id = ?",
            [Number(uidMatch[1])],
          );
          if (directUser) {
            userId = Number(directUser.id);
            username = (directUser.display_name || directUser.username) as string;
          }
        }
      }

      if (!userId) {
        const link = await tx.get(
          `SELECT al.user_id, u.username, u.display_name
           FROM affiliate_links al
           LEFT JOIN users u ON al.user_id = u.id
           WHERE al.shop_id = ? AND al.item_id = ?
           ORDER BY al.created_at DESC
           LIMIT 1`,
          [item.shopId, item.itemId],
        );
        if (link) {
          userId = Number(link.user_id);
          username = (link.display_name || link.username) as string;
        }
      }

      if (!userId) {
        result.unmatched++;
        result.results.push({
          orderCode: item.orderCode,
          itemId: item.itemId,
          status: "unmatched",
          message: "Không tìm thấy user tạo link cho sản phẩm này",
        });
        continue;
      }

      const ratePercent = await getRate(tx, userId);
      const cashback = Math.round((item.commission * ratePercent) / 100);

      await tx.run(
        "INSERT INTO orders (user_id, order_code, store, amount, cashback, status) VALUES (?, ?, ?, ?, ?, ?)",
        [userId, item.orderCode, "Shopee", item.amount, cashback, newStatus],
      );

      if (newStatus === "Đã hoàn tiền" && cashback > 0) {
        await tx.run(
          "INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)",
          [userId, `Hoàn tiền đơn ${item.orderCode}`, cashback, "credit"],
        );

        const refRow = await tx.get(
          "SELECT id, referrer_user_id, bonus_credited FROM referrals WHERE referee_user_id = ?",
          [userId],
        );
        if (refRow && Number(refRow.bonus_credited) === 0) {
          await tx.run(
            "UPDATE referrals SET bonus_credited = 1, bonus_credited_at = NOW() WHERE id = ?",
            [Number(refRow.id)],
          );
          const refUserId = Number(refRow.referrer_user_id);
          invalidateRate(refUserId);
          // Generic notification — tier check riêng cuối transaction.
          await tx.run(
            "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
            [
              refUserId,
              "🤝 Bạn bè đã có đơn đầu tiên!",
              `Bạn bè bạn giới thiệu đã có đơn hoàn tiền. Tiếp tục mời để lên tier cao hơn!`,
              "referral",
            ],
          );
        }
      }

      await tx.run(
        "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
        [
          userId,
          "Đơn hàng mới",
          `Đơn ${item.orderCode} - ${item.productName}. Cashback: ${cashback.toLocaleString("vi-VN")}đ (${newStatus})`,
          "order",
        ],
      );

      result.matched++;
      result.results.push({
        orderCode: item.orderCode,
        itemId: item.itemId,
        userId,
        username,
        status: "ok",
        message: `Matched → ${username} (ID: ${userId}), cashback: ${cashback}đ (${ratePercent}%)`,
      });
    }
  });

  // Sau transaction → check tier-up cho mọi user bị ảnh hưởng (đã import đơn).
  // Chạy ngoài transaction vì checkAndNotifyTierUp tự dùng connection riêng.
  const affectedUsers = new Set<number>();
  for (const r of result.results) {
    if (r.userId) affectedUsers.add(r.userId);
  }
  // Fire-and-forget — không cần đợi để response import nhanh.
  void (async () => {
    try {
      const { checkAndNotifyTierUp } = await import("@/lib/tier");
      for (const uid of affectedUsers) {
        await checkAndNotifyTierUp(uid);
      }
    } catch (e) {
      console.warn("[importOrders] tier check failed:", e);
    }
  })();

  return result;
}

/* ─────────────── ADMIN: User detail / management ─────────────── */

export interface UserDetail {
  user: Record<string, unknown>;
  walletBalance: number;
  totalOrders: number;
  totalCashback: number;
  recentOrders: Record<string, unknown>[];
  recentWallet: Record<string, unknown>[];
  bankAccounts: Record<string, unknown>[];
  withdrawals: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
}

export async function getUserDetail(userId: number): Promise<UserDetail | null> {
  const database = await getDb();
  const user = await database.get(
    `SELECT id, username, email, display_name, phone, role, is_active, email_verified,
            created_at, updated_at, last_login,
            CASE WHEN withdraw_pin_hash IS NOT NULL THEN 1 ELSE 0 END AS has_withdraw_pin,
            COALESCE(totp_enabled, 0) AS totp_enabled
     FROM users WHERE id = ?`,
    [userId],
  );
  if (!user) return null;

  const stats = await database.get(
    `SELECT
      COALESCE((SELECT SUM(CASE WHEN type='credit' THEN amount ELSE -amount END) FROM wallet WHERE user_id = $1), 0) AS balance,
      COALESCE((SELECT COUNT(*) FROM orders WHERE user_id = $1), 0) AS total_orders,
      COALESCE((SELECT SUM(cashback) FROM orders WHERE user_id = $1 AND status = 'Đã hoàn tiền'), 0) AS total_cashback`,
    [userId],
  );
  const recentOrders = await database.all(
    "SELECT id, order_code, store, amount, cashback, status, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
    [userId],
  );
  const recentWallet = await database.all(
    "SELECT id, label, amount, type, created_at FROM wallet WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
    [userId],
  );
  const bankAccounts = await database.all(
    "SELECT id, bank_code, bank_name, account_number, account_holder, is_default, created_at FROM bank_accounts WHERE user_id = ? ORDER BY is_default DESC, created_at DESC",
    [userId],
  );
  const withdrawals = await database.all(
    `SELECT w.id, w.amount, w.status, w.admin_note, w.created_at,
            b.bank_name, b.account_number, b.account_holder
     FROM withdrawals w LEFT JOIN bank_accounts b ON w.bank_account_id = b.id
     WHERE w.user_id = ? ORDER BY w.created_at DESC LIMIT 20`,
    [userId],
  );
  const sessions = await database.all(
    "SELECT id, ip, user_agent, created_at, last_seen_at, expires_at FROM sessions WHERE user_id = ? AND expires_at > NOW() ORDER BY last_seen_at DESC, created_at DESC",
    [userId],
  );

  return {
    user,
    walletBalance: Number(stats?.balance ?? 0),
    totalOrders: Number(stats?.total_orders ?? 0),
    totalCashback: Number(stats?.total_cashback ?? 0),
    recentOrders,
    recentWallet,
    bankAccounts,
    withdrawals,
    sessions,
  };
}

export async function adminResetUserPassword(
  targetUserId: number,
  currentAdminId: number,
): Promise<{ success: boolean; tempPassword?: string; error?: string }> {
  if (targetUserId === currentAdminId) {
    return { success: false, error: "Hãy đổi mật khẩu của chính mình qua trang Bảo mật" };
  }
  const database = await getDb();
  const user = await database.get("SELECT id, role FROM users WHERE id = ?", [targetUserId]);
  if (!user) return { success: false, error: "Không tìm thấy người dùng" };
  if ((user.role as string) === "admin") {
    return { success: false, error: "Không thể reset mật khẩu của admin khác" };
  }
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = crypto.randomBytes(12);
  let tempPassword = "";
  for (let i = 0; i < buf.length; i++) tempPassword += alphabet[buf[i] % alphabet.length];

  const hash = await hashPasswordEncoded(tempPassword);
  await database.run(
    "UPDATE users SET password_hash = ?, salt = ?, updated_at = NOW() WHERE id = ?",
    [hash, "", targetUserId],
  );
  await database.run("DELETE FROM sessions WHERE user_id = ?", [targetUserId]);
  await database.run(
    "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
    [
      targetUserId,
      "Mật khẩu đã được đặt lại",
      "Quản trị viên đã đặt lại mật khẩu cho tài khoản của bạn. Vui lòng liên hệ admin để nhận mật khẩu tạm và đổi lại sau khi đăng nhập.",
      "security",
    ],
  );
  return { success: true, tempPassword };
}

export async function adminForceLogout(
  targetUserId: number,
  currentAdminId: number,
): Promise<{ success: boolean; error?: string; revoked?: number }> {
  if (targetUserId === currentAdminId) {
    return { success: false, error: "Không thể tự logout chính mình từ đây" };
  }
  const database = await getDb();
  const result = await database.run("DELETE FROM sessions WHERE user_id = ?", [targetUserId]);
  return { success: true, revoked: result.changes };
}

export async function adminMarkEmailVerified(
  targetUserId: number,
): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const user = await database.get(
    "SELECT id, email_verified FROM users WHERE id = ?",
    [targetUserId],
  );
  if (!user) return { success: false, error: "Không tìm thấy người dùng" };
  if (Number(user.email_verified) === 1) return { success: false, error: "Email đã được xác minh" };
  await database.run(
    "UPDATE users SET email_verified = 1, updated_at = NOW() WHERE id = ?",
    [targetUserId],
  );
  await database.run(
    "UPDATE email_verification_tokens SET used = 1 WHERE user_id = ? AND used = 0",
    [targetUserId],
  );
  await database.run(
    "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
    [
      targetUserId,
      "Email đã được xác minh",
      "Email tài khoản của bạn đã được quản trị viên xác minh thủ công. Bạn có thể đăng nhập bình thường.",
      "security",
    ],
  );
  return { success: true };
}

/* ─────────────── ADMIN: order edit/delete ─────────────── */

export interface AdminOrderUpdate {
  amount?: number;
  cashback?: number;
  status?: string;
  store?: string;
}

export async function adminUpdateOrder(
  orderId: number,
  update: AdminOrderUpdate,
): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const existing = await database.get(
    "SELECT id, user_id, order_code, amount, cashback, status FROM orders WHERE id = ?",
    [orderId],
  );
  if (!existing) return { success: false, error: "Đơn hàng không tồn tại" };

  const allowedStatus = new Set(["Đã hoàn tiền", "Đang xử lý", "Chờ xác nhận", "Đã hủy"]);
  if (update.status !== undefined && !allowedStatus.has(update.status)) {
    return { success: false, error: "Trạng thái không hợp lệ" };
  }
  if (update.amount !== undefined && (!Number.isFinite(update.amount) || update.amount < 0)) {
    return { success: false, error: "Giá trị không hợp lệ" };
  }
  if (update.cashback !== undefined && (!Number.isFinite(update.cashback) || update.cashback < 0)) {
    return { success: false, error: "Cashback không hợp lệ" };
  }

  const newAmount = update.amount !== undefined ? Math.floor(update.amount) : Number(existing.amount);
  const newCashback =
    update.cashback !== undefined ? Math.floor(update.cashback) : Number(existing.cashback);
  const newStatus = update.status ?? (existing.status as string);
  const newStore = update.store?.trim() || (existing.store as string);
  const userId = Number(existing.user_id);
  const oldStatus = existing.status as string;
  const oldCashback = Number(existing.cashback);
  const orderCode = existing.order_code as string;

  await database.transaction(async (tx) => {
    await tx.run(
      "UPDATE orders SET amount = ?, cashback = ?, status = ?, store = ? WHERE id = ?",
      [newAmount, newCashback, newStatus, newStore, orderId],
    );

    if (oldStatus !== "Đã hoàn tiền" && newStatus === "Đã hoàn tiền" && newCashback > 0) {
      await tx.run(
        "INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)",
        [userId, `Hoàn tiền đơn ${orderCode}`, newCashback, "credit"],
      );
      const refRow = await tx.get(
        "SELECT id, bonus_credited FROM referrals WHERE referee_user_id = ?",
        [userId],
      );
      if (refRow && Number(refRow.bonus_credited) === 0) {
        await tx.run(
          "UPDATE referrals SET bonus_credited = 1, bonus_credited_at = NOW() WHERE id = ?",
          [Number(refRow.id)],
        );
      }
    } else if (oldStatus === "Đã hoàn tiền" && newStatus !== "Đã hoàn tiền" && oldCashback > 0) {
      await tx.run(
        "INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)",
        [userId, `Điều chỉnh đơn ${orderCode} - thu hồi hoàn tiền`, oldCashback, "debit"],
      );
    } else if (oldStatus === "Đã hoàn tiền" && newStatus === "Đã hoàn tiền" && newCashback !== oldCashback) {
      const delta = newCashback - oldCashback;
      if (delta > 0) {
        await tx.run(
          "INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)",
          [
            userId,
            `Điều chỉnh đơn ${orderCode} +${delta.toLocaleString("vi-VN")}đ`,
            delta,
            "credit",
          ],
        );
      } else if (delta < 0) {
        await tx.run(
          "INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)",
          [
            userId,
            `Điều chỉnh đơn ${orderCode} ${delta.toLocaleString("vi-VN")}đ`,
            -delta,
            "debit",
          ],
        );
      }
    }
  });

  return { success: true };
}

export async function adminDeleteOrder(
  orderId: number,
): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const existing = await database.get(
    "SELECT id, user_id, order_code, cashback, status FROM orders WHERE id = ?",
    [orderId],
  );
  if (!existing) return { success: false, error: "Đơn hàng không tồn tại" };

  await database.transaction(async (tx) => {
    if ((existing.status as string) === "Đã hoàn tiền" && Number(existing.cashback) > 0) {
      await tx.run(
        "INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)",
        [
          Number(existing.user_id),
          `Xoá đơn ${existing.order_code as string} - thu hồi hoàn tiền`,
          Number(existing.cashback),
          "debit",
        ],
      );
    }
    await tx.run("DELETE FROM orders WHERE id = ?", [orderId]);
  });

  return { success: true };
}


/* ─────────────── System settings ─────────────── */

export const DEFAULT_SETTINGS: Record<string, string> = {
  withdrawals_enabled: "1",
  registration_enabled: "1",
  min_withdraw_amount: "50000",
  maintenance_mode: "0",
  maintenance_message: "Hệ thống đang bảo trì, vui lòng quay lại sau.",
  require_admin_2fa: "0",
  cashback_base_percent: "50",
  referral_milestone_count: "50",
  referral_milestone_bonus_percent: "5",
  // Tier system — Silver/Gold/VIP threshold + cashback %.
  // Bronze dùng cashback_base_percent ở trên (default 50).
  tier_silver_orders: "50",
  tier_silver_referrals: "25",
  tier_silver_percent: "53",
  tier_gold_orders: "100",
  tier_gold_referrals: "50",
  tier_gold_percent: "55",
  tier_vip_orders: "300",
  tier_vip_referrals: "100",
  tier_vip_percent: "58",
  // Mini-game vòng quay may mắn — earn-based, không phải cooldown.
  // User mua đủ N đơn hoàn tiền → +1 lượt. Mời đủ M bạn active → +1 lượt.
  spin_enabled: "1",
  spin_orders_per_token: "10",       // 10 đơn hoàn tiền = 1 lượt quay
  spin_referrals_per_token: "5",     // 5 bạn mời active = 1 lượt quay
};

export async function getSetting(key: string): Promise<string> {
  const database = await getDb();
  const row = await database.get("SELECT value FROM system_settings WHERE key = ?", [key]);
  if (row) return row.value as string;
  return DEFAULT_SETTINGS[key] ?? "";
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const database = await getDb();
  const rows = await database.all("SELECT key, value FROM system_settings", []);
  const out: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key as string] = r.value as string;
  return out;
}

export async function setSetting(key: string, value: string): Promise<void> {
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key)) {
    throw new Error(`Setting key không hợp lệ: ${key}`);
  }
  const database = await getDb();
  // Postgres syntax: ON CONFLICT (PRIMARY KEY) DO UPDATE — tương đương UPSERT của SQLite
  await database.run(
    `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, value],
  );
}

/* ─────────────── Import history ─────────────── */

export interface ImportHistoryEntry {
  id: number;
  admin_user_id: number;
  admin_username?: string;
  file_name: string | null;
  total: number;
  matched: number;
  updated: number;
  duplicated: number;
  unmatched: number;
  created_at: string;
}

export async function addImportHistory(
  adminUserId: number,
  fileName: string | null,
  summary: { total: number; matched: number; updated: number; duplicated: number; unmatched: number },
): Promise<void> {
  const database = await getDb();
  await database.run(
    "INSERT INTO import_history (admin_user_id, file_name, total, matched, updated, duplicated, unmatched) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      adminUserId,
      fileName,
      summary.total,
      summary.matched,
      summary.updated,
      summary.duplicated,
      summary.unmatched,
    ],
  );
}

export async function getImportHistory(limit: number = 50): Promise<ImportHistoryEntry[]> {
  const database = await getDb();
  const rows = await database.all(
    `SELECT h.id, h.admin_user_id, u.username AS admin_username, h.file_name, h.total,
            h.matched, h.updated, h.duplicated, h.unmatched, h.created_at
     FROM import_history h LEFT JOIN users u ON h.admin_user_id = u.id
     ORDER BY h.id DESC LIMIT ?`,
    [limit],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    admin_user_id: Number(r.admin_user_id),
    admin_username: (r.admin_username as string | undefined) ?? undefined,
    file_name: (r.file_name as string | null) ?? null,
    total: Number(r.total),
    matched: Number(r.matched),
    updated: Number(r.updated),
    duplicated: Number(r.duplicated),
    unmatched: Number(r.unmatched),
    created_at: toIso(r.created_at),
  }));
}

/* ─────────────── Broadcast ─────────────── */

export async function broadcastNotification(
  title: string,
  message: string,
  options: { targetRole?: "all" | "user" | "admin"; type?: string } = {},
): Promise<{ count: number }> {
  const t = (title || "").trim();
  const m = (message || "").trim();
  if (!t || !m) throw new Error("Tiêu đề và nội dung bắt buộc");

  const database = await getDb();
  const role = options.targetRole || "all";
  const where = role === "all" ? "is_active = 1" : "is_active = 1 AND role = ?";
  const params: SqlValue[] = role === "all" ? [] : [role];
  const users = await database.all(`SELECT id FROM users WHERE ${where}`, params);

  const type = options.type || "system";
  await database.transaction(async (tx) => {
    for (const u of users) {
      await tx.run(
        "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
        [Number(u.id), t, m, type],
      );
    }
  });
  return { count: users.length };
}

/* ─────────────── DB stats (admin) ─────────────── */

export interface DbStats {
  users: number;
  orders: number;
  withdrawals: number;
  wallet_entries: number;
  notifications: number;
  audit_logs: number;
  sessions_active: number;
  db_size_bytes: number | null;
  db_path: string;
}

export async function getDbStats(): Promise<DbStats> {
  const database = await getDb();
  const counts = await database.get(
    `SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM orders) AS orders,
      (SELECT COUNT(*) FROM withdrawals) AS withdrawals,
      (SELECT COUNT(*) FROM wallet) AS wallet_entries,
      (SELECT COUNT(*) FROM notifications) AS notifications,
      (SELECT COUNT(*) FROM audit_logs) AS audit_logs,
      (SELECT COUNT(*) FROM sessions WHERE expires_at > NOW()) AS sessions_active`,
    [],
  );
  // Postgres: lấy size DB qua pg_database_size (nullable nếu user không có quyền).
  let dbSize: number | null = null;
  try {
    const sizeRow = await database.get(
      "SELECT pg_database_size(current_database()) AS size",
      [],
    );
    dbSize = sizeRow?.size ? Number(sizeRow.size) : null;
  } catch { /* ignore */ }

  return {
    users: Number(counts?.users ?? 0),
    orders: Number(counts?.orders ?? 0),
    withdrawals: Number(counts?.withdrawals ?? 0),
    wallet_entries: Number(counts?.wallet_entries ?? 0),
    notifications: Number(counts?.notifications ?? 0),
    audit_logs: Number(counts?.audit_logs ?? 0),
    sessions_active: Number(counts?.sessions_active ?? 0),
    db_size_bytes: dbSize,
    db_path: "supabase",
  };
}

/* ─────────────── TOTP 2FA ─────────────── */

export function generateTotpSecret(): string {
  const buf = crypto.randomBytes(20);
  return base32Encode(buf);
}

function base32Encode(buf: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let out = "";
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += alphabet[(value >> bits) & 0x1f];
    }
  }
  if (bits > 0) {
    out += alphabet[(value << (5 - bits)) & 0x1f];
  }
  return out;
}

function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = input.replace(/=+$/g, "").toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const c of clean) {
    const idx = alphabet.indexOf(c);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >> bits) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpCode(secret: string, timestamp: number = Date.now()): string {
  const counter = Math.floor(timestamp / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter), 0);
  const key = base32Decode(secret);
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, "0");
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const clean = (code || "").replace(/\s+/g, "").trim();
  if (!/^\d{6}$/.test(clean)) return false;
  const now = Date.now();
  for (let step = -3; step <= 3; step++) {
    if (generateTotpCode(secret, now + step * 30_000) === clean) return true;
  }
  return false;
}

export async function startTotpSetup(
  userId: number,
): Promise<{ secret: string; otpauthUrl: string }> {
  const database = await getDb();
  const row = await database.get("SELECT username, email FROM users WHERE id = ?", [userId]);
  if (!row) throw new Error("User không tồn tại");
  const secret = generateTotpSecret();
  const enc = encryptSecret(secret);
  await database.run(
    "UPDATE users SET totp_secret = ?, totp_enabled = 0 WHERE id = ?",
    [enc, userId],
  );
  const issuer = "VAffiliate";
  const account = encodeURIComponent(row.username as string);
  const otpauthUrl = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  return { secret, otpauthUrl };
}

async function readTotpSecret(database: DbAdapter, userId: number): Promise<string | null> {
  const row = await database.get("SELECT totp_secret FROM users WHERE id = ?", [userId]);
  if (!row || !row.totp_secret) return null;
  return decryptSecret(row.totp_secret as string);
}

export async function confirmTotpSetup(
  userId: number,
  code: string,
): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const secret = await readTotpSecret(database, userId);
  if (!secret) return { success: false, error: "Chưa khởi tạo TOTP" };
  if (!verifyTotpCode(secret, code)) {
    return { success: false, error: "Mã xác thực không đúng" };
  }
  await database.run(
    "UPDATE users SET totp_enabled = 1, updated_at = NOW() WHERE id = ?",
    [userId],
  );
  return { success: true };
}

export async function disableTotp(
  userId: number,
  code: string,
): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const row = await database.get("SELECT totp_enabled FROM users WHERE id = ?", [userId]);
  if (!row || !row.totp_enabled) return { success: false, error: "TOTP chưa được bật" };
  const secret = await readTotpSecret(database, userId);
  if (!secret) return { success: false, error: "TOTP secret không đọc được" };
  if (!verifyTotpCode(secret, code)) {
    return { success: false, error: "Mã xác thực không đúng" };
  }
  await database.run(
    "UPDATE users SET totp_secret = NULL, totp_enabled = 0, updated_at = NOW() WHERE id = ?",
    [userId],
  );
  return { success: true };
}

export async function getTotpStatus(userId: number): Promise<{ enabled: boolean }> {
  const database = await getDb();
  const row = await database.get("SELECT totp_enabled FROM users WHERE id = ?", [userId]);
  return { enabled: Number(row?.totp_enabled ?? 0) === 1 };
}

/* ─────────────── Cleanup / vacuum ─────────────── */

export interface CleanupResult {
  expiredSessions: number;
  expiredResetTokens: number;
  expiredVerifyTokens: number;
  oldNotifications: number;
  vacuumDone: boolean;
}

export async function cleanupExpired(
  options: { notifKeepDays?: number; vacuum?: boolean } = {},
): Promise<CleanupResult> {
  const database = await getDb();
  const keepDays = Math.max(7, options.notifKeepDays ?? 90);

  const r1 = await database.run("DELETE FROM sessions WHERE expires_at < NOW()", []);
  const r2 = await database.run(
    "DELETE FROM password_reset_tokens WHERE used = 1 OR expires_at < NOW()",
    [],
  );
  const r3 = await database.run(
    "DELETE FROM email_verification_tokens WHERE used = 1 OR expires_at < NOW()",
    [],
  );
  const r4 = await database.run(
    `DELETE FROM notifications WHERE is_read = 1 AND created_at < (NOW() - ($1 || ' days')::interval)`,
    [keepDays],
  );

  let vacuumDone = false;
  if (options.vacuum) {
    try {
      // Postgres VACUUM cần chạy outside transaction. postgres-js sẽ exec trực tiếp.
      await database.exec("VACUUM ANALYZE");
      vacuumDone = true;
    } catch (err) {
      console.error("[cleanup] VACUUM failed:", err);
    }
  }

  return {
    expiredSessions: r1.changes,
    expiredResetTokens: r2.changes,
    expiredVerifyTokens: r3.changes,
    oldNotifications: r4.changes,
    vacuumDone,
  };
}


/* ─────────────── Referral system ─────────────── */

export interface ReferralStats {
  totalReferred: number;
  bonusCredited: number;
  totalBonus: number;
  recent: Array<{
    id: number;
    referee_user_id: number;
    referee_username: string;
    referee_display_name: string | null;
    bonus_credited: number;
    created_at: string;
  }>;
}

export async function attachReferral(
  refereeUserId: number,
  referrerUsername: string,
): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const refRow = await database.get(
    "SELECT id, is_active FROM users WHERE LOWER(username) = LOWER(?)",
    [referrerUsername],
  );
  if (!refRow) return { success: false, error: "Người giới thiệu không tồn tại" };
  if (Number(refRow.is_active) === 0) {
    return { success: false, error: "Người giới thiệu đã bị khoá" };
  }
  const referrerId = Number(refRow.id);
  if (referrerId === refereeUserId) {
    return { success: false, error: "Không tự giới thiệu chính mình được" };
  }

  // Postgres equivalent của INSERT OR IGNORE: ON CONFLICT DO NOTHING
  await database.run(
    "INSERT INTO referrals (referrer_user_id, referee_user_id) VALUES (?, ?) ON CONFLICT (referee_user_id) DO NOTHING",
    [referrerId, refereeUserId],
  );
  return { success: true };
}

export async function getReferralStats(userId: number): Promise<ReferralStats> {
  const database = await getDb();

  const totalRow = await database.get(
    "SELECT COUNT(*) AS c FROM referrals WHERE referrer_user_id = ?",
    [userId],
  );
  const creditedRow = await database.get(
    "SELECT COUNT(*) AS c FROM referrals WHERE referrer_user_id = ? AND bonus_credited = 1",
    [userId],
  );
  const bonusRow = await database.get(
    "SELECT COALESCE(SUM(amount), 0) AS s FROM wallet WHERE user_id = ? AND label LIKE 'Thưởng giới thiệu%'",
    [userId],
  );
  const recent = await database.all(
    `SELECT r.id, r.referee_user_id, u.username AS referee_username, u.display_name AS referee_display_name,
            r.bonus_credited, r.created_at
     FROM referrals r LEFT JOIN users u ON r.referee_user_id = u.id
     WHERE r.referrer_user_id = ? ORDER BY r.id DESC LIMIT 50`,
    [userId],
  );

  return {
    totalReferred: Number(totalRow?.c ?? 0),
    bonusCredited: Number(creditedRow?.c ?? 0),
    totalBonus: Number(bonusRow?.s ?? 0),
    recent: recent.map((r) => ({
      id: Number(r.id),
      referee_user_id: Number(r.referee_user_id),
      referee_username: r.referee_username as string,
      referee_display_name: (r.referee_display_name as string | null) ?? null,
      bonus_credited: Number(r.bonus_credited),
      created_at: toIso(r.created_at),
    })),
  };
}

export interface CashbackRateInfo {
  ratePercent: number;
  activeReferrals: number;
  milestone: number;
  basePercent: number;
  bonusPercent: number;
  reachedMilestone: boolean;
  /** Tier code hiện tại — bronze/silver/gold/vip. Field mới cho tier system. */
  tierCode?: string;
  /** Tier name + icon. */
  tierName?: string;
  tierIcon?: string;
}

export async function getCashbackRateForUser(userId: number): Promise<CashbackRateInfo> {
  // Delegate sang tier system mới — tính rate dựa trên tier (Bronze/Silver/Gold/VIP),
  // không phải milestone bool đơn giản như cũ.
  const { getUserTier } = await import("@/lib/tier");
  const tier = await getUserTier(userId);

  // Giữ shape cũ cho callsite — milestone trỏ về Silver threshold (đầu tiên).
  const { getTiers } = await import("@/lib/tier");
  const tiers = await getTiers();
  const silver = tiers.find((t) => t.code === "silver") ?? tiers[1];

  return {
    ratePercent: tier.cashbackPercent,
    activeReferrals: tier.referralsCount,
    milestone: silver?.minReferrals ?? 25,
    basePercent: tiers[0]?.cashbackPercent ?? 50,
    bonusPercent: tier.cashbackPercent - (tiers[0]?.cashbackPercent ?? 50),
    reachedMilestone: tier.current.code !== "bronze",
    tierCode: tier.current.code,
    tierName: tier.current.name,
    tierIcon: tier.current.icon,
  };
}

export function calcCashback(commission: number, ratePercent: number): number {
  if (!Number.isFinite(commission) || commission <= 0) return 0;
  return Math.round((commission * ratePercent) / 100);
}

export async function markRefereeActive(refereeUserId: number): Promise<boolean> {
  const database = await getDb();

  const row = await database.get(
    "SELECT id, referrer_user_id, bonus_credited FROM referrals WHERE referee_user_id = ?",
    [refereeUserId],
  );
  if (!row) return false;
  if (Number(row.bonus_credited) === 1) return false;

  await database.run(
    "UPDATE referrals SET bonus_credited = 1, bonus_credited_at = NOW() WHERE id = ?",
    [Number(row.id)],
  );
  return true;
}

/* ─────────────── TOTP backup codes ─────────────── */

export async function generateBackupCodes(userId: number): Promise<string[]> {
  const database = await getDb();
  await database.run("DELETE FROM totp_backup_codes WHERE user_id = ?", [userId]);

  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const codes: string[] = [];

  await database.transaction(async (tx) => {
    for (let i = 0; i < 10; i++) {
      const buf = crypto.randomBytes(8);
      let raw = "";
      for (let j = 0; j < buf.length; j++) raw += alphabet[buf[j] % alphabet.length];
      const code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
      codes.push(code);
      await tx.run(
        "INSERT INTO totp_backup_codes (user_id, code_hash) VALUES (?, ?)",
        [userId, hashToken(code.toUpperCase())],
      );
    }
  });
  return codes;
}

export async function consumeBackupCode(userId: number, code: string): Promise<boolean> {
  const database = await getDb();
  const normalized = (code || "").toUpperCase().replace(/\s/g, "");
  if (!/^[A-Z2-9]{4}-?[A-Z2-9]{4}$/.test(normalized)) return false;
  const codeWithDash = normalized.length === 8
    ? `${normalized.slice(0, 4)}-${normalized.slice(4)}`
    : normalized;
  const hash = hashToken(codeWithDash);

  const row = await database.get(
    "SELECT id FROM totp_backup_codes WHERE user_id = ? AND code_hash = ? AND used = 0",
    [userId, hash],
  );
  if (!row) return false;
  await database.run(
    "UPDATE totp_backup_codes SET used = 1, used_at = NOW() WHERE id = ?",
    [Number(row.id)],
  );
  return true;
}

export async function countBackupCodes(
  userId: number,
): Promise<{ total: number; remaining: number }> {
  const database = await getDb();
  const total = await database.get(
    "SELECT COUNT(*) AS c FROM totp_backup_codes WHERE user_id = ?",
    [userId],
  );
  const remaining = await database.get(
    "SELECT COUNT(*) AS c FROM totp_backup_codes WHERE user_id = ? AND used = 0",
    [userId],
  );
  return {
    total: Number(total?.c ?? 0),
    remaining: Number(remaining?.c ?? 0),
  };
}

/* ─────────────── Device tracking ─────────────── */

export async function trackKnownDevice(
  userId: number,
  fpHash: string,
  meta: { ip?: string | null; userAgent?: string | null },
): Promise<{ isNew: boolean }> {
  const database = await getDb();
  const existing = await database.get(
    "SELECT id FROM known_devices WHERE user_id = ? AND fp_hash = ?",
    [userId, fpHash],
  );
  if (existing) {
    await database.run(
      "UPDATE known_devices SET last_seen = NOW(), ip = COALESCE(?, ip), user_agent = COALESCE(?, user_agent) WHERE id = ?",
      [meta.ip ?? null, meta.userAgent ?? null, Number(existing.id)],
    );
    return { isNew: false };
  }
  const others = await database.get(
    "SELECT COUNT(*) AS c FROM known_devices WHERE user_id = ?",
    [userId],
  );
  const isReallyNew = Number(others?.c ?? 0) > 0;

  await database.run(
    "INSERT INTO known_devices (user_id, fp_hash, ip, user_agent) VALUES (?, ?, ?, ?)",
    [userId, fpHash, meta.ip ?? null, meta.userAgent ?? null],
  );
  return { isNew: isReallyNew };
}

/* ─────────────── Pending counts (admin widget) ─────────────── */

export interface PendingCounts {
  pendingWithdrawals: number;
  unverifiedUsers: number;
  stuckOrders: number;
}

export async function getPendingCounts(): Promise<PendingCounts> {
  const database = await getDb();
  const row = await database.get(
    `SELECT
      COALESCE((SELECT COUNT(*) FROM withdrawals WHERE status = 'pending'), 0) AS pending_withdrawals,
      COALESCE((SELECT COUNT(*) FROM users WHERE email_verified = 0 AND is_active = 1), 0) AS unverified_users,
      COALESCE((SELECT COUNT(*) FROM orders WHERE status = 'Đang xử lý' AND created_at < NOW() - INTERVAL '30 days'), 0) AS stuck_orders`,
    [],
  );
  return {
    pendingWithdrawals: Number(row?.pending_withdrawals ?? 0),
    unverifiedUsers: Number(row?.unverified_users ?? 0),
    stuckOrders: Number(row?.stuck_orders ?? 0),
  };
}

/* ─────────────── Short links (URL shortener) ─────────────── */

/**
 * Sinh code 8 ký tự alphanumeric không nhập nhằng (loại 0/O, 1/l/I).
 * 32^8 ~ 1.1 * 10^12 tổ hợp → đủ dùng cho dự án nhỏ.
 */
function generateShortCode(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = crypto.randomBytes(8);
  let code = "";
  for (let i = 0; i < buf.length; i++) code += alphabet[buf[i] % alphabet.length];
  return code;
}

/**
 * Tạo short link mới cho 1 affiliate URL. Idempotent theo (user_id, shop_id, item_id):
 * nếu user đã từng tạo short link cho chính sản phẩm đó thì re-use → tránh
 * spam DB và giữ link cũ vẫn dùng được khi user share lại.
 *
 * Trả về `code` 8 ký tự — caller ghép thành `${baseUrl}/s/${code}`.
 */
export async function createShortLink(args: {
  userId: number | null;
  targetUrl: string;
  shopId?: string;
  itemId?: string;
}): Promise<string> {
  const database = await getDb();

  // Re-use nếu đã có (cùng user + cùng product).
  if (args.userId && args.shopId && args.itemId) {
    const existing = await database.get(
      "SELECT code FROM short_links WHERE user_id = ? AND shop_id = ? AND item_id = ? ORDER BY id DESC LIMIT 1",
      [args.userId, args.shopId, args.itemId],
    );
    if (existing?.code) return String(existing.code);
  }

  // Sinh code unique — retry tối đa 5 lần phòng collision (xác suất cực thấp).
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateShortCode();
    try {
      await database.run(
        "INSERT INTO short_links (code, user_id, target_url, shop_id, item_id) VALUES (?, ?, ?, ?, ?)",
        [code, args.userId, args.targetUrl, args.shopId ?? null, args.itemId ?? null],
      );
      return code;
    } catch (e) {
      const msg = (e as Error).message || "";
      // 23505 = unique_violation Postgres → trùng code → retry.
      if (msg.includes("duplicate") || msg.includes("23505")) continue;
      throw e;
    }
  }
  throw new Error("Không thể sinh short code unique sau 5 lần thử");
}

/**
 * Lookup target URL theo code. Side-effect: tăng click_count + last_clicked_at.
 * Trả null nếu code không tồn tại → caller redirect về 404.
 */
export async function resolveShortLink(code: string): Promise<string | null> {
  if (!code || !/^[a-zA-Z0-9]{4,16}$/.test(code)) return null;
  const database = await getDb();
  const row = await database.get(
    "SELECT target_url FROM short_links WHERE code = ?",
    [code],
  );
  if (!row?.target_url) return null;

  // Tăng click count async — không await để không chặn redirect.
  void database.run(
    "UPDATE short_links SET click_count = click_count + 1, last_clicked_at = NOW() WHERE code = ?",
    [code],
  );

  return String(row.target_url);
}
