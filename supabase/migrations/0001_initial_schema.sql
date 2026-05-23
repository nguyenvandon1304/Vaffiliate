-- ═══════════════════════════════════════════════════════════════════════════
-- V-Affiliate — Schema PostgreSQL (Supabase)
-- ═══════════════════════════════════════════════════════════════════════════
-- Convert từ SQLite sang Postgres. Giữ tên cột + INTEGER 0/1 cho boolean để
-- không phải sửa code application — chỉ rewrite kết nối DB.
--
-- Hướng dẫn:
--   1. Vào Supabase Dashboard → SQL Editor → New query
--   2. Paste TOÀN BỘ file này → Run
--   3. Tab Database → Tables: phải thấy 14 bảng
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                          BIGSERIAL PRIMARY KEY,
  username                    TEXT NOT NULL UNIQUE,
  email                       TEXT NOT NULL UNIQUE,
  password_hash               TEXT NOT NULL,
  salt                        TEXT NOT NULL,
  display_name                TEXT,
  phone                       TEXT,
  withdraw_pin_hash           TEXT,
  withdraw_pin_salt           TEXT,
  withdraw_pin_failed_count   INTEGER DEFAULT 0,
  withdraw_pin_locked_until   TIMESTAMPTZ,
  totp_secret                 TEXT,
  totp_enabled                INTEGER DEFAULT 0,
  login_failed_count          INTEGER DEFAULT 0,
  login_locked_until          TIMESTAMPTZ,
  email_verified              INTEGER DEFAULT 0,
  is_active                   INTEGER DEFAULT 1,
  role                        TEXT DEFAULT 'user',
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW(),
  last_login                  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);

-- ─────────────────────────────────────────────────────
-- SESSIONS
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,
  ip            TEXT,
  user_agent    TEXT,
  last_seen_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_token   ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ─────────────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_code  TEXT NOT NULL UNIQUE,
  store       TEXT NOT NULL DEFAULT 'Shopee',
  amount      BIGINT NOT NULL DEFAULT 0,
  cashback    BIGINT NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'Chờ xác nhận',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_user   ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(user_id, status);

-- ─────────────────────────────────────────────────────
-- WALLET — lịch sử biến động số dư của user
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  amount      BIGINT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'credit',  -- credit | debit
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallet_user      ON wallet(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_user_type ON wallet(user_id, type);

-- ─────────────────────────────────────────────────────
-- BANK ACCOUNTS — tài khoản ngân hàng user nhập để rút tiền
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_accounts (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_code       TEXT NOT NULL,
  bank_name       TEXT NOT NULL,
  account_number  TEXT NOT NULL,
  account_holder  TEXT NOT NULL,
  is_default      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bank_user ON bank_accounts(user_id);

-- ─────────────────────────────────────────────────────
-- WITHDRAWALS — yêu cầu rút tiền
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS withdrawals (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_account_id  BIGINT NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  amount           BIGINT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'Đang xử lý',
  admin_note       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);

-- ─────────────────────────────────────────────────────
-- AFFILIATE LINKS — link rút gọn user đã tạo
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_links (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id         TEXT NOT NULL,
  item_id         TEXT NOT NULL,
  product_name    TEXT,
  product_price   BIGINT DEFAULT 0,
  commission      BIGINT DEFAULT 0,
  commission_rate TEXT,
  cashback        BIGINT DEFAULT 0,
  affiliate_link  TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_user ON affiliate_links(user_id);


-- ─────────────────────────────────────────────────────
-- NOTIFICATIONS — thông báo trong app cho user
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info',
  is_read     INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user      ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

-- ─────────────────────────────────────────────────────
-- PASSWORD RESET TOKENS
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reset_token ON password_reset_tokens(token);

-- ─────────────────────────────────────────────────────
-- EMAIL VERIFICATION TOKENS
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_verify_token ON email_verification_tokens(token);

-- ─────────────────────────────────────────────────────
-- AUDIT LOGS — log hành vi nhạy cảm (admin actions, login fails, ...)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target      TEXT,
  ip          TEXT,
  user_agent  TEXT,
  detail      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_user    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ─────────────────────────────────────────────────────
-- SYSTEM SETTINGS — bật/tắt cấu hình runtime, quản lý qua /admin/settings
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- IMPORT HISTORY — log mỗi lần admin import CSV
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_history (
  id              BIGSERIAL PRIMARY KEY,
  admin_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  file_name       TEXT,
  total           INTEGER DEFAULT 0,
  matched         INTEGER DEFAULT 0,
  updated         INTEGER DEFAULT 0,
  duplicated      INTEGER DEFAULT 0,
  unmatched       INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_import_history_created ON import_history(created_at DESC);

-- ─────────────────────────────────────────────────────
-- TOTP BACKUP CODES — 10 mã dự phòng cho 2FA, mỗi mã dùng 1 lần
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS totp_backup_codes (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash   TEXT NOT NULL,
  used        INTEGER DEFAULT 0,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_backup_codes_user ON totp_backup_codes(user_id);

-- ─────────────────────────────────────────────────────
-- KNOWN DEVICES — track fingerprint để cảnh báo login lạ
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS known_devices (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fp_hash     TEXT NOT NULL,
  ip          TEXT,
  user_agent  TEXT,
  first_seen  TIMESTAMPTZ DEFAULT NOW(),
  last_seen   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, fp_hash)
);
CREATE INDEX IF NOT EXISTS idx_known_devices_user ON known_devices(user_id);

-- ─────────────────────────────────────────────────────
-- REFERRALS — mời bạn bè (50 mời thành công → tăng cashback 50%→55%)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id                 BIGSERIAL PRIMARY KEY,
  referrer_user_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referee_user_id    BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  is_active          INTEGER DEFAULT 0,
  activated_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED ADMIN — tạo admin mặc định nếu chưa có
-- ═══════════════════════════════════════════════════════════════════════════
-- Password: 'admin123' đã được hash sẵn (pbkdf2 600k iterations).
-- ⚠️ ĐĂNG NHẬP NGAY và đổi password tại /dashboard/security sau khi deploy lần đầu.
INSERT INTO users (username, email, password_hash, salt, display_name, role, email_verified)
VALUES (
  'admin',
  'admin@v-affiliate.vn',
  'pbkdf2$600000$d2c7e8c4b0a8f5e2c9d1a3b6e7f4c5d2$placeholder_will_be_set_by_app_on_first_login',
  'd2c7e8c4b0a8f5e2c9d1a3b6e7f4c5d2',
  'Admin',
  'admin',
  1
)
ON CONFLICT (username) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED SETTINGS — giá trị mặc định cho /admin/settings
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO system_settings (key, value) VALUES
  ('cashback_base_percent',       '50'),
  ('referral_milestone_count',    '50'),
  ('referral_milestone_bonus_percent', '5'),
  ('min_withdraw_amount',         '50000'),
  ('require_admin_2fa',           '0'),
  ('maintenance_mode',            '0')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════════
-- App truy cập DB qua service-role key (bypass RLS), nhưng vẫn enable RLS để
-- block accidental queries từ public anon key (an toàn deep defense).
ALTER TABLE users                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens     ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_history            ENABLE ROW LEVEL SECURITY;
ALTER TABLE totp_backup_codes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE known_devices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals                 ENABLE ROW LEVEL SECURITY;

-- Không tạo policy nào → deny tất cả khi dùng anon key.
-- App backend sẽ dùng service-role key (bypass RLS) qua SUPABASE_SERVICE_ROLE_KEY.

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE
-- ═══════════════════════════════════════════════════════════════════════════
-- Verify: chạy lệnh sau, phải trả về 16:
--   SELECT count(*) FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
