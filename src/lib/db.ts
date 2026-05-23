import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { warnMissingEnv } from "@/lib/env-check";

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(process.cwd(), "caffiliate.db");

/**
 * Adapter mỏng quanh `node:sqlite` để giữ tương thích với code cũ
 * vốn được viết cho `sql.js` (gọi `database.run(sql, params)` v.v.).
 *
 * `node:sqlite` là driver native built-in của Node 22.5+. So với `sql.js`:
 *   - Không lưu toàn bộ DB trong RAM, không cần writeFileSync sau mỗi mutation
 *   - Hỗ trợ WAL → write-ahead logging, concurrent read an toàn
 *   - Transaction thật sự — không còn race condition khi 2 request ghi cùng lúc
 */
type SqlValue = SQLInputValue;

/** Adapter mỏng quanh `node:sqlite` với cache prepared statement.
 *
 * Trước: mỗi `database.run(sql, params)` parse lại SQL → chậm với hot path.
 * Sau: cache theo SQL string → reuse plan đã compile, tốc độ ~3-10x cho query nhỏ.
 */
class DbAdapter {
  private readonly cache = new Map<string, ReturnType<DatabaseSync["prepare"]>>();

  constructor(public readonly raw: DatabaseSync) {}

  private getStmt(sql: string) {
    let stmt = this.cache.get(sql);
    if (!stmt) {
      stmt = this.raw.prepare(sql);
      this.cache.set(sql, stmt);
    }
    return stmt;
  }

  run(sql: string, params: SqlValue[] = []): { lastInsertRowid: number | bigint; changes: number | bigint } {
    return this.getStmt(sql).run(...params);
  }

  prepare(sql: string): ReturnType<DatabaseSync["prepare"]> {
    return this.getStmt(sql);
  }

  exec(sql: string): void {
    this.raw.exec(sql);
  }

  /** Bọc một loạt mutation trong transaction — atomic, tăng tốc đáng kể nếu nhiều INSERT/UPDATE. */
  transaction<T>(fn: () => T): T {
    this.raw.exec("BEGIN");
    try {
      const result = fn();
      this.raw.exec("COMMIT");
      return result;
    } catch (e) {
      this.raw.exec("ROLLBACK");
      throw e;
    }
  }
}

const globalForDb = globalThis as unknown as {
  __caffiliate_db: DbAdapter | null;
};

/** No-op để giữ tương thích — node:sqlite tự persist sau mỗi statement. */
function saveDb(): void {
  /* node:sqlite tự ghi vào file, không cần làm gì thêm. */
}

export async function getDb(): Promise<DbAdapter> {
  if (globalForDb.__caffiliate_db) return globalForDb.__caffiliate_db;

  warnMissingEnv();

  // Đảm bảo thư mục chứa DB tồn tại (cần thiết khi DB_PATH trỏ vào volume bind mount).
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new DatabaseSync(DB_PATH);
  // Tuning cho concurrent + perf:
  //   - WAL: read song song với write
  //   - synchronous=NORMAL: durable nhưng nhanh hơn FULL (fsync ít hơn)
  //   - busy_timeout: chờ 5s khi gặp lock thay vì lỗi ngay
  //   - cache_size âm = số KB (10MB)
  //   - foreign_keys: enforce constraint (CASCADE delete)
  //   - temp_store=MEMORY: temp tables trong RAM
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = NORMAL");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec("PRAGMA cache_size = -10000");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA temp_store = MEMORY");

  const adapter = new DbAdapter(db);
  globalForDb.__caffiliate_db = adapter;
  initSchema(adapter);
  return adapter;
}

function initSchema(database: DbAdapter) {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      display_name TEXT,
      phone TEXT,
      withdraw_pin_hash TEXT,
      withdraw_pin_salt TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_active INTEGER DEFAULT 1,
      role TEXT DEFAULT 'user'
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_code TEXT NOT NULL UNIQUE,
      store TEXT NOT NULL DEFAULT 'Shopee',
      amount INTEGER NOT NULL DEFAULT 0,
      cashback INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Chờ xác nhận',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS wallet (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'credit',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      bank_code TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      account_holder TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      bank_account_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Đang xử lý',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS affiliate_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      shop_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      product_name TEXT,
      product_price INTEGER DEFAULT 0,
      commission INTEGER DEFAULT 0,
      commission_rate TEXT,
      cashback INTEGER DEFAULT 0,
      affiliate_link TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  database.run("CREATE INDEX IF NOT EXISTS idx_affiliate_links_user ON affiliate_links(user_id)");
  database.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  database.run("CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)");
  database.run(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  database.run("CREATE INDEX IF NOT EXISTS idx_reset_token ON password_reset_tokens(token)");
  database.run("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)");
  database.run("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)");
  database.run("CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)");
  database.run("CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)");
  database.run("CREATE INDEX IF NOT EXISTS idx_wallet_user ON wallet(user_id)");
  database.run("CREATE INDEX IF NOT EXISTS idx_bank_user ON bank_accounts(user_id)");
  database.run("CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id)");

  // Bảng xác thực email
  database.run(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  database.run("CREATE INDEX IF NOT EXISTS idx_email_verify_token ON email_verification_tokens(token)");

  // Bảng audit log (lưu hành vi nhạy cảm)
  database.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      target TEXT,
      ip TEXT,
      user_agent TEXT,
      detail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  database.run("CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)");
  database.run("CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)");
  database.run("CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC)");

  // Bảng system_settings — cấu hình hệ thống bật/tắt runtime, quản lý qua /admin/settings.
  database.run(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Bảng import_history — log tất cả lần import CSV để truy vết.
  database.run(`
    CREATE TABLE IF NOT EXISTS import_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_user_id INTEGER NOT NULL,
      file_name TEXT,
      total INTEGER DEFAULT 0,
      matched INTEGER DEFAULT 0,
      updated INTEGER DEFAULT 0,
      duplicated INTEGER DEFAULT 0,
      unmatched INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  database.run("CREATE INDEX IF NOT EXISTS idx_import_history_created ON import_history(created_at DESC)");

  // Backup codes cho 2FA — sinh 10 mã sau khi user enable TOTP, mỗi mã dùng 1 lần.
  // Lưu hash sha256 (giống password reset token) — secure khi DB leak.
  database.run(`
    CREATE TABLE IF NOT EXISTS totp_backup_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      code_hash TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  database.run("CREATE INDEX IF NOT EXISTS idx_backup_codes_user ON totp_backup_codes(user_id)");

  // Track device fingerprint để cảnh báo khi user login từ thiết bị/IP lạ.
  // `fp_hash` = sha256(useragent + ip range) → identifier ổn định mà không leak PII.
  database.run(`
    CREATE TABLE IF NOT EXISTS known_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      fp_hash TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, fp_hash)
    )
  `);
  database.run("CREATE INDEX IF NOT EXISTS idx_known_devices_user ON known_devices(user_id)");
  database.run("CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(user_id, status)");
  database.run("CREATE INDEX IF NOT EXISTS idx_wallet_user_type ON wallet(user_id, type)");
  database.run("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)");
  database.run("CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)");
  database.run("CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read)");

  // Migration: add columns if they don't exist on older DBs
  try { database.run("ALTER TABLE users ADD COLUMN withdraw_pin_hash TEXT"); } catch { /* already exists */ }
  try { database.run("ALTER TABLE users ADD COLUMN withdraw_pin_salt TEXT"); } catch { /* already exists */ }
  try { database.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'"); } catch { /* already exists */ }
  // User đã tồn tại trước thời điểm thêm cột email_verified — coi như đã verify
  // (chỉ chạy đúng 1 lần ngay khi cột vừa được thêm).
  let emailVerifiedAdded = false;
  try { database.run("ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0"); emailVerifiedAdded = true; } catch { /* already exists */ }
  if (emailVerifiedAdded) {
    database.run("UPDATE users SET email_verified = 1");
  }
  try { database.run("ALTER TABLE users ADD COLUMN withdraw_pin_failed_count INTEGER DEFAULT 0"); } catch { /* already exists */ }
  try { database.run("ALTER TABLE users ADD COLUMN withdraw_pin_locked_until DATETIME"); } catch { /* already exists */ }
  try { database.run("ALTER TABLE sessions ADD COLUMN last_seen_at DATETIME"); } catch { /* already exists */ }
  try { database.run("ALTER TABLE sessions ADD COLUMN ip TEXT"); } catch { /* already exists */ }
  try { database.run("ALTER TABLE sessions ADD COLUMN user_agent TEXT"); } catch { /* already exists */ }
  try { database.run("ALTER TABLE withdrawals ADD COLUMN admin_note TEXT"); } catch { /* already exists */ }
  try { database.run("ALTER TABLE users ADD COLUMN totp_secret TEXT"); } catch { /* already exists */ }
  try { database.run("ALTER TABLE users ADD COLUMN totp_enabled INTEGER DEFAULT 0"); } catch { /* already exists */ }
  // Lock account theo username (chống IP-rotation bypass rate limit).
  try { database.run("ALTER TABLE users ADD COLUMN login_failed_count INTEGER DEFAULT 0"); } catch { /* already exists */ }
  try { database.run("ALTER TABLE users ADD COLUMN login_locked_until DATETIME"); } catch { /* already exists */ }

  // Seed default admin account if not exists
  const adminExists = queryOne(database, "SELECT id FROM users WHERE username = 'admin'", []);
  if (!adminExists) {
    const seedPassword = process.env.ADMIN_SEED_PASSWORD || "admin123";
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(seedPassword, salt, 10000, 64, "sha512").toString("hex");
    database.run(
      "INSERT INTO users (username, email, password_hash, salt, display_name, role, email_verified) VALUES (?, ?, ?, ?, ?, ?, 1)",
      ["admin", "admin@v-affiliate.vn", hash, salt, "Admin", "admin"]
    );
    if (process.env.NODE_ENV === "production" && !process.env.ADMIN_SEED_PASSWORD) {
      console.warn(
        "[V-Affiliate] ⚠️  Tài khoản admin đã được tạo với password mặc định 'admin123'. " +
        "ĐĂNG NHẬP NGAY và đổi password (vào /dashboard/security), hoặc set ADMIN_SEED_PASSWORD trước khi deploy lần sau.",
      );
    }
  }

  // Fix old labels without diacritics
  database.run("UPDATE wallet SET label = 'Biến động số dư' WHERE label IN ('Cong so du', 'C?ng s? du', 'Cộng số dư')");
}

function queryOne(database: DbAdapter, sql: string, params: SqlValue[] = []): Record<string, unknown> | null {
  const row = database.prepare(sql).get(...params) as Record<string, unknown> | undefined;
  return row ?? null;
}

function queryAll(database: DbAdapter, sql: string, params: SqlValue[] = []): Record<string, unknown>[] {
  return database.prepare(sql).all(...params) as Record<string, unknown>[];
}

/**
 * Số vòng pbkdf2 cho mã mới. Dùng `verifyPassword` để check mọi format hash cũ.
 * Sau khi user login thành công bằng hash cũ, ta tự re-hash bằng iterations mới.
 */
const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = "sha512";

/** Async pbkdf2 — không block event loop ~300ms như Sync version. */
function pbkdf2Async(
  password: string,
  salt: string,
  iterations: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, PBKDF2_KEYLEN, PBKDF2_DIGEST, (err, derived) => {
      if (err) reject(err);
      else resolve(derived);
    });
  });
}

/** Sinh hash dạng `pbkdf2$<iterations>$<salt>$<hex>`. Lưu vào cột password_hash. */
async function hashPasswordEncoded(password: string, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await pbkdf2Async(password, salt, iterations);
  return `pbkdf2$${iterations}$${salt}$${derived.toString("hex")}`;
}

/**
 * So sánh password với hash đã lưu. Hỗ trợ:
 *   - Format mới: `pbkdf2$<iter>$<salt>$<hash>`
 *   - Format cũ: hex hash 10.000 vòng + salt lưu ở cột `salt` (legacy)
 *   - Format khác: trả false an toàn.
 *
 * Trả về `{ valid, needsUpgrade }` — `needsUpgrade=true` nếu hash đang ở format cũ
 * hoặc số iterations thấp hơn mục tiêu, gợi ý caller re-hash.
 */
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

  // Legacy: salt riêng + 10.000 vòng sha512.
  if (!legacySalt) return { valid: false, needsUpgrade: false };
  const computed = await pbkdf2Async(password, legacySalt, 10_000);
  const expected = Buffer.from(storedHash, "hex");
  if (computed.length !== expected.length) {
    return { valid: false, needsUpgrade: false };
  }
  const valid = crypto.timingSafeEqual(computed, expected);
  return { valid, needsUpgrade: valid };
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash token (reset password / verify email) trước khi lưu DB.
 *
 * Lý do: nếu attacker dump bảng password_reset_tokens, họ KHÔNG thể dùng token
 * trực tiếp để reset bất kỳ tài khoản nào. Token thật chỉ tồn tại trong email
 * gửi cho user; DB chỉ giữ hash. Tốc độ verify rất nhanh (sha256 đơn vòng,
 * không cần kdf vì input đã có entropy cao 256-bit).
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Mã hoá symmetric AES-256-GCM cho secret nhạy cảm lưu DB (vd. TOTP secret).
 * Key lấy từ env `APP_ENCRYPTION_KEY` (32 byte hex). Nếu thiếu → fallback về
 * key derived từ DB_PATH (kém an toàn hơn nhưng đủ cho dev). Production BẮT BUỘC
 * set APP_ENCRYPTION_KEY và backup nó tách rời DB.
 */
function getEncKey(): Buffer {
  const envKey = process.env.APP_ENCRYPTION_KEY;
  if (envKey) {
    if (/^[0-9a-fA-F]{64}$/.test(envKey)) return Buffer.from(envKey, "hex");
    // Cho phép base64 (44 ký tự + padding) cho người không dùng hex.
    try {
      const buf = Buffer.from(envKey, "base64");
      if (buf.length === 32) return buf;
    } catch { /* fallthrough */ }
    console.warn("[V-Affiliate] ⚠️  APP_ENCRYPTION_KEY định dạng không hợp lệ, dùng fallback derived key.");
  }
  // Fallback: derive từ DB_PATH (KHÔNG khuyến nghị production — chỉ giúp dev không lỗi).
  return crypto.createHash("sha256").update(`v-affiliate:${DB_PATH}`).digest();
}

/** Mã hoá string → "v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>". */
export function encryptSecret(plain: string): string {
  if (!plain) return "";
  const key = getEncKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("hex")}:${tag.toString("hex")}:${ct.toString("hex")}`;
}

/** Giải mã chuỗi đã encrypt. Trả về null nếu format không đúng / sai key. */
export function decryptSecret(payload: string): string | null {
  if (!payload) return null;
  // Backward compat: nếu là base32 (chỉ A-Z,2-7) → coi là plaintext cũ, trả nguyên.
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

export async function registerUser(username: string, email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> {
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return { success: false, error: "Tên đăng nhập chỉ chứa chữ, số, gạch dưới (3–20 ký tự)" };
  }

  const database = await getDb();

  const existingUser = queryOne(database, "SELECT id FROM users WHERE username = ?", [username]);
  if (existingUser) return { success: false, error: "Tên đăng nhập đã tồn tại" };

  const existingEmail = queryOne(database, "SELECT id FROM users WHERE email = ?", [email]);
  if (existingEmail) return { success: false, error: "Email đã được sử dụng" };

  // Hash mới — dùng salt nhúng trong field. Cột `salt` để rỗng (chỉ legacy mới dùng).
  const passwordHash = await hashPasswordEncoded(password);

  database.run("INSERT INTO users (username, email, password_hash, salt, display_name, email_verified) VALUES (?, ?, ?, ?, ?, 0)", [username, email, passwordHash, "", username]);

  const row = queryOne(database, "SELECT id, username, email, display_name, phone, withdraw_pin_hash, role, email_verified, created_at, last_login, is_active FROM users WHERE username = ?", [username]);
  saveDb();

  const u = row as Record<string, unknown>;
  return {
    success: true,
    user: {
      ...u,
      has_withdraw_pin: !!u.withdraw_pin_hash,
      email_verified: !!u.email_verified,
    } as unknown as User,
  };
}

export async function loginUser(
  username: string,
  password: string,
  meta: { ip?: string; userAgent?: string; totpCode?: string; fingerprint?: string } = {},
): Promise<{ success: boolean; error?: string; needEmailVerify?: boolean; needTotp?: boolean; email?: string; user?: User; token?: string; isNewDevice?: boolean }> {
  const database = await getDb();

  const row = queryOne(
    database,
    `SELECT id, username, email, password_hash, salt, display_name, phone, role,
            email_verified, created_at, last_login, is_active,
            login_failed_count, login_locked_until, totp_enabled, totp_secret
     FROM users WHERE username = ?`,
    [username],
  );
  // Generic message để không lộ tài khoản nào tồn tại trên hệ thống.
  const generic = "Tên đăng nhập hoặc mật khẩu không đúng";
  if (!row) {
    // Vẫn chạy verify giả để giữ thời gian xử lý cân bằng (chống timing attack).
    await verifyPassword(password, "pbkdf2$10000$00$00", null);
    return { success: false, error: generic };
  }

  // Lock per-username — chống IP-rotation bypass rate limit per-IP.
  const lockedUntilRaw = row.login_locked_until as string | null;
  if (lockedUntilRaw) {
    const lockedUntil = new Date(lockedUntilRaw);
    if (lockedUntil > new Date()) {
      const minutes = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 60000));
      // Vẫn verify để giữ timing đều (chống probe).
      await verifyPassword(password, row.password_hash as string, row.salt as string | null);
      return { success: false, error: `Tài khoản tạm khoá do nhập sai nhiều lần. Thử lại sau ~${minutes} phút.` };
    }
    // Hết khoá → reset count.
    database.run("UPDATE users SET login_failed_count = 0, login_locked_until = NULL WHERE id = ?", [row.id as number]);
  }

  const check = await verifyPassword(password, row.password_hash as string, row.salt as string | null);
  if (!check.valid) {
    // Tăng fail count. 10 fail liên tiếp → khoá 15 phút.
    const failed = ((row.login_failed_count as number) || 0) + 1;
    const MAX_LOGIN_FAIL = 10;
    const LOCK_MS = 15 * 60 * 1000;
    if (failed >= MAX_LOGIN_FAIL) {
      const lockedUntilIso = new Date(Date.now() + LOCK_MS).toISOString();
      database.run("UPDATE users SET login_failed_count = ?, login_locked_until = ? WHERE id = ?", [failed, lockedUntilIso, row.id as number]);
      saveDb();
      return { success: false, error: "Tài khoản tạm khoá do nhập sai nhiều lần. Thử lại sau ~15 phút." };
    }
    database.run("UPDATE users SET login_failed_count = ? WHERE id = ?", [failed, row.id as number]);
    saveDb();
    return { success: false, error: generic };
  }

  if ((row.is_active as number) === 0) {
    return { success: false, error: "Tài khoản đã bị khoá. Vui lòng liên hệ hỗ trợ." };
  }

  if ((row.email_verified as number) === 0) {
    return {
      success: false,
      needEmailVerify: true,
      email: row.email as string,
      error: "Email chưa được xác thực. Hãy kiểm tra hộp thư để xác nhận trước khi đăng nhập.",
    };
  }

  // 2FA: nếu user đã bật TOTP, yêu cầu mã xác thực.
  if ((row.totp_enabled as number) === 1) {
    const code = meta.totpCode;
    if (!code) {
      return { success: false, needTotp: true, error: "Yêu cầu mã xác thực 2 lớp" };
    }
    // Cho phép cả TOTP code (6 số) lẫn backup code (XXXX-XXXX). Verify TOTP trước
    // (case phổ biến), fallback backup nếu fail.
    const secretEnc = row.totp_secret as string | null;
    const secret = secretEnc ? decryptSecret(secretEnc) : null;
    let totpOk = false;
    if (secret && verifyTotpCode(secret, code)) {
      totpOk = true;
    } else {
      // Thử backup code — chỉ nếu format khớp (có gạch ngang hoặc 8 ký tự alphanum).
      const cleaned = code.replace(/\s/g, "").toUpperCase();
      if (/^[A-Z2-9]{4}-?[A-Z2-9]{4}$/.test(cleaned)) {
        totpOk = await consumeBackupCode(row.id as number, cleaned);
      }
    }
    if (!totpOk) {
      // TOTP fail cũng tính vào fail count để khoá brute-force.
      const failed = ((row.login_failed_count as number) || 0) + 1;
      const MAX_LOGIN_FAIL = 10;
      const LOCK_MS = 15 * 60 * 1000;
      if (failed >= MAX_LOGIN_FAIL) {
        const lockedUntilIso = new Date(Date.now() + LOCK_MS).toISOString();
        database.run("UPDATE users SET login_failed_count = ?, login_locked_until = ? WHERE id = ?", [failed, lockedUntilIso, row.id as number]);
        saveDb();
        return { success: false, needTotp: true, error: "Tài khoản tạm khoá do sai nhiều lần. Thử lại sau ~15 phút." };
      }
      database.run("UPDATE users SET login_failed_count = ? WHERE id = ?", [failed, row.id as number]);
      saveDb();
      return { success: false, needTotp: true, error: "Mã xác thực 2 lớp hoặc backup code không đúng" };
    }
  }

  // Reset fail count khi login thành công.
  database.run("UPDATE users SET login_failed_count = 0, login_locked_until = NULL WHERE id = ?", [row.id as number]);

  // Lazy upgrade: nếu hash đang ở format cũ hoặc iterations thấp, re-hash.
  if (check.needsUpgrade) {
    const upgraded = await hashPasswordEncoded(password);
    database.run("UPDATE users SET password_hash = ?, salt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [upgraded, "", row.id as number]);
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  database.run(
    "INSERT INTO sessions (user_id, token, expires_at, last_seen_at, ip, user_agent) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?)",
    [row.id as number, token, expiresAt, meta.ip ?? null, meta.userAgent ?? null],
  );
  database.run("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [row.id as number]);
  saveDb();

  const user: User = {
    id: row.id as number,
    username: row.username as string,
    email: row.email as string,
    display_name: row.display_name as string | null,
    phone: row.phone as string | null,
    has_withdraw_pin: !!(row.withdraw_pin_hash),
    email_verified: !!(row.email_verified),
    created_at: row.created_at as string,
    last_login: new Date().toISOString(),
    is_active: row.is_active as number,
    role: (row.role as string) || "user",
  };

  // Track device fingerprint — caller dùng `isNewDevice` để gửi email cảnh báo.
  // Wrap try/catch — fail-safe để không break login nếu bảng known_devices
  // tạm chưa có (vd DB cũ chưa migrate).
  let isNewDevice = false;
  if (meta.fingerprint) {
    try {
      const tracked = await trackKnownDevice(row.id as number, meta.fingerprint, {
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

/**
 * Cấu hình session: hard cap 30 ngày, mỗi request hoạt động kéo dài thêm 7 ngày
 * (sliding window). User đang dùng app sẽ không bị logout đột ngột.
 */
const SESSION_SLIDING_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_ABSOLUTE_MAX_MS = 30 * 24 * 60 * 60 * 1000;

export async function getUserByToken(
  token: string,
  meta: { ip?: string; userAgent?: string } = {},
): Promise<User | null> {
  const database = await getDb();

  const session = queryOne(database, "SELECT id, user_id, expires_at, created_at FROM sessions WHERE token = ?", [token]);
  if (!session) return null;

  const now = Date.now();
  if (new Date(session.expires_at as string).getTime() < now) {
    database.run("DELETE FROM sessions WHERE token = ?", [token]);
    saveDb();
    return null;
  }

  const row = queryOne(database, "SELECT id, username, email, display_name, phone, withdraw_pin_hash, role, email_verified, created_at, last_login, is_active FROM users WHERE id = ?", [session.user_id as number]);
  if (!row) return null;
  // User bị admin khoá → huỷ session, từ chối request.
  if ((row.is_active as number) === 0) {
    database.run("DELETE FROM sessions WHERE user_id = ?", [row.id as number]);
    saveDb();
    return null;
  }

  // Sliding session: gia hạn nếu sắp hết, không vượt quá hard cap kể từ create_at.
  const sessionCreated = new Date(session.created_at as string).getTime();
  const newExpiry = Math.min(now + SESSION_SLIDING_MS, sessionCreated + SESSION_ABSOLUTE_MAX_MS);
  database.run(
    "UPDATE sessions SET expires_at = ?, last_seen_at = CURRENT_TIMESTAMP, ip = COALESCE(?, ip), user_agent = COALESCE(?, user_agent) WHERE id = ?",
    [new Date(newExpiry).toISOString(), meta.ip ?? null, meta.userAgent ?? null, session.id as number],
  );
  saveDb();

  return {
    ...row,
    has_withdraw_pin: !!row.withdraw_pin_hash,
    email_verified: !!row.email_verified,
  } as unknown as User;
}

export async function deleteSession(token: string): Promise<void> {
  const database = await getDb();
  database.run("DELETE FROM sessions WHERE token = ?", [token]);
  saveDb();
}

/* ─────────────── User account management ─────────────── */

export interface SessionInfo {
  id: number;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string | null;
  expires_at: string;
  is_current: boolean;
}

/** Lấy danh sách session đang hoạt động của user. */
export async function listUserSessions(userId: number, currentToken?: string): Promise<SessionInfo[]> {
  const database = await getDb();
  const rows = queryAll(database, "SELECT id, token, ip, user_agent, created_at, last_seen_at, expires_at FROM sessions WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP ORDER BY last_seen_at DESC, created_at DESC", [userId]);
  return rows.map((r) => ({
    id: r.id as number,
    ip: r.ip as string | null,
    user_agent: r.user_agent as string | null,
    created_at: r.created_at as string,
    last_seen_at: r.last_seen_at as string | null,
    expires_at: r.expires_at as string,
    is_current: !!currentToken && r.token === currentToken,
  }));
}

/** Xoá toàn bộ session khác (logout all other devices). */
export async function deleteOtherSessions(userId: number, keepToken: string): Promise<void> {
  const database = await getDb();
  database.run("DELETE FROM sessions WHERE user_id = ? AND token != ?", [userId, keepToken]);
  saveDb();
}

/** Xoá một session theo id (chỉ trong phạm vi user). */
export async function deleteSessionById(userId: number, sessionId: number): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const row = queryOne(database, "SELECT id FROM sessions WHERE id = ? AND user_id = ?", [sessionId, userId]);
  if (!row) return { success: false, error: "Session không tồn tại" };
  database.run("DELETE FROM sessions WHERE id = ?", [sessionId]);
  saveDb();
  return { success: true };
}

/** Đổi mật khẩu khi đã đăng nhập. Yêu cầu mật khẩu hiện tại để chống tấn công CSRF/giành phiên. */
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
  const row = queryOne(database, "SELECT password_hash, salt FROM users WHERE id = ?", [userId]);
  if (!row) return { success: false, error: "Không tìm thấy người dùng" };

  const check = await verifyPassword(currentPassword, row.password_hash as string, row.salt as string | null);
  if (!check.valid) return { success: false, error: "Mật khẩu hiện tại không đúng" };

  const newHash = await hashPasswordEncoded(newPassword);
  database.run("UPDATE users SET password_hash = ?, salt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [newHash, "", userId]);
  // Logout mọi thiết bị khác — giữ lại phiên hiện tại nếu được cung cấp.
  if (options.keepToken) {
    database.run("DELETE FROM sessions WHERE user_id = ? AND token != ?", [userId, options.keepToken]);
  } else {
    database.run("DELETE FROM sessions WHERE user_id = ?", [userId]);
  }
  saveDb();
  return { success: true };
}

/** Xoá tài khoản: yêu cầu mật khẩu hiện tại; admin không thể tự xoá để khỏi mất quyền. */
export async function deleteUserAccount(userId: number, password: string): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const row = queryOne(database, "SELECT password_hash, salt, role FROM users WHERE id = ?", [userId]);
  if (!row) return { success: false, error: "Không tìm thấy người dùng" };
  if ((row.role as string) === "admin") return { success: false, error: "Tài khoản admin không thể tự xoá" };

  const check = await verifyPassword(password, row.password_hash as string, row.salt as string | null);
  if (!check.valid) return { success: false, error: "Mật khẩu không đúng" };

  // ON DELETE CASCADE đã cấu hình ở các bảng phụ thuộc → tự dọn cùng.
  database.run("DELETE FROM users WHERE id = ?", [userId]);
  saveDb();
  return { success: true };
}

/* ─────────────── Email verification ─────────────── */

/**
 * Tạo token xác thực email. Vô hiệu các token cũ chưa dùng để chỉ token mới nhất hoạt động.
 */
export async function createEmailVerificationToken(userId: number): Promise<{ token: string; expiresAt: string }> {
  const database = await getDb();
  database.run("UPDATE email_verification_tokens SET used = 1 WHERE user_id = ? AND used = 0", [userId]);
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
  // Lưu hash, plaintext chỉ trả về để gửi email.
  database.run("INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)", [userId, tokenHash, expiresAt]);
  saveDb();
  return { token, expiresAt };
}

export async function verifyEmailToken(token: string): Promise<{ success: boolean; error?: string; userId?: number }> {
  const database = await getDb();
  const tokenHash = hashToken(token);
  const row = queryOne(database, "SELECT id, user_id, expires_at, used FROM email_verification_tokens WHERE token = ?", [tokenHash]);
  if (!row) return { success: false, error: "Link xác thực không hợp lệ" };
  if (row.used) return { success: false, error: "Link đã được sử dụng" };
  if (new Date(row.expires_at as string) < new Date()) return { success: false, error: "Link đã hết hạn (24h)" };

  database.run("UPDATE email_verification_tokens SET used = 1 WHERE id = ?", [row.id as number]);
  database.run("UPDATE users SET email_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [row.user_id as number]);
  saveDb();
  return { success: true, userId: row.user_id as number };
}

/** Lấy user theo email — phục vụ resend email verify. */
export async function getUserByEmail(email: string): Promise<{ id: number; username: string; email_verified: boolean } | null> {
  const database = await getDb();
  const row = queryOne(database, "SELECT id, username, email_verified FROM users WHERE email = ?", [email]);
  if (!row) return null;
  return {
    id: row.id as number,
    username: row.username as string,
    email_verified: !!row.email_verified,
  };
}

/* ─────────────── Audit log ─────────────── */

export async function logAudit(
  action: string,
  options: { userId?: number | null; target?: string | null; ip?: string | null; userAgent?: string | null; detail?: string | null } = {},
): Promise<void> {
  const database = await getDb();
  database.run(
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
  saveDb();
}

export async function getAuditLogs(limit: number = 200): Promise<Record<string, unknown>[]> {
  const database = await getDb();
  return queryAll(database, "SELECT id, user_id, action, target, ip, user_agent, detail, created_at FROM audit_logs ORDER BY id DESC LIMIT ?", [limit]);
}

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
  return queryAll(database, "SELECT id, order_code, store, amount, cashback, status, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC", [userId]) as unknown as Order[];
}

export async function getUserWallet(userId: number): Promise<WalletEntry[]> {
  const database = await getDb();
  return queryAll(database, "SELECT id, label, amount, type, created_at FROM wallet WHERE user_id = ? ORDER BY created_at DESC", [userId]) as unknown as WalletEntry[];
}

export async function getDashboardStats(userId: number): Promise<DashboardStats> {
  const database = await getDb();

  // Gộp 5 query thành 1 round-trip duy nhất.
  const row = queryOne(
    database,
    `SELECT
      COALESCE((SELECT SUM(cashback) FROM orders WHERE user_id = ?1 AND status = 'Đã hoàn tiền'), 0) AS total_cashback,
      COALESCE((SELECT COUNT(*) FROM orders WHERE user_id = ?1), 0) AS total_orders,
      COALESCE((SELECT COUNT(*) FROM orders WHERE user_id = ?1 AND status IN ('Đang xử lý', 'Chờ xác nhận')), 0) AS pending_orders,
      COALESCE((SELECT SUM(CASE WHEN type='credit' THEN amount ELSE -amount END) FROM wallet WHERE user_id = ?1), 0) AS wallet_balance`,
    [userId],
  );

  return {
    totalCashback: (row?.total_cashback as number) ?? 0,
    totalOrders: (row?.total_orders as number) ?? 0,
    pendingOrders: (row?.pending_orders as number) ?? 0,
    walletBalance: (row?.wallet_balance as number) ?? 0,
  };
}

export interface LeaderboardEntry {
  display_name: string;
  total_orders: number;
  total_cashback: number;
}

export async function getLeaderboard(period: "month" | "all" = "all"): Promise<LeaderboardEntry[]> {
  const database = await getDb();
  let dateFilter = "";
  if (period === "month") {
    dateFilter = "AND o.created_at >= date('now', 'start of month')";
  }
  return queryAll(database, `
    SELECT u.display_name, COUNT(o.id) as total_orders, COALESCE(SUM(o.cashback), 0) as total_cashback
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id ${dateFilter}
    GROUP BY u.id
    HAVING total_cashback > 0
    ORDER BY total_cashback DESC
    LIMIT 10
  `) as unknown as LeaderboardEntry[];
}

export async function updateUserProfile(userId: number, data: { display_name?: string; email?: string; phone?: string }): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();

  if (data.email) {
    const existing = queryOne(database, "SELECT id FROM users WHERE email = ? AND id != ?", [data.email, userId]);
    if (existing) return { success: false, error: "Email đã được sử dụng bởi tài khoản khác" };
  }

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (data.display_name !== undefined) { fields.push("display_name = ?"); values.push(data.display_name); }
  if (data.email !== undefined) { fields.push("email = ?"); values.push(data.email); }
  if (data.phone !== undefined) { fields.push("phone = ?"); values.push(data.phone); }

  if (fields.length === 0) return { success: false, error: "Không có thông tin cần cập nhật" };

  fields.push("updated_at = CURRENT_TIMESTAMP");
  values.push(userId);

  database.run(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
  saveDb();
  return { success: true };
}

export async function getUserBankAccounts(userId: number): Promise<BankAccount[]> {
  const database = await getDb();
  return queryAll(database, "SELECT id, bank_code, bank_name, account_number, account_holder, is_default, created_at FROM bank_accounts WHERE user_id = ? ORDER BY is_default DESC, created_at DESC", [userId]) as unknown as BankAccount[];
}

export async function addBankAccount(userId: number, data: { bank_code: string; bank_name: string; account_number: string; account_holder: string }): Promise<{ success: boolean; id?: number; error?: string }> {
  const bankCode = (data.bank_code || "").trim();
  const bankName = (data.bank_name || "").trim();
  const accountNumber = (data.account_number || "").trim();
  const accountHolder = (data.account_holder || "").trim();

  if (!bankCode || !bankName) return { success: false, error: "Vui lòng chọn ngân hàng" };
  if (!/^\d{6,20}$/.test(accountNumber)) return { success: false, error: "Số tài khoản phải là 6–20 chữ số" };
  if (accountHolder.length < 2 || accountHolder.length > 100) return { success: false, error: "Tên chủ tài khoản không hợp lệ" };

  const database = await getDb();

  const count = queryOne(database, "SELECT COUNT(*) as c FROM bank_accounts WHERE user_id = ?", [userId]);
  const isDefault = (count?.c as number) === 0 ? 1 : 0;

  const result = database.run("INSERT INTO bank_accounts (user_id, bank_code, bank_name, account_number, account_holder, is_default) VALUES (?, ?, ?, ?, ?, ?)", [userId, bankCode, bankName, accountNumber, accountHolder, isDefault]);

  saveDb();
  return { success: true, id: Number(result.lastInsertRowid) };
}

export async function deleteBankAccount(userId: number, bankId: number): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const row = queryOne(database, "SELECT id FROM bank_accounts WHERE id = ? AND user_id = ?", [bankId, userId]);
  if (!row) return { success: false, error: "Tài khoản ngân hàng không tồn tại" };

  database.run("DELETE FROM bank_accounts WHERE id = ? AND user_id = ?", [bankId, userId]);
  saveDb();
  return { success: true };
}

export async function setDefaultBankAccount(userId: number, bankId: number): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const row = queryOne(database, "SELECT id FROM bank_accounts WHERE id = ? AND user_id = ?", [bankId, userId]);
  if (!row) return { success: false, error: "Tài khoản ngân hàng không tồn tại" };

  database.run("UPDATE bank_accounts SET is_default = 0 WHERE user_id = ?", [userId]);
  database.run("UPDATE bank_accounts SET is_default = 1 WHERE id = ? AND user_id = ?", [bankId, userId]);
  saveDb();
  return { success: true };
}

export async function setWithdrawPin(userId: number, pin: string): Promise<{ success: boolean; error?: string }> {
  if (typeof pin !== "string" || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
    return { success: false, error: "Mật khẩu rút tiền phải là 4–6 chữ số" };
  }
  const database = await getDb();
  const encoded = await hashPasswordEncoded(pin);
  // Lưu hash đã encode trong cột withdraw_pin_hash, để cột salt rỗng (legacy).
  database.run("UPDATE users SET withdraw_pin_hash = ?, withdraw_pin_salt = ?, withdraw_pin_failed_count = 0, withdraw_pin_locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [encoded, "", userId]);
  saveDb();
  return { success: true };
}

export async function verifyWithdrawPin(userId: number, pin: string): Promise<{ valid: boolean; lockedUntil?: string; remaining?: number }> {
  const database = await getDb();
  const row = queryOne(database, "SELECT withdraw_pin_hash, withdraw_pin_salt, withdraw_pin_failed_count, withdraw_pin_locked_until FROM users WHERE id = ?", [userId]);
  if (!row || !row.withdraw_pin_hash) return { valid: false };

  // Kiểm tra lock window.
  const lockedUntilRaw = row.withdraw_pin_locked_until as string | null;
  if (lockedUntilRaw) {
    const lockedUntil = new Date(lockedUntilRaw);
    if (lockedUntil > new Date()) {
      return { valid: false, lockedUntil: lockedUntilRaw };
    }
    // Hết khoá → reset count.
    database.run("UPDATE users SET withdraw_pin_failed_count = 0, withdraw_pin_locked_until = NULL WHERE id = ?", [userId]);
  }

  const stored = row.withdraw_pin_hash as string;
  const legacySalt = row.withdraw_pin_salt as string | null;
  const result = await verifyPassword(pin, stored, legacySalt);

  if (result.valid) {
    if (result.needsUpgrade) {
      const upgraded = await hashPasswordEncoded(pin);
      database.run("UPDATE users SET withdraw_pin_hash = ?, withdraw_pin_salt = ?, withdraw_pin_failed_count = 0, withdraw_pin_locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [upgraded, "", userId]);
    } else {
      database.run("UPDATE users SET withdraw_pin_failed_count = 0, withdraw_pin_locked_until = NULL WHERE id = ?", [userId]);
    }
    saveDb();
    return { valid: true };
  }

  // Đếm sai. 5 lần sai → khoá 15 phút.
  const failed = ((row.withdraw_pin_failed_count as number) || 0) + 1;
  const MAX_ATTEMPTS = 5;
  const LOCK_MS = 15 * 60 * 1000;
  if (failed >= MAX_ATTEMPTS) {
    const lockedUntilIso = new Date(Date.now() + LOCK_MS).toISOString();
    database.run("UPDATE users SET withdraw_pin_failed_count = ?, withdraw_pin_locked_until = ? WHERE id = ?", [failed, lockedUntilIso, userId]);
    saveDb();
    return { valid: false, lockedUntil: lockedUntilIso, remaining: 0 };
  }
  database.run("UPDATE users SET withdraw_pin_failed_count = ? WHERE id = ?", [failed, userId]);
  saveDb();
  return { valid: false, remaining: MAX_ATTEMPTS - failed };
}

export async function createWithdrawRequest(userId: number, bankAccountId: number, amount: number, pin: string): Promise<{ success: boolean; error?: string }> {
  if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: "Số tiền không hợp lệ" };
  amount = Math.floor(amount);

  const database = await getDb();

  const userRow = queryOne(database, "SELECT withdraw_pin_hash FROM users WHERE id = ?", [userId]);
  if (!userRow?.withdraw_pin_hash) return { success: false, error: "Vui lòng cài đặt mật khẩu rút tiền trước" };

  const pinResult = await verifyWithdrawPin(userId, pin);
  if (!pinResult.valid) {
    if (pinResult.lockedUntil) {
      const minutes = Math.max(1, Math.ceil((new Date(pinResult.lockedUntil).getTime() - Date.now()) / 60000));
      return { success: false, error: `Mật khẩu rút tiền bị khoá tạm thời. Thử lại sau ~${minutes} phút.` };
    }
    if (pinResult.remaining !== undefined) {
      return { success: false, error: `Mật khẩu rút tiền không đúng (còn ${pinResult.remaining} lần thử)` };
    }
    return { success: false, error: "Mật khẩu rút tiền không đúng" };
  }

  const bank = queryOne(database, "SELECT id FROM bank_accounts WHERE id = ? AND user_id = ?", [bankAccountId, userId]);
  if (!bank) return { success: false, error: "Tài khoản ngân hàng không hợp lệ" };

  const walletRow = queryOne(database, "SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE -amount END),0) as balance FROM wallet WHERE user_id = ?", [userId]);
  const balance = (walletRow?.balance as number) || 0;
  if (amount > balance) return { success: false, error: "Số dư không đủ" };

  database.run("INSERT INTO withdrawals (user_id, bank_account_id, amount) VALUES (?, ?, ?)", [userId, bankAccountId, amount]);
  database.run("INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)", [userId, `Rút tiền`, amount, "debit"]);
  saveDb();
  return { success: true };
}

export async function resetWallet(username: string): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const user = queryOne(database, "SELECT id FROM users WHERE username = ?", [username]);
  if (!user) return { success: false, error: "Không tìm thấy người dùng" };
  database.run("DELETE FROM wallet WHERE user_id = ?", [user.id as number]);
  saveDb();
  return { success: true };
}

export async function getWalletBalance(username: string): Promise<{ success: boolean; balance?: number; error?: string }> {
  const database = await getDb();
  const user = queryOne(database, "SELECT id FROM users WHERE username = ?", [username]);
  if (!user) return { success: false, error: "Không tìm thấy người dùng" };
  const creditRow = queryOne(database, "SELECT COALESCE(SUM(amount), 0) as total FROM wallet WHERE user_id = ? AND type = 'credit'", [user.id as number]);
  const debitRow = queryOne(database, "SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM wallet WHERE user_id = ? AND type = 'debit'", [user.id as number]);
  const balance = ((creditRow?.total as number) ?? 0) - ((debitRow?.total as number) ?? 0);
  return { success: true, balance };
}

export async function addBalance(username: string, amount: number, label: string = "Bi\u1ebfn \u0111\u1ed9ng s\u1ed1 d\u01b0"): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const user = queryOne(database, "SELECT id FROM users WHERE username = ?", [username]);
  if (!user) return { success: false, error: "Không tìm thấy người dùng" };
  database.run("INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)", [user.id as number, label, amount, "credit"]);
  saveDb();
  return { success: true };
}

export async function subtractBalance(username: string, amount: number, label: string = "Bi\u1ebfn \u0111\u1ed9ng s\u1ed1 d\u01b0"): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const user = queryOne(database, "SELECT id FROM users WHERE username = ?", [username]);
  if (!user) return { success: false, error: "Không tìm thấy người dùng" };

  const walletRow = queryOne(database, "SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE -amount END),0) as balance FROM wallet WHERE user_id = ?", [user.id as number]);
  const balance = (walletRow?.balance as number) || 0;
  if (amount > balance) return { success: false, error: "Số dư không đủ" };

  database.run("INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)", [user.id as number, label, amount, "debit"]);
  saveDb();
  return { success: true };
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: number;
  created_at: string;
}

export async function createNotification(userId: number, title: string, message: string, type: string = "info"): Promise<void> {
  const database = await getDb();
  database.run("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)", [userId, title, message, type]);
  saveDb();
}

export async function getUserNotifications(userId: number, limit: number = 30): Promise<Notification[]> {
  const database = await getDb();
  return queryAll(database, "SELECT id, title, message, type, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?", [userId, limit]) as unknown as Notification[];
}

export async function getUnreadCount(userId: number): Promise<number> {
  const database = await getDb();
  const row = queryOne(database, "SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0", [userId]);
  return (row?.c as number) || 0;
}

export async function markNotificationsRead(userId: number): Promise<void> {
  const database = await getDb();
  database.run("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0", [userId]);
  saveDb();
}

export async function markOneNotificationRead(userId: number, notifId: number): Promise<void> {
  const database = await getDb();
  database.run("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [notifId, userId]);
  saveDb();
}

export async function deleteNotification(userId: number, notifId: number): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const row = queryOne(database, "SELECT id FROM notifications WHERE id = ? AND user_id = ?", [notifId, userId]);
  if (!row) return { success: false, error: "Thông báo không tồn tại" };
  database.run("DELETE FROM notifications WHERE id = ?", [notifId]);
  saveDb();
  return { success: true };
}

export async function createPasswordResetToken(email: string): Promise<{ success: boolean; token?: string; userId?: number; username?: string; error?: string }> {
  const database = await getDb();
  const user = queryOne(database, "SELECT id, username, is_active FROM users WHERE email = ?", [email]);
  // Trả lỗi generic — phía route đã ẩn lỗi này, nhưng giữ nhất quán cho mọi caller.
  if (!user) return { success: false, error: "Email không hợp lệ" };
  if ((user.is_active as number) === 0) return { success: false, error: "Email không hợp lệ" };

  // Vô hiệu mọi token chưa dùng còn hiệu lực để chỉ token mới nhất hoạt động.
  database.run("UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0", [user.id as number]);

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

  // Lưu hash, không lưu plaintext: nếu DB leak, attacker không reset pass được.
  database.run("INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)", [user.id as number, tokenHash, expiresAt]);
  saveDb();

  return { success: true, token, userId: user.id as number, username: user.username as string };
}

export async function verifyResetToken(token: string): Promise<{ valid: boolean; userId?: number }> {
  const database = await getDb();
  const tokenHash = hashToken(token);
  const row = queryOne(database, "SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token = ?", [tokenHash]);
  if (!row) return { valid: false };
  if (row.used) return { valid: false };
  if (new Date(row.expires_at as string) < new Date()) return { valid: false };
  return { valid: true, userId: row.user_id as number };
}

export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const tokenHash = hashToken(token);
  const row = queryOne(database, "SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token = ?", [tokenHash]);
  if (!row) return { success: false, error: "Link đặt lại mật khẩu không hợp lệ" };
  if (row.used) return { success: false, error: "Link đã được sử dụng" };
  if (new Date(row.expires_at as string) < new Date()) return { success: false, error: "Link đã hết hạn (30 phút)" };

  const passwordHash = await hashPasswordEncoded(newPassword);

  database.run("UPDATE users SET password_hash = ?, salt = ?, login_failed_count = 0, login_locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [passwordHash, "", row.user_id as number]);
  database.run("UPDATE password_reset_tokens SET used = 1 WHERE token = ?", [tokenHash]);
  // Invalidate all sessions
  database.run("DELETE FROM sessions WHERE user_id = ?", [row.user_id as number]);
  saveDb();

  return { success: true };
}

// ─── ADMIN FUNCTIONS ───

export interface AdminTimeseriesPoint {
  /** ISO date YYYY-MM-DD */
  date: string;
  orders: number;
  cashback: number;
  revenue: number;
}

/**
 * Lấy dữ liệu hoạt động `days` ngày gần nhất (đơn hàng + cashback + doanh thu mỗi ngày).
 * Bao gồm cả những ngày không có đơn (0) để biểu đồ liền mạch.
 */
export async function getAdminTimeseries(days: number = 7): Promise<AdminTimeseriesPoint[]> {
  const database = await getDb();
  const safeDays = Math.min(Math.max(days, 1), 90);
  const rows = queryAll(
    database,
    `SELECT
      DATE(created_at) AS day,
      COUNT(*) AS orders,
      COALESCE(SUM(cashback), 0) AS cashback,
      COALESCE(SUM(amount), 0) AS revenue
     FROM orders
     WHERE DATE(created_at) >= DATE('now', ?)
     GROUP BY day
     ORDER BY day ASC`,
    [`-${safeDays - 1} days`],
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

  // Lấp đầy các ngày trống.
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
  // Gộp 5 query → 1 round-trip.
  const row = queryOne(
    database,
    `SELECT
      COALESCE((SELECT COUNT(*) FROM users WHERE role = 'user'), 0) AS total_users,
      COALESCE((SELECT COUNT(*) FROM orders), 0) AS total_orders,
      COALESCE((SELECT SUM(cashback) FROM orders), 0) AS total_cashback,
      COALESCE((SELECT COUNT(*) FROM withdrawals WHERE status = 'pending'), 0) AS pending_withdrawals,
      COALESCE((SELECT SUM(amount) FROM withdrawals WHERE status = 'approved'), 0) AS total_withdrawn`,
    [],
  );
  return {
    totalUsers: (row?.total_users as number) || 0,
    totalOrders: (row?.total_orders as number) || 0,
    totalCashback: (row?.total_cashback as number) || 0,
    pendingWithdrawals: (row?.pending_withdrawals as number) || 0,
    totalWithdrawn: (row?.total_withdrawn as number) || 0,
  };
}

export async function getAllUsers(): Promise<Record<string, unknown>[]> {
  const database = await getDb();
  return queryAll(database, "SELECT id, username, email, display_name, phone, role, is_active, email_verified, created_at, last_login FROM users ORDER BY id DESC");
}

export interface PagedResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserListFilter {
  search?: string;        // username / email / display_name
  role?: "admin" | "user" | "all";
  status?: "active" | "blocked" | "unverified" | "all";
  page?: number;
  pageSize?: number;
}

/**
 * Phân trang + tìm kiếm + lọc cho danh sách users.
 *
 * Trả về tổng số kết quả + page hiện tại để client tính tổng số trang.
 */
export async function getAllUsersPaged(filter: UserListFilter = {}): Promise<PagedResult<Record<string, unknown>>> {
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
  if (filter.status === "active") { where.push("is_active = 1 AND email_verified = 1"); }
  else if (filter.status === "blocked") { where.push("is_active = 0"); }
  else if (filter.status === "unverified") { where.push("email_verified = 0"); }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const totalRow = queryOne(database, `SELECT COUNT(*) AS c FROM users ${whereSql}`, params);
  const total = (totalRow?.c as number) || 0;
  const rows = queryAll(
    database,
    `SELECT id, username, email, display_name, phone, role, is_active, email_verified, created_at, last_login
     FROM users ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return { rows, total, page, pageSize };
}

export interface OrderListFilter {
  search?: string;     // order_code / username
  status?: "Đã hoàn tiền" | "Đang xử lý" | "Chờ xác nhận" | "Đã hủy" | "all";
  store?: string;
  fromDate?: string;   // YYYY-MM-DD
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export async function getAllOrdersPaged(filter: OrderListFilter = {}): Promise<PagedResult<Record<string, unknown>>> {
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
  if (filter.status && filter.status !== "all") {
    where.push("o.status = ?"); params.push(filter.status);
  }
  if (filter.store && filter.store.trim()) {
    where.push("o.store = ?"); params.push(filter.store.trim());
  }
  if (filter.fromDate) { where.push("DATE(o.created_at) >= DATE(?)"); params.push(filter.fromDate); }
  if (filter.toDate) { where.push("DATE(o.created_at) <= DATE(?)"); params.push(filter.toDate); }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const totalRow = queryOne(
    database,
    `SELECT COUNT(*) AS c FROM orders o LEFT JOIN users u ON o.user_id = u.id ${whereSql}`,
    params,
  );
  const total = (totalRow?.c as number) || 0;
  const rows = queryAll(
    database,
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

export async function getAllWithdrawalsPaged(filter: WithdrawalListFilter = {}): Promise<PagedResult<Record<string, unknown>>> {
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
  if (filter.status && filter.status !== "all") {
    where.push("w.status = ?"); params.push(filter.status);
  }
  if (filter.fromDate) { where.push("DATE(w.created_at) >= DATE(?)"); params.push(filter.fromDate); }
  if (filter.toDate) { where.push("DATE(w.created_at) <= DATE(?)"); params.push(filter.toDate); }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const totalRow = queryOne(
    database,
    `SELECT COUNT(*) AS c FROM withdrawals w
     LEFT JOIN users u ON w.user_id = u.id
     LEFT JOIN bank_accounts b ON w.bank_account_id = b.id
     ${whereSql}`,
    params,
  );
  const total = (totalRow?.c as number) || 0;
  const rows = queryAll(
    database,
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
  return queryAll(database, `
    SELECT o.*, u.username, u.display_name 
    FROM orders o 
    LEFT JOIN users u ON o.user_id = u.id 
    ORDER BY o.created_at DESC
  `);
}

export async function getAllWithdrawals(): Promise<Record<string, unknown>[]> {
  const database = await getDb();
  return queryAll(database, `
    SELECT w.*, u.username, u.display_name, b.bank_name, b.account_number, b.account_holder
    FROM withdrawals w
    LEFT JOIN users u ON w.user_id = u.id
    LEFT JOIN bank_accounts b ON w.bank_account_id = b.id
    ORDER BY w.created_at DESC
  `);
}

export async function updateWithdrawalStatus(withdrawalId: number, status: string, adminNote?: string | null): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const row = queryOne(database, "SELECT id, user_id, amount, status FROM withdrawals WHERE id = ?", [withdrawalId]);
  if (!row) return { success: false, error: "Yêu cầu rút tiền không tồn tại" };
  if (row.status !== "pending") return { success: false, error: "Yêu cầu đã được xử lý" };

  const note = (adminNote ?? "").toString().trim().slice(0, 500) || null;
  database.run("UPDATE withdrawals SET status = ?, admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [status, note, withdrawalId]);

  if (status === "rejected") {
    const userId = row.user_id as number;
    const amount = row.amount as number;
    database.run("INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)", [userId, "Hoàn tiền rút bị từ chối", amount, "credit"]);
    // Notify với lý do (nếu có)
    const msg = note
      ? `Yêu cầu rút ${amount.toLocaleString("vi-VN")}đ bị từ chối. Lý do: ${note}. Số tiền đã hoàn lại ví.`
      : `Yêu cầu rút ${amount.toLocaleString("vi-VN")}đ bị từ chối. Số tiền đã hoàn lại ví.`;
    database.run(
      "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
      [userId, "Rút tiền bị từ chối", msg, "withdrawal"],
    );
  } else if (status === "approved") {
    const userId = row.user_id as number;
    const amount = row.amount as number;
    database.run(
      "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
      [userId, "Rút tiền đã duyệt", `Yêu cầu rút ${amount.toLocaleString("vi-VN")}đ đã được duyệt và đang chuyển khoản.`, "withdrawal"],
    );
  }

  saveDb();
  return { success: true };
}

export async function adminCreateOrder(userId: number, orderCode: string, store: string, amount: number, cashback: number, status: string): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const user = queryOne(database, "SELECT id FROM users WHERE id = ?", [userId]);
  if (!user) return { success: false, error: "User không tồn tại" };

  database.run(
    "INSERT INTO orders (user_id, order_code, store, amount, cashback, status) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, orderCode, store, amount, cashback, status]
  );

  if (status === "Đã hoàn tiền") {
    database.run("INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)", [userId, "Hoàn tiền đơn hàng", cashback, "credit"]);
    // Đơn đầu tiên hoàn tiền → mark referrer active (nếu có).
    await markRefereeActive(userId);
  }

  saveDb();
  return { success: true };
}

export async function toggleUserActive(userId: number, currentAdminId?: number): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const user = queryOne(database, "SELECT id, is_active, role FROM users WHERE id = ?", [userId]);
  if (!user) return { success: false, error: "Không tìm thấy người dùng" };

  if (currentAdminId !== undefined && (user.id as number) === currentAdminId) {
    return { success: false, error: "Bạn không thể khoá chính mình" };
  }
  if ((user.role as string) === "admin") {
    return { success: false, error: "Không thể khoá tài khoản admin" };
  }

  const newStatus = (user.is_active as number) === 1 ? 0 : 1;
  database.run("UPDATE users SET is_active = ? WHERE id = ?", [newStatus, userId]);
  // Khi block — huỷ toàn bộ session đang mở của user.
  if (newStatus === 0) {
    database.run("DELETE FROM sessions WHERE user_id = ?", [userId]);
  }
  saveDb();
  return { success: true };
}

/**
 * Đổi role của user (promote thành admin / demote về user thường).
 *
 * Quy tắc:
 *   - Admin không được tự đổi role chính mình → tránh tự "lock out".
 *   - Nếu demote admin cuối cùng (chỉ còn 1 admin trong hệ thống) → từ chối.
 *   - User chưa xác thực email không được promote (giảm rủi ro tài khoản giả).
 */
export async function setUserRole(
  userId: number,
  newRole: "admin" | "user",
  currentAdminId?: number,
): Promise<{ success: boolean; error?: string }> {
  if (newRole !== "admin" && newRole !== "user") {
    return { success: false, error: "Role không hợp lệ" };
  }
  const database = await getDb();
  const user = queryOne(database, "SELECT id, role, email_verified, is_active FROM users WHERE id = ?", [userId]);
  if (!user) return { success: false, error: "Không tìm thấy người dùng" };

  if (currentAdminId !== undefined && (user.id as number) === currentAdminId) {
    return { success: false, error: "Bạn không thể đổi role của chính mình" };
  }

  const currentRole = (user.role as string) || "user";
  if (currentRole === newRole) {
    return { success: false, error: "Người dùng đã có role này" };
  }

  if (newRole === "admin") {
    if ((user.is_active as number) === 0) {
      return { success: false, error: "Không thể cấp quyền admin cho tài khoản đang bị khoá" };
    }
    if ((user.email_verified as number) === 0) {
      return { success: false, error: "Người dùng cần xác thực email trước khi được cấp quyền admin" };
    }
  } else {
    // newRole === "user" → demote
    const adminCountRow = queryOne(database, "SELECT COUNT(*) as c FROM users WHERE role = 'admin'", []);
    const adminCount = (adminCountRow?.c as number) || 0;
    if (adminCount <= 1) {
      return { success: false, error: "Không thể hạ cấp admin cuối cùng" };
    }
  }

  database.run("UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [newRole, userId]);
  // Hạ cấp admin → vô hiệu mọi session để buộc đăng nhập lại với role mới.
  if (newRole === "user") {
    database.run("DELETE FROM sessions WHERE user_id = ?", [userId]);
  }
  saveDb();
  return { success: true };
}

export interface ImportOrderItem {
  orderCode: string;
  shopId: string;
  itemId: string;
  productName: string;
  amount: number;
  commission: number;
  status: string; // COMPLETED, PENDING, CANCELLED
  subId?: string; // uid_123 → match user trực tiếp
}

export interface ImportResult {
  total: number;
  matched: number;
  unmatched: number;
  duplicated: number;
  updated: number;
  results: { orderCode: string; itemId: string; userId?: number; username?: string; status: string; message: string }[];
}

export async function importOrders(items: ImportOrderItem[]): Promise<ImportResult> {
  const database = await getDb();
  const result: ImportResult = { total: items.length, matched: 0, unmatched: 0, duplicated: 0, updated: 0, results: [] };

  // Status priority: Đã hủy < Chờ xác nhận < Đang xử lý < Đã hoàn tiền
  const statusRank: Record<string, number> = { "Đã hủy": 0, "Chờ xác nhận": 1, "Đang xử lý": 2, "Đã hoàn tiền": 3 };

  // Pre-load tier config 1 lần cho cả batch (không I/O từng item).
  const basePercent = Number(await getSetting("cashback_base_percent")) || 50;
  const milestone = Math.max(1, Number(await getSetting("referral_milestone_count")) || 50);
  const bonusPercent = Number(await getSetting("referral_milestone_bonus_percent")) || 5;

  // Cache rate per userId trong batch để tránh COUNT(*) lặp lại với cùng user.
  const rateCache = new Map<number, number>();
  function getRateSync(userId: number): number {
    const cached = rateCache.get(userId);
    if (cached !== undefined) return cached;
    const row = queryOne(
      database,
      "SELECT COUNT(*) AS c FROM referrals WHERE referrer_user_id = ? AND bonus_credited = 1",
      [userId],
    );
    const active = (row?.c as number) || 0;
    const rate = active >= milestone ? basePercent + bonusPercent : basePercent;
    rateCache.set(userId, rate);
    return rate;
  }
  function invalidateRate(userId: number) { rateCache.delete(userId); }

  function mapStatus(shopeeStatus: string): string {
    // Bỏ dấu cách thừa, BOM, và khoảng trắng giữa từ
    const raw = (shopeeStatus || "").trim().replace(/\s+/g, " ");
    const s = raw.toUpperCase();
    // Shopee Affiliate xuất nhiều dạng status, cả tiếng Anh và tiếng Việt:
    //   - Đơn hoàn thành: "COMPLETED" / "Hoàn thành"
    //   - Hoa hồng đã thanh toán: "PAID" / "Đã thanh toán" → coi như đã hoàn tiền
    //   - Đang chờ duyệt/xác nhận: "PENDING" / "Đang chờ xử lý"
    //   - Đã huỷ / hoa hồng vô hiệu: "CANCELLED" / "INVALID" / "Đã hủy" / "Đã huỷ"
    //   - Chưa thanh toán: "UNPAID"
    if (
      s === "COMPLETED" ||
      s === "HOÀN THÀNH" || s === "HOAN THANH" ||
      s === "PAID" ||
      s === "ĐÃ THANH TOÁN" || s === "DA THANH TOAN"
    ) return "Đã hoàn tiền";
    if (
      s === "PENDING" || s === "PROCESSING" ||
      s === "ĐANG CHỜ XỬ LÝ" || s === "DANG CHO XU LY" ||
      s === "ĐANG XỬ LÝ" || s === "DANG XU LY" ||
      s === "ĐANG CHỜ" || s === "DANG CHO"
    ) return "Đang xử lý";
    if (
      s === "CANCELLED" || s === "CANCELED" ||
      s === "ĐÃ HỦY" || s === "ĐÃ HUỶ" ||
      s === "DA HUY" ||
      s === "INVALID" ||
      s === "VÔ HIỆU" || s === "VO HIEU"
    ) return "Đã hủy";
    if (
      s === "UNPAID" ||
      s === "CHƯA THANH TOÁN" || s === "CHUA THANH TOAN"
    ) return "Chờ xác nhận";
    return "Chờ xác nhận";
  }

  // Bọc cả batch trong 1 transaction → rollback toàn bộ nếu lỗi giữa chừng,
  // và nhanh hơn ~10-50x cho batch lớn vì chỉ fsync 1 lần.
  database.transaction(() => {
   for (const item of items) {
    const newStatus = mapStatus(item.status);

    // Check if order already exists
    const existingOrder = queryOne(database, "SELECT id, user_id, status, cashback FROM orders WHERE order_code = ?", [item.orderCode]);

    if (existingOrder) {
      const oldStatus = existingOrder.status as string;
      const oldRank = statusRank[oldStatus] ?? 1;
      const newRank = statusRank[newStatus] ?? 1;

      // Only update if new status is higher priority
      if (newRank > oldRank) {
        const userId = existingOrder.user_id as number;
        const oldCashback = existingOrder.cashback as number;
        // Tính cashback theo tỷ lệ hiện tại của user (có thể đã lên tier).
        const ratePercent = getRateSync(userId);
        const cashback = Math.round(item.commission * ratePercent / 100);

        database.run("UPDATE orders SET status = ?, cashback = ? WHERE id = ?", [newStatus, cashback, existingOrder.id as number]);

        // Credit cashback if upgrading to "Đã hoàn tiền" (and wasn't already credited)
        if (newStatus === "Đã hoàn tiền" && oldStatus !== "Đã hoàn tiền" && cashback > 0) {
          database.run("INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)",
            [userId, `Hoàn tiền đơn ${item.orderCode}`, cashback, "credit"]
          );
          database.run("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
            [userId, "Đơn hàng đã duyệt", `Đơn ${item.orderCode} đã hoàn thành! +${cashback.toLocaleString("vi-VN")}đ đã cộng vào ví.`, "order"]
          );

          // Đơn đầu tiên hoàn tiền → đánh dấu referee active cho referrer (nếu có).
          // Inline để giữ trong cùng transaction (markRefereeActive bên ngoài
          // sẽ ghi DB ngay, không an toàn rollback).
          const refRow = queryOne(database, "SELECT id, referrer_user_id, bonus_credited FROM referrals WHERE referee_user_id = ?", [userId]);
          if (refRow && (refRow.bonus_credited as number) === 0) {
            database.run("UPDATE referrals SET bonus_credited = 1, bonus_credited_at = CURRENT_TIMESTAMP WHERE id = ?", [refRow.id as number]);
            const refUserId = refRow.referrer_user_id as number;
            invalidateRate(refUserId);
            // Check nếu referrer vừa đạt mốc → notify.
            const newCountRow = queryOne(database, "SELECT COUNT(*) AS c FROM referrals WHERE referrer_user_id = ? AND bonus_credited = 1", [refUserId]);
            const newCount = (newCountRow?.c as number) || 0;
            if (newCount === milestone) {
              database.run(
                "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
                [refUserId, `🎉 Đạt mốc ${milestone} bạn bè active!`, `Tỷ lệ hoàn tiền của bạn đã được nâng lên ${basePercent + bonusPercent}% (+${bonusPercent}%) cho mọi đơn từ giờ.`, "referral"],
              );
            } else {
              database.run(
                "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
                [refUserId, "Bạn bè đã có đơn đầu tiên!", `Bạn bè bạn giới thiệu đã có đơn hoàn tiền đầu tiên. Tiến độ ${newCount}/${milestone} để mở tier +${bonusPercent}%.`, "referral"],
              );
            }
          }
        } else if (newStatus === "Đã hủy" && oldStatus === "Đã hoàn tiền" && oldCashback > 0) {
          // If cancelled after completed, deduct cashback
          database.run("INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)",
            [userId, `Hủy đơn ${item.orderCode} - trừ hoàn tiền`, oldCashback, "debit"]
          );
          database.run("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
            [userId, "Đơn hàng bị hủy", `Đơn ${item.orderCode} đã bị hủy. -${oldCashback.toLocaleString("vi-VN")}đ.`, "order"]
          );
        }

        result.updated++;
        result.results.push({ orderCode: item.orderCode, itemId: item.itemId, status: "updated", message: `Cập nhật: ${oldStatus} → ${newStatus}` });
      } else {
        result.duplicated++;
        result.results.push({ orderCode: item.orderCode, itemId: item.itemId, status: "skip", message: `Đã tồn tại (${oldStatus}), không cần cập nhật` });
      }
      continue;
    }

    // New order — try sub_id match first, then fallback to affiliate_links
    let userId: number | null = null;
    let username = "";

    // Try direct match via sub_id (uid_123)
    if (item.subId) {
      const uidMatch = item.subId.match(/uid[_-]?(\d+)/i);
      if (uidMatch) {
        const directUser = queryOne(database, "SELECT id, username, display_name FROM users WHERE id = ?", [Number(uidMatch[1])]);
        if (directUser) {
          userId = directUser.id as number;
          username = (directUser.display_name || directUser.username) as string;
        }
      }
    }

    // Fallback: match via affiliate_links
    if (!userId) {
      const link = queryOne(database, `
        SELECT al.user_id, u.username, u.display_name
        FROM affiliate_links al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.shop_id = ? AND al.item_id = ?
        ORDER BY al.created_at DESC
        LIMIT 1
      `, [item.shopId, item.itemId]);

      if (link) {
        userId = link.user_id as number;
        username = (link.display_name || link.username) as string;
      }
    }

    if (!userId) {
      result.unmatched++;
      result.results.push({ orderCode: item.orderCode, itemId: item.itemId, status: "unmatched", message: "Không tìm thấy user tạo link cho sản phẩm này" });
      continue;
    }

    // Tính cashback theo tier hiện tại của user (sau khi đã match userId).
    const ratePercent = getRateSync(userId);
    const cashback = Math.round(item.commission * ratePercent / 100);

    // Create order
    database.run(
      "INSERT INTO orders (user_id, order_code, store, amount, cashback, status) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, item.orderCode, "Shopee", item.amount, cashback, newStatus]
    );

    // Credit cashback if already completed
    if (newStatus === "Đã hoàn tiền" && cashback > 0) {
      database.run("INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)",
        [userId, `Hoàn tiền đơn ${item.orderCode}`, cashback, "credit"]
      );

      // Đơn đầu tiên hoàn tiền → đánh dấu referee active cho referrer (nếu có).
      const refRow = queryOne(database, "SELECT id, referrer_user_id, bonus_credited FROM referrals WHERE referee_user_id = ?", [userId]);
      if (refRow && (refRow.bonus_credited as number) === 0) {
        database.run("UPDATE referrals SET bonus_credited = 1, bonus_credited_at = CURRENT_TIMESTAMP WHERE id = ?", [refRow.id as number]);
        const refUserId = refRow.referrer_user_id as number;
        invalidateRate(refUserId);
        const newCountRow = queryOne(database, "SELECT COUNT(*) AS c FROM referrals WHERE referrer_user_id = ? AND bonus_credited = 1", [refUserId]);
        const newCount = (newCountRow?.c as number) || 0;
        if (newCount === milestone) {
          database.run(
            "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
            [refUserId, `🎉 Đạt mốc ${milestone} bạn bè active!`, `Tỷ lệ hoàn tiền của bạn đã được nâng lên ${basePercent + bonusPercent}% (+${bonusPercent}%) cho mọi đơn từ giờ.`, "referral"],
          );
        } else {
          database.run(
            "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
            [refUserId, "Bạn bè đã có đơn đầu tiên!", `Bạn bè bạn giới thiệu đã có đơn hoàn tiền đầu tiên. Tiến độ ${newCount}/${milestone} để mở tier +${bonusPercent}%.`, "referral"],
          );
        }
      }
    }

    // Notification
    database.run(
      "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
      [userId, "Đơn hàng mới", `Đơn ${item.orderCode} - ${item.productName}. Cashback: ${cashback.toLocaleString("vi-VN")}đ (${newStatus})`, "order"]
    );

    result.matched++;
    result.results.push({ orderCode: item.orderCode, itemId: item.itemId, userId, username, status: "ok", message: `Matched → ${username} (ID: ${userId}), cashback: ${cashback}đ (${ratePercent}%)` });
   }
  });

  saveDb();
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

/** Lấy đầy đủ thông tin 1 user (cho modal admin xem chi tiết). */
export async function getUserDetail(userId: number): Promise<UserDetail | null> {
  const database = await getDb();
  const user = queryOne(
    database,
    `SELECT id, username, email, display_name, phone, role, is_active, email_verified,
            created_at, updated_at, last_login,
            CASE WHEN withdraw_pin_hash IS NOT NULL THEN 1 ELSE 0 END AS has_withdraw_pin,
            COALESCE(totp_enabled, 0) AS totp_enabled
     FROM users WHERE id = ?`,
    [userId],
  );
  if (!user) return null;

  const stats = queryOne(
    database,
    `SELECT
      COALESCE((SELECT SUM(CASE WHEN type='credit' THEN amount ELSE -amount END) FROM wallet WHERE user_id = ?1), 0) AS balance,
      COALESCE((SELECT COUNT(*) FROM orders WHERE user_id = ?1), 0) AS total_orders,
      COALESCE((SELECT SUM(cashback) FROM orders WHERE user_id = ?1 AND status = 'Đã hoàn tiền'), 0) AS total_cashback`,
    [userId],
  );
  const recentOrders = queryAll(
    database,
    "SELECT id, order_code, store, amount, cashback, status, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
    [userId],
  );
  const recentWallet = queryAll(
    database,
    "SELECT id, label, amount, type, created_at FROM wallet WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
    [userId],
  );
  const bankAccounts = queryAll(
    database,
    "SELECT id, bank_code, bank_name, account_number, account_holder, is_default, created_at FROM bank_accounts WHERE user_id = ? ORDER BY is_default DESC, created_at DESC",
    [userId],
  );
  const withdrawals = queryAll(
    database,
    `SELECT w.id, w.amount, w.status, w.admin_note, w.created_at,
            b.bank_name, b.account_number, b.account_holder
     FROM withdrawals w LEFT JOIN bank_accounts b ON w.bank_account_id = b.id
     WHERE w.user_id = ? ORDER BY w.created_at DESC LIMIT 20`,
    [userId],
  );
  const sessions = queryAll(
    database,
    "SELECT id, ip, user_agent, created_at, last_seen_at, expires_at FROM sessions WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP ORDER BY last_seen_at DESC, created_at DESC",
    [userId],
  );

  return {
    user,
    walletBalance: (stats?.balance as number) || 0,
    totalOrders: (stats?.total_orders as number) || 0,
    totalCashback: (stats?.total_cashback as number) || 0,
    recentOrders,
    recentWallet,
    bankAccounts,
    withdrawals,
    sessions,
  };
}

/**
 * Admin force reset password cho user. Sinh password tạm random, trả về clear-text
 * để admin gửi cho user qua kênh tin cậy. Mọi session của user đó sẽ bị huỷ.
 */
export async function adminResetUserPassword(
  targetUserId: number,
  currentAdminId: number,
): Promise<{ success: boolean; tempPassword?: string; error?: string }> {
  if (targetUserId === currentAdminId) {
    return { success: false, error: "Hãy đổi mật khẩu của chính mình qua trang Bảo mật" };
  }
  const database = await getDb();
  const user = queryOne(database, "SELECT id, role FROM users WHERE id = ?", [targetUserId]);
  if (!user) return { success: false, error: "Không tìm thấy người dùng" };
  if ((user.role as string) === "admin") {
    return { success: false, error: "Không thể reset mật khẩu của admin khác" };
  }
  // Sinh 12 ký tự random base32 dễ đọc cho user.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = crypto.randomBytes(12);
  let tempPassword = "";
  for (let i = 0; i < buf.length; i++) tempPassword += alphabet[buf[i] % alphabet.length];

  const hash = await hashPasswordEncoded(tempPassword);
  database.run("UPDATE users SET password_hash = ?, salt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [hash, "", targetUserId]);
  // Huỷ toàn bộ session để buộc đăng nhập lại với mật khẩu mới.
  database.run("DELETE FROM sessions WHERE user_id = ?", [targetUserId]);
  database.run(
    "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
    [targetUserId, "Mật khẩu đã được đặt lại", "Quản trị viên đã đặt lại mật khẩu cho tài khoản của bạn. Vui lòng liên hệ admin để nhận mật khẩu tạm và đổi lại sau khi đăng nhập.", "security"],
  );
  saveDb();
  return { success: true, tempPassword };
}

/** Admin force logout — xoá tất cả session đang mở của user. */
export async function adminForceLogout(targetUserId: number, currentAdminId: number): Promise<{ success: boolean; error?: string; revoked?: number }> {
  if (targetUserId === currentAdminId) {
    return { success: false, error: "Không thể tự logout chính mình từ đây" };
  }
  const database = await getDb();
  const result = database.run("DELETE FROM sessions WHERE user_id = ?", [targetUserId]);
  saveDb();
  return { success: true, revoked: Number(result.changes) || 0 };
}

/** Admin xác minh email thủ công (bypass mail token) — dùng khi user mất hộp thư. */
export async function adminMarkEmailVerified(targetUserId: number): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const user = queryOne(database, "SELECT id, email_verified FROM users WHERE id = ?", [targetUserId]);
  if (!user) return { success: false, error: "Không tìm thấy người dùng" };
  if ((user.email_verified as number) === 1) return { success: false, error: "Email đã được xác minh" };
  database.run("UPDATE users SET email_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [targetUserId]);
  // Vô hiệu các token verify chưa dùng.
  database.run("UPDATE email_verification_tokens SET used = 1 WHERE user_id = ? AND used = 0", [targetUserId]);
  database.run(
    "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
    [targetUserId, "Email đã được xác minh", "Email tài khoản của bạn đã được quản trị viên xác minh thủ công. Bạn có thể đăng nhập bình thường.", "security"],
  );
  saveDb();
  return { success: true };
}

/* ─────────────── ADMIN: Order edit / delete ─────────────── */

export interface AdminOrderUpdate {
  amount?: number;
  cashback?: number;
  status?: string;
  store?: string;
}

/**
 * Sửa đơn thủ công. Tự xử lý chênh lệch ví khi status liên quan tới "Đã hoàn tiền":
 *   - Đang hoàn → status mới khác → trừ cashback cũ ra khỏi ví
 *   - Đang chưa hoàn → "Đã hoàn tiền" → cộng cashback mới vào ví
 *   - Cả 2 đều "Đã hoàn tiền" và cashback đổi → cộng/trừ delta
 */
export async function adminUpdateOrder(orderId: number, update: AdminOrderUpdate): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const existing = queryOne(database, "SELECT id, user_id, order_code, amount, cashback, status FROM orders WHERE id = ?", [orderId]);
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

  const newAmount = update.amount !== undefined ? Math.floor(update.amount) : (existing.amount as number);
  const newCashback = update.cashback !== undefined ? Math.floor(update.cashback) : (existing.cashback as number);
  const newStatus = update.status ?? (existing.status as string);
  const newStore = update.store?.trim() || (existing.store as string);
  const userId = existing.user_id as number;
  const oldStatus = existing.status as string;
  const oldCashback = existing.cashback as number;
  const orderCode = existing.order_code as string;

  database.transaction(() => {
    database.run(
      "UPDATE orders SET amount = ?, cashback = ?, status = ?, store = ? WHERE id = ?",
      [newAmount, newCashback, newStatus, newStore, orderId],
    );

    // Đồng bộ ví theo chuyển trạng thái.
    if (oldStatus !== "Đã hoàn tiền" && newStatus === "Đã hoàn tiền" && newCashback > 0) {
      database.run(
        "INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)",
        [userId, `Hoàn tiền đơn ${orderCode}`, newCashback, "credit"],
      );
      // Mark referrer active inline (cùng transaction).
      const refRow = queryOne(database, "SELECT id, bonus_credited FROM referrals WHERE referee_user_id = ?", [userId]);
      if (refRow && (refRow.bonus_credited as number) === 0) {
        database.run("UPDATE referrals SET bonus_credited = 1, bonus_credited_at = CURRENT_TIMESTAMP WHERE id = ?", [refRow.id as number]);
      }
    } else if (oldStatus === "Đã hoàn tiền" && newStatus !== "Đã hoàn tiền" && oldCashback > 0) {
      database.run(
        "INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)",
        [userId, `Điều chỉnh đơn ${orderCode} - thu hồi hoàn tiền`, oldCashback, "debit"],
      );
    } else if (oldStatus === "Đã hoàn tiền" && newStatus === "Đã hoàn tiền" && newCashback !== oldCashback) {
      const delta = newCashback - oldCashback;
      if (delta > 0) {
        database.run(
          "INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)",
          [userId, `Điều chỉnh đơn ${orderCode} +${delta.toLocaleString("vi-VN")}đ`, delta, "credit"],
        );
      } else if (delta < 0) {
        database.run(
          "INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)",
          [userId, `Điều chỉnh đơn ${orderCode} ${delta.toLocaleString("vi-VN")}đ`, -delta, "debit"],
        );
      }
    }
  });

  saveDb();
  return { success: true };
}

/** Xoá đơn hàng. Nếu đơn đã hoàn tiền → trừ cashback ra khỏi ví. */
export async function adminDeleteOrder(orderId: number): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const existing = queryOne(database, "SELECT id, user_id, order_code, cashback, status FROM orders WHERE id = ?", [orderId]);
  if (!existing) return { success: false, error: "Đơn hàng không tồn tại" };

  database.transaction(() => {
    if ((existing.status as string) === "Đã hoàn tiền" && (existing.cashback as number) > 0) {
      database.run(
        "INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)",
        [existing.user_id as number, `Xoá đơn ${existing.order_code as string} - thu hồi hoàn tiền`, existing.cashback as number, "debit"],
      );
    }
    database.run("DELETE FROM orders WHERE id = ?", [orderId]);
  });

  saveDb();
  return { success: true };
}

/* ─────────────── System settings ─────────────── */

/** Default values cho settings. Khi key chưa có trong DB → fallback về đây. */
export const DEFAULT_SETTINGS: Record<string, string> = {
  withdrawals_enabled: "1",
  registration_enabled: "1",
  min_withdraw_amount: "50000",
  maintenance_mode: "0",
  maintenance_message: "Hệ thống đang bảo trì, vui lòng quay lại sau.",
  // Bắt buộc admin phải bật TOTP để login (sau khi setup lần đầu).
  // Khi bật, login admin chưa setup TOTP sẽ bị từ chối.
  require_admin_2fa: "0",
  // ─── Cashback tier ───
  // Tỷ lệ hoàn tiền cơ bản (% commission). Mặc định 50%.
  cashback_base_percent: "50",
  // Mốc số bạn bè đã có đơn hoàn tiền (active referral) để được nâng tier.
  referral_milestone_count: "50",
  // % cộng thêm vào tỷ lệ cashback khi đạt mốc.
  referral_milestone_bonus_percent: "5",
};

export async function getSetting(key: string): Promise<string> {
  const database = await getDb();
  const row = queryOne(database, "SELECT value FROM system_settings WHERE key = ?", [key]);
  if (row) return row.value as string;
  return DEFAULT_SETTINGS[key] ?? "";
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const database = await getDb();
  const rows = queryAll(database, "SELECT key, value FROM system_settings", []);
  const out: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key as string] = r.value as string;
  return out;
}

export async function setSetting(key: string, value: string): Promise<void> {
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key)) {
    throw new Error(`Setting key không hợp lệ: ${key}`);
  }
  const database = await getDb();
  database.run(
    `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
    [key, value],
  );
  saveDb();
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

export async function addImportHistory(adminUserId: number, fileName: string | null, summary: { total: number; matched: number; updated: number; duplicated: number; unmatched: number }): Promise<void> {
  const database = await getDb();
  database.run(
    "INSERT INTO import_history (admin_user_id, file_name, total, matched, updated, duplicated, unmatched) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [adminUserId, fileName, summary.total, summary.matched, summary.updated, summary.duplicated, summary.unmatched],
  );
  saveDb();
}

export async function getImportHistory(limit: number = 50): Promise<ImportHistoryEntry[]> {
  const database = await getDb();
  const rows = queryAll(
    database,
    `SELECT h.id, h.admin_user_id, u.username AS admin_username, h.file_name, h.total,
            h.matched, h.updated, h.duplicated, h.unmatched, h.created_at
     FROM import_history h LEFT JOIN users u ON h.admin_user_id = u.id
     ORDER BY h.id DESC LIMIT ?`,
    [limit],
  );
  return rows as unknown as ImportHistoryEntry[];
}

/* ─────────────── Email broadcast ─────────────── */

/**
 * Gửi notification system-wide tới mọi user còn active. Trả về số user nhận.
 * `targetRole` = "all" | "user" | "admin".
 */
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
  const users = queryAll(database, `SELECT id FROM users WHERE ${where}`, params);

  const type = options.type || "system";
  database.transaction(() => {
    for (const u of users) {
      database.run(
        "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
        [u.id as number, t, m, type],
      );
    }
  });
  saveDb();
  return { count: users.length };
}

/* ─────────────── DB stats ─────────────── */

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
  const counts = queryOne(
    database,
    `SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM orders) AS orders,
      (SELECT COUNT(*) FROM withdrawals) AS withdrawals,
      (SELECT COUNT(*) FROM wallet) AS wallet_entries,
      (SELECT COUNT(*) FROM notifications) AS notifications,
      (SELECT COUNT(*) FROM audit_logs) AS audit_logs,
      (SELECT COUNT(*) FROM sessions WHERE expires_at > CURRENT_TIMESTAMP) AS sessions_active`,
    [],
  );
  let dbSize: number | null = null;
  try {
    const stat = fs.statSync(DB_PATH);
    dbSize = stat.size;
  } catch { /* ignore */ }
  return {
    users: (counts?.users as number) || 0,
    orders: (counts?.orders as number) || 0,
    withdrawals: (counts?.withdrawals as number) || 0,
    wallet_entries: (counts?.wallet_entries as number) || 0,
    notifications: (counts?.notifications as number) || 0,
    audit_logs: (counts?.audit_logs as number) || 0,
    sessions_active: (counts?.sessions_active as number) || 0,
    db_size_bytes: dbSize,
    db_path: DB_PATH,
  };
}

/* ─────────────── Admin TOTP 2FA ─────────────── */

/**
 * Sinh secret base32 (RFC 4648) cho TOTP — chưa lưu DB ngay.
 * Phải chờ user xác nhận bằng 1 mã đúng từ authenticator (qua confirmTotp).
 *
 * Đúng spec: 20 bytes random → encode base32 chuẩn → 32 ký tự (5 bits/char).
 * Cách cũ (1 byte → 1 char) sai hoàn toàn vì decode lại sẽ ra key ngắn hơn,
 * dẫn tới HMAC mismatch giữa server và authenticator app → mã luôn sai.
 */
export function generateTotpSecret(): string {
  const buf = crypto.randomBytes(20);
  return base32Encode(buf);
}

/** Encode buffer → base32 (RFC 4648, no padding). 5 bytes → 8 ký tự. */
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

/** Decode base32 (RFC 4648, no padding). */
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

/** Tính mã TOTP 6 chữ số tại 1 thời điểm. RFC 6238, T0=0, period=30s, SHA1. */
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

/** Kiểm tra mã TOTP 6 chữ số, cho phép trượt ±3 step (±90s clock skew).
 *
 * ±90s thay vì chuẩn ±30s vì: điện thoại VN đôi khi sai giờ ~30-90s so với NTP
 * (đặc biệt sau khi tắt máy lâu, đổi múi giờ, hoặc tự đổi giờ). Tăng window
 * giảm UX issue mà vẫn không ảnh hưởng bảo mật đáng kể (replay window vẫn ngắn,
 * 7 lần thử chứ không phải brute-force vô hạn). User vẫn được hướng dẫn bật
 * "Đồng bộ giờ tự động" trên điện thoại để tránh skew lớn.
 */
export function verifyTotpCode(secret: string, code: string): boolean {
  const clean = (code || "").replace(/\s+/g, "").trim();
  if (!/^\d{6}$/.test(clean)) return false;
  const now = Date.now();
  // Trượt 7 step: -90s, -60s, -30s, 0, +30s, +60s, +90s
  for (let step = -3; step <= 3; step++) {
    if (generateTotpCode(secret, now + step * 30_000) === clean) return true;
  }
  return false;
}

/**
 * Bắt đầu setup TOTP — sinh secret, lưu vào cột totp_secret nhưng giữ totp_enabled=0
 * cho tới khi user xác nhận thành công bằng confirmTotp.
 *
 * Secret được mã hoá AES-256-GCM trước khi lưu DB. Plaintext chỉ tồn tại trong
 * memory đủ lâu để generate otpauth URL trả về client (1 lần).
 */
export async function startTotpSetup(userId: number): Promise<{ secret: string; otpauthUrl: string }> {
  const database = await getDb();
  const row = queryOne(database, "SELECT username, email FROM users WHERE id = ?", [userId]);
  if (!row) throw new Error("User không tồn tại");
  const secret = generateTotpSecret();
  const enc = encryptSecret(secret);
  database.run("UPDATE users SET totp_secret = ?, totp_enabled = 0 WHERE id = ?", [enc, userId]);
  saveDb();
  // Spec otpauth: `otpauth://totp/<Issuer>:<account>?secret=...&issuer=<Issuer>&...`
  //
  // Một số authenticator app (đặc biệt Google Authenticator iOS) strict với
  // ký tự đặc biệt trong issuer — dấu `-` đôi khi gây fail parse. Dùng
  // "VAffiliate" (không dấu) cho compatibility tối đa, đồng thời account name
  // chỉ là username (không phải email có ký tự `@` cần encode).
  //
  // Xem spec đầy đủ: https://github.com/google/google-authenticator/wiki/Key-Uri-Format
  const issuer = "VAffiliate";
  const account = encodeURIComponent(row.username as string);
  const otpauthUrl = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  return { secret, otpauthUrl };
}

/** Helper đọc TOTP secret từ DB (giải mã nếu cần). Trả null nếu không có / lỗi. */
async function readTotpSecret(database: DbAdapter, userId: number): Promise<string | null> {
  const row = queryOne(database, "SELECT totp_secret FROM users WHERE id = ?", [userId]);
  if (!row || !row.totp_secret) return null;
  return decryptSecret(row.totp_secret as string);
}

/** Xác nhận setup TOTP — sau khi user nhập đúng mã, bật totp_enabled=1. */
export async function confirmTotpSetup(userId: number, code: string): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const secret = await readTotpSecret(database, userId);
  if (!secret) return { success: false, error: "Chưa khởi tạo TOTP" };
  if (!verifyTotpCode(secret, code)) {
    return { success: false, error: "Mã xác thực không đúng" };
  }
  database.run("UPDATE users SET totp_enabled = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [userId]);
  saveDb();
  return { success: true };
}

/** Tắt TOTP — yêu cầu xác thực mã hợp lệ trước khi bỏ. */
export async function disableTotp(userId: number, code: string): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  const row = queryOne(database, "SELECT totp_enabled FROM users WHERE id = ?", [userId]);
  if (!row || !row.totp_enabled) return { success: false, error: "TOTP chưa được bật" };
  const secret = await readTotpSecret(database, userId);
  if (!secret) return { success: false, error: "TOTP secret không đọc được" };
  if (!verifyTotpCode(secret, code)) {
    return { success: false, error: "Mã xác thực không đúng" };
  }
  database.run("UPDATE users SET totp_secret = NULL, totp_enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [userId]);
  saveDb();
  return { success: true };
}

/** Lấy trạng thái TOTP để UI hiển thị. */
export async function getTotpStatus(userId: number): Promise<{ enabled: boolean }> {
  const database = await getDb();
  const row = queryOne(database, "SELECT totp_enabled FROM users WHERE id = ?", [userId]);
  return { enabled: !!(row?.totp_enabled) };
}


/* ─────────────── DB cleanup / vacuum ─────────────── */

export interface CleanupResult {
  expiredSessions: number;
  expiredResetTokens: number;
  expiredVerifyTokens: number;
  oldNotifications: number;
  vacuumDone: boolean;
}

/**
 * Dọn dẹp dữ liệu hết hạn để giữ DB nhẹ + giảm bề mặt tấn công:
 *   - Sessions đã hết hạn
 *   - Reset password tokens đã dùng / hết hạn (đã có cờ used, vẫn xoá để giảm noise)
 *   - Verify email tokens đã dùng / hết hạn
 *   - Notifications cũ hơn `notifKeepDays` (mặc định 90 ngày, đã đọc)
 *
 * `vacuum=true` → chạy VACUUM (chỉ dùng cho cron hằng tuần, lock DB lâu).
 */
export async function cleanupExpired(options: { notifKeepDays?: number; vacuum?: boolean } = {}): Promise<CleanupResult> {
  const database = await getDb();
  const keepDays = Math.max(7, options.notifKeepDays ?? 90);

  const r1 = database.run("DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP");
  const r2 = database.run("DELETE FROM password_reset_tokens WHERE used = 1 OR expires_at < CURRENT_TIMESTAMP");
  const r3 = database.run("DELETE FROM email_verification_tokens WHERE used = 1 OR expires_at < CURRENT_TIMESTAMP");
  const r4 = database.run(
    `DELETE FROM notifications WHERE is_read = 1 AND created_at < datetime('now', ?)`,
    [`-${keepDays} days`],
  );

  let vacuumDone = false;
  if (options.vacuum) {
    try {
      database.exec("VACUUM");
      vacuumDone = true;
    } catch (err) {
      console.error("[cleanup] VACUUM failed:", err);
    }
  }

  saveDb();
  return {
    expiredSessions: Number(r1.changes) || 0,
    expiredResetTokens: Number(r2.changes) || 0,
    expiredVerifyTokens: Number(r3.changes) || 0,
    oldNotifications: Number(r4.changes) || 0,
    vacuumDone,
  };
}


/* ─────────────── Referral system ─────────────── */

/**
 * Bảng referrals: 1 user (referee) chỉ được referred bởi đúng 1 user khác (referrer).
 *
 * Quan hệ chính:
 *   - referrer_user_id: người giới thiệu (đã có sẵn account)
 *   - referee_user_id: người được giới thiệu (vừa đăng ký)
 *
 * Cờ `bonus_credited` = 1 sau khi user được giới thiệu hoàn thành mốc đầu tiên
 * (vd. có 1 đơn hàng "Đã hoàn tiền" >0đ). Khi đó cả 2 phía cùng nhận thưởng.
 *
 * Bảng được tạo lazy ngay lần dùng đầu tiên để không block migration cũ.
 */
function ensureReferralTable(database: DbAdapter): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_user_id INTEGER NOT NULL,
      referee_user_id INTEGER NOT NULL UNIQUE,
      bonus_credited INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      bonus_credited_at DATETIME,
      FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (referee_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  database.run("CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id)");
}

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

/** Tạo quan hệ giới thiệu khi user mới đăng ký với `ref=<username>` trong URL. */
export async function attachReferral(refereeUserId: number, referrerUsername: string): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  ensureReferralTable(database);

  const refRow = queryOne(database, "SELECT id, is_active FROM users WHERE username = ?", [referrerUsername]);
  if (!refRow) return { success: false, error: "Người giới thiệu không tồn tại" };
  if ((refRow.is_active as number) === 0) return { success: false, error: "Người giới thiệu đã bị khoá" };
  const referrerId = refRow.id as number;
  if (referrerId === refereeUserId) return { success: false, error: "Không tự giới thiệu chính mình được" };

  // INSERT OR IGNORE — referee_user_id UNIQUE → chỉ có thể attach 1 lần.
  database.run(
    "INSERT OR IGNORE INTO referrals (referrer_user_id, referee_user_id) VALUES (?, ?)",
    [referrerId, refereeUserId],
  );
  saveDb();
  return { success: true };
}

/** Lấy thống kê referral của 1 user (số người mời, số đã active, tổng bonus). */
export async function getReferralStats(userId: number): Promise<ReferralStats> {
  const database = await getDb();
  ensureReferralTable(database);

  const totalRow = queryOne(database, "SELECT COUNT(*) AS c FROM referrals WHERE referrer_user_id = ?", [userId]);
  const creditedRow = queryOne(database, "SELECT COUNT(*) AS c FROM referrals WHERE referrer_user_id = ? AND bonus_credited = 1", [userId]);
  const bonusRow = queryOne(
    database,
    "SELECT COALESCE(SUM(amount), 0) AS s FROM wallet WHERE user_id = ? AND label LIKE 'Thưởng giới thiệu%'",
    [userId],
  );
  const recent = queryAll(
    database,
    `SELECT r.id, r.referee_user_id, u.username AS referee_username, u.display_name AS referee_display_name,
            r.bonus_credited, r.created_at
     FROM referrals r LEFT JOIN users u ON r.referee_user_id = u.id
     WHERE r.referrer_user_id = ? ORDER BY r.id DESC LIMIT 50`,
    [userId],
  ) as unknown as ReferralStats["recent"];

  return {
    totalReferred: (totalRow?.c as number) || 0,
    bonusCredited: (creditedRow?.c as number) || 0,
    totalBonus: (bonusRow?.s as number) || 0,
    recent,
  };
}

/* ─────────────── Cashback rate (tier) ─────────────── */

export interface CashbackRateInfo {
  /** % commission được hoàn cho user, vd 50 hoặc 55. */
  ratePercent: number;
  /** Số bạn đã active (có ≥1 đơn "Đã hoàn tiền"). */
  activeReferrals: number;
  /** Mốc cần đạt để được nâng tier. */
  milestone: number;
  /** % cơ bản (chưa cộng bonus). */
  basePercent: number;
  /** % bonus thêm khi đạt mốc. */
  bonusPercent: number;
  /** Đã đạt mốc chưa. */
  reachedMilestone: boolean;
}

/**
 * Tính tỷ lệ cashback cho 1 user dựa trên số bạn bè active.
 *
 * Quy tắc:
 *   - Mặc định 50% (cấu hình `cashback_base_percent`).
 *   - Khi đã có ≥ `referral_milestone_count` (mặc định 50) bạn bè
 *     có ít nhất 1 đơn "Đã hoàn tiền" → cộng thêm `referral_milestone_bonus_percent`
 *     (mặc định 5%) → tổng 55%.
 *   - Áp dụng vĩnh viễn (1 lần đạt mốc → giữ tier mãi). Có thể đổi sau bằng
 *     việc thêm logic decay nếu cần.
 */
export async function getCashbackRateForUser(userId: number): Promise<CashbackRateInfo> {
  const database = await getDb();
  ensureReferralTable(database);

  const base = Number(await getSetting("cashback_base_percent")) || 50;
  const milestone = Math.max(1, Number(await getSetting("referral_milestone_count")) || 50);
  const bonus = Number(await getSetting("referral_milestone_bonus_percent")) || 5;

  const row = queryOne(
    database,
    "SELECT COUNT(*) AS c FROM referrals WHERE referrer_user_id = ? AND bonus_credited = 1",
    [userId],
  );
  const active = (row?.c as number) || 0;
  const reached = active >= milestone;
  const ratePercent = reached ? base + bonus : base;

  return {
    ratePercent,
    activeReferrals: active,
    milestone,
    basePercent: base,
    bonusPercent: bonus,
    reachedMilestone: reached,
  };
}

/** Helper sync: tính cashback (đồng) từ commission + tỷ lệ %. */
export function calcCashback(commission: number, ratePercent: number): number {
  if (!Number.isFinite(commission) || commission <= 0) return 0;
  return Math.round((commission * ratePercent) / 100);
}

/**
 * Đánh dấu referee là "active" (đã có ≥1 đơn hoàn tiền) — gọi mỗi lần 1 đơn
 * chuyển sang "Đã hoàn tiền". Nếu là lần đầu, set `bonus_credited=1` cho
 * referrer (làm thay đổi tier nếu đạt mốc).
 *
 * Trả về `true` nếu vừa có thay đổi (referrer mới active thêm 1 người).
 */
export async function markRefereeActive(refereeUserId: number): Promise<boolean> {
  const database = await getDb();
  ensureReferralTable(database);

  const row = queryOne(
    database,
    "SELECT id, referrer_user_id, bonus_credited FROM referrals WHERE referee_user_id = ?",
    [refereeUserId],
  );
  if (!row) return false;
  if ((row.bonus_credited as number) === 1) return false;

  database.run(
    "UPDATE referrals SET bonus_credited = 1, bonus_credited_at = CURRENT_TIMESTAMP WHERE id = ?",
    [row.id as number],
  );
  saveDb();
  return true;
}


/* ─────────────── TOTP Backup Codes ─────────────── */

/**
 * Sinh 10 backup code 1-lần-dùng cho user. Format: 4 nhóm 4 ký tự, vd "ABCD-1234-EFGH-5678".
 * Lưu trữ: chỉ hash sha256 trong DB, plaintext chỉ trả về 1 lần để user lưu trữ ngoài.
 *
 * Gọi sau khi user enable TOTP thành công. Mỗi lần regenerate sẽ huỷ toàn bộ code cũ.
 */
export async function generateBackupCodes(userId: number): Promise<string[]> {
  const database = await getDb();
  // Xoá hết code cũ (kể cả chưa dùng).
  database.run("DELETE FROM totp_backup_codes WHERE user_id = ?", [userId]);

  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bỏ I, O, 0, 1 dễ nhầm
  const codes: string[] = [];
  database.transaction(() => {
    for (let i = 0; i < 10; i++) {
      const buf = crypto.randomBytes(8);
      let raw = "";
      for (let j = 0; j < buf.length; j++) raw += alphabet[buf[j] % alphabet.length];
      // Format thân thiện: ABCD-EFGH (4-4)
      const code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
      codes.push(code);
      database.run(
        "INSERT INTO totp_backup_codes (user_id, code_hash) VALUES (?, ?)",
        [userId, hashToken(code.toUpperCase())],
      );
    }
  });
  saveDb();
  return codes;
}

/** Verify backup code — nếu đúng, mark as used. Trả true nếu hợp lệ. */
export async function consumeBackupCode(userId: number, code: string): Promise<boolean> {
  const database = await getDb();
  const normalized = (code || "").toUpperCase().replace(/\s/g, "");
  if (!/^[A-Z2-9]{4}-?[A-Z2-9]{4}$/.test(normalized)) return false;
  const codeWithDash = normalized.length === 8 ? `${normalized.slice(0, 4)}-${normalized.slice(4)}` : normalized;
  const hash = hashToken(codeWithDash);

  const row = queryOne(database, "SELECT id FROM totp_backup_codes WHERE user_id = ? AND code_hash = ? AND used = 0", [userId, hash]);
  if (!row) return false;
  database.run("UPDATE totp_backup_codes SET used = 1, used_at = CURRENT_TIMESTAMP WHERE id = ?", [row.id as number]);
  saveDb();
  return true;
}

/** Đếm số backup code chưa dùng — để UI cảnh báo khi sắp hết. */
export async function countBackupCodes(userId: number): Promise<{ total: number; remaining: number }> {
  const database = await getDb();
  const total = queryOne(database, "SELECT COUNT(*) AS c FROM totp_backup_codes WHERE user_id = ?", [userId]);
  const remaining = queryOne(database, "SELECT COUNT(*) AS c FROM totp_backup_codes WHERE user_id = ? AND used = 0", [userId]);
  return {
    total: (total?.c as number) || 0,
    remaining: (remaining?.c as number) || 0,
  };
}

/* ─────────────── Device tracking (login alert) ─────────────── */

/**
 * Check fingerprint đã từng login chưa. Nếu chưa → trả `isNew=true` để
 * caller gửi email alert. Luôn upsert (insert nếu mới, update last_seen nếu đã có).
 */
export async function trackKnownDevice(
  userId: number,
  fpHash: string,
  meta: { ip?: string | null; userAgent?: string | null },
): Promise<{ isNew: boolean }> {
  const database = await getDb();
  const existing = queryOne(database, "SELECT id FROM known_devices WHERE user_id = ? AND fp_hash = ?", [userId, fpHash]);
  if (existing) {
    database.run("UPDATE known_devices SET last_seen = CURRENT_TIMESTAMP, ip = COALESCE(?, ip), user_agent = COALESCE(?, user_agent) WHERE id = ?", [meta.ip ?? null, meta.userAgent ?? null, existing.id as number]);
    saveDb();
    return { isNew: false };
  }
  // Lần đầu — chỉ alert nếu user đã có ≥1 device cũ. Lần đầu setup tài khoản
  // không cần alert (hiển nhiên là device mới).
  const others = queryOne(database, "SELECT COUNT(*) AS c FROM known_devices WHERE user_id = ?", [userId]);
  const isReallyNew = ((others?.c as number) || 0) > 0;

  database.run(
    "INSERT INTO known_devices (user_id, fp_hash, ip, user_agent) VALUES (?, ?, ?, ?)",
    [userId, fpHash, meta.ip ?? null, meta.userAgent ?? null],
  );
  saveDb();
  return { isNew: isReallyNew };
}


/**
 * Đếm 3 nhóm việc admin cần xử lý — gọi từ widget "Cần xử lý" + badge sidebar.
 * Gộp vào 1 query cho nhanh.
 */
export interface PendingCounts {
  pendingWithdrawals: number;
  unverifiedUsers: number;
  stuckOrders: number;
}

export async function getPendingCounts(): Promise<PendingCounts> {
  const database = await getDb();
  const row = queryOne(
    database,
    `SELECT
      COALESCE((SELECT COUNT(*) FROM withdrawals WHERE status = 'pending'), 0) AS pending_withdrawals,
      COALESCE((SELECT COUNT(*) FROM users WHERE email_verified = 0 AND is_active = 1), 0) AS unverified_users,
      COALESCE((SELECT COUNT(*) FROM orders WHERE status = 'Đang xử lý' AND created_at < datetime('now', '-30 days')), 0) AS stuck_orders`,
    [],
  );
  return {
    pendingWithdrawals: (row?.pending_withdrawals as number) || 0,
    unverifiedUsers: (row?.unverified_users as number) || 0,
    stuckOrders: (row?.stuck_orders as number) || 0,
  };
}
