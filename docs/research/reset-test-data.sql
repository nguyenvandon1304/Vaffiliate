-- ═══════════════════════════════════════════════════════════════════════════
-- V-AFFILIATE — RESET DATA TEST (chạy 1 lần trước khi launch)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- MỤC ĐÍCH: Xóa sạch dữ liệu test (đơn, ví, rút tiền, vòng quay, referral...)
--           để web bắt đầu từ 0 với số liệu sạch khi mời user thật.
--
-- ⚠️ CẢNH BÁO: Thao tác XÓA VĨNH VIỄN, KHÔNG UNDO được.
--    CHỈ chạy khi chắc chắn web CHƯA có user thật nào ngoài tài khoản test.
--
-- CÁCH CHẠY:
--   1. Vào Supabase Dashboard → project của bạn → SQL Editor
--   2. Bấm "New query"
--   3. Đọc kỹ + chọn PHƯƠNG ÁN A hoặc B bên dưới (bỏ comment phần muốn chạy)
--   4. Bấm "Run"
--   5. Kiểm tra lại trên admin → Đối soát tài chính phải về 0
--
-- KHUYẾN NGHỊ: Backup trước khi chạy (Supabase tự backup daily, hoặc
--              Database → Backups → tạo manual backup nếu Pro tier).
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- BƯỚC 0 (BẮT BUỘC): Kiểm tra trước khi xóa — chạy riêng để xem có gì
-- ───────────────────────────────────────────────────────────────────────────
-- Bỏ comment 2 dòng dưới, chạy TRƯỚC để xem số lượng. Nếu thấy toàn data test → OK xóa.

-- SELECT 'users' AS tbl, COUNT(*) FROM users
-- UNION ALL SELECT 'orders', COUNT(*) FROM orders
-- UNION ALL SELECT 'wallet', COUNT(*) FROM wallet
-- UNION ALL SELECT 'withdrawals', COUNT(*) FROM withdrawals
-- UNION ALL SELECT 'spin_history', COUNT(*) FROM spin_history
-- UNION ALL SELECT 'referrals', COUNT(*) FROM referrals;


-- ═══════════════════════════════════════════════════════════════════════════
-- PHƯƠNG ÁN A (KHUYÊN DÙNG): Reset giao dịch, GIỮ NGUYÊN tất cả tài khoản user
-- ═══════════════════════════════════════════════════════════════════════════
-- Xóa: đơn hàng, ví, rút tiền, link, thông báo, vòng quay, referral, streak,
--      huy hiệu, wishlist, fraud, lịch sử import, audit log, session...
-- GIỮ: tất cả user (cả admin + user test), cấu hình hệ thống, cấu trúc bảng.
--
-- Dùng khi: muốn giữ lại các tài khoản đã đăng ký để test tiếp, chỉ xóa số liệu tiền.
--
-- → Bỏ comment khối BEGIN...COMMIT dưới đây để chạy:

/*
BEGIN;

TRUNCATE TABLE
  orders,
  wallet,
  withdrawals,
  affiliate_links,
  notifications,
  spin_history,
  referrals,
  user_achievements,
  streak_rewards,
  login_history,
  wishlist,
  fraud_flags,
  import_history,
  bank_accounts,
  sessions,
  password_reset_tokens,
  email_verification_tokens
RESTART IDENTITY CASCADE;

-- Reset cột streak trên bảng users về 0 (vì giữ user nhưng xóa tiến trình streak)
UPDATE users SET
  current_streak = 0,
  longest_streak = 0,
  last_streak_date = NULL,
  streak_bonus_claimed_at = NULL;

COMMIT;
*/


-- ═══════════════════════════════════════════════════════════════════════════
-- PHƯƠNG ÁN B: Xóa SẠCH HẾT — chỉ giữ lại tài khoản admin
-- ═══════════════════════════════════════════════════════════════════════════
-- Xóa toàn bộ user thường (cascade xóa hết data của họ) + reset giao dịch admin.
-- GIỮ: chỉ tài khoản role='admin', cấu hình hệ thống, cấu trúc bảng.
--
-- Dùng khi: muốn web hoàn toàn trắng, như chưa từng có ai đăng ký.
--
-- → Bỏ comment khối BEGIN...COMMIT dưới đây để chạy:

/*
BEGIN;

-- 1. Xóa toàn bộ user KHÔNG phải admin → ON DELETE CASCADE tự xóa hết data liên quan
--    (orders, wallet, withdrawals, referrals, spin_history... của user đó)
DELETE FROM users WHERE role != 'admin';

-- 2. Reset sạch các bảng giao dịch còn sót của tài khoản admin (admin cũng có thể đã test)
TRUNCATE TABLE
  orders,
  wallet,
  withdrawals,
  affiliate_links,
  notifications,
  spin_history,
  referrals,
  user_achievements,
  streak_rewards,
  login_history,
  wishlist,
  fraud_flags,
  import_history,
  bank_accounts,
  password_reset_tokens,
  email_verification_tokens
RESTART IDENTITY CASCADE;

-- 3. Reset streak của admin
UPDATE users SET
  current_streak = 0,
  longest_streak = 0,
  last_streak_date = NULL,
  streak_bonus_claimed_at = NULL;

-- 4. (Tùy chọn) Xóa IP blocklist test — bỏ comment nếu muốn
-- TRUNCATE TABLE ip_blocklist RESTART IDENTITY;

COMMIT;
*/


-- ───────────────────────────────────────────────────────────────────────────
-- BƯỚC CUỐI: Kiểm tra sau khi xóa (chạy để xác nhận đã về 0)
-- ───────────────────────────────────────────────────────────────────────────
-- SELECT 'orders' AS tbl, COUNT(*) FROM orders
-- UNION ALL SELECT 'wallet', COUNT(*) FROM wallet
-- UNION ALL SELECT 'withdrawals', COUNT(*) FROM withdrawals
-- UNION ALL SELECT 'users', COUNT(*) FROM users;

-- ═══════════════════════════════════════════════════════════════════════════
-- LƯU Ý SAU KHI CHẠY:
--  • KHÔNG xóa bảng system_settings → giữ cấu hình (cashback %, min withdraw...).
--  • Cấu trúc bảng được giữ nguyên (chỉ xóa dữ liệu).
--  • Nếu PHƯƠNG ÁN B xóa luôn tài khoản admin (do role khác 'admin'),
--    đừng lo: app tự seed lại admin khi khởi động (xem ADMIN_SEED_PASSWORD).
--  • Sau khi chạy, vào admin → Đối soát tài chính → mọi số phải = 0.
-- ═══════════════════════════════════════════════════════════════════════════
