-- ════════════════════════════════════════════════════════════════════
-- V-Affiliate — Enable Row-Level Security (RLS) cho tất cả tables
-- ════════════════════════════════════════════════════════════════════
--
-- MỤC ĐÍCH:
--   Fix Supabase Security Advisor warning "RLS Disabled in Public".
--   Bật RLS để chặn anon key truy cập trực tiếp qua PostgREST API.
--
-- ẢNH HƯỞNG ĐẾN APP HIỆN TẠI: KHÔNG.
--   App V-Affiliate kết nối DB bằng connection string với user `postgres`
--   (super user) → tự động bypass RLS. Mọi SQL từ Next.js API vẫn hoạt
--   động bình thường.
--
--   Anon key (nếu có ai đó cố lấy) sẽ bị block hoàn toàn → an toàn hơn.
--
-- CÁCH CHẠY:
--   1. Vào Supabase Dashboard → SQL Editor → New Query
--   2. Paste toàn bộ file này
--   3. Bấm Run
--   4. Vào Security Advisor → bấm Refresh → 28 errors về 0
-- ════════════════════════════════════════════════════════════════════

-- Bật RLS cho tất cả bảng public — không tạo policy nào
-- → Mặc định DENY ALL cho mọi role trừ super user (postgres).
-- → App vẫn hoạt động vì kết nối bằng `postgres` user.

-- ─── Cleanup: drop bảng cũ không còn dùng (nếu có) ───
-- short_links + user_share_targets là tàn dư từ thử nghiệm cũ —
-- code đã revert nhưng bảng còn tồn tại trong Supabase.
DROP TABLE IF EXISTS public.short_links;
DROP TABLE IF EXISTS public.user_share_targets;

-- ─── Bật RLS cho tất cả bảng còn lại ───
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.totp_backup_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.known_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spin_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_blocklist ENABLE ROW LEVEL SECURITY;

-- Verify — nếu mọi bảng đều `rowsecurity = true` thì OK.
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
