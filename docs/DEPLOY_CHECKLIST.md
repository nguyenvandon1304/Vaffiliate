# Checklist deploy V-Affiliate (Vercel + Supabase)

## 🔐 Bảo mật — BẮT BUỘC trước deploy

### 1. Env vars (Vercel Dashboard → Project Settings → Environment Variables)
- [ ] `DATABASE_URL` — Transaction Pooler URL từ Supabase (port 6543, có `postgres.<ref>` trong username)
- [ ] `APP_ENCRYPTION_KEY` — sinh `openssl rand -hex 32`. **Backup riêng** ở chỗ khác. Mất key = mất tất cả TOTP secret.
- [ ] `ADMIN_SEED_PASSWORD` — mật khẩu admin lần đầu (≥16 ký tự ngẫu nhiên). Đăng nhập xong **đổi ngay**.
- [ ] `NEXT_PUBLIC_BASE_URL` — domain HTTPS production (vd. `https://vaffiliate.vercel.app`)
- [ ] `ALLOWED_ORIGINS` — nếu có nhiều domain (apex + www), liệt kê đầy đủ
- [ ] `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — keys production cho domain thật
- [ ] `SMTP_USER` / `SMTP_PASS` — App Password Gmail
- [ ] `GOAFFILIATE_API_KEY` — key thuê GoAffiliate cho lookup sản phẩm Shopee
- [ ] `SHOPEE_AFFILIATE_ID` — ID Shopee Affiliate của bạn
- [ ] `DISABLE_RATE_LIMIT` và `DISABLE_TURNSTILE` — **KHÔNG bật**, để trống

### 2. Tài khoản admin
- [ ] Đăng nhập lần đầu → `/dashboard/security` → đổi password admin sang chuỗi mạnh
- [ ] Setup TOTP 2FA cho admin
- [ ] Vào `/admin?tab=settings` → bật `Bắt buộc 2FA cho admin`

### 3. Cấu hình hệ thống
- [ ] Đặt `min_withdraw_amount` phù hợp ở `/admin?tab=settings`
- [ ] Test gửi mail: tạo user mới → email verify click được không
- [ ] Test Turnstile: trang login phải hiện widget Cloudflare

### 4. Backup
- [x] Supabase Free tier: tự backup hằng ngày, giữ 7 ngày (built-in)
- [ ] Supabase Pro tier (nếu nâng cấp): bật Point-in-time recovery

### 5. Cleanup định kỳ
Vercel không có cron miễn phí. Có 3 cách:
1. **GitHub Actions cron** — file `.github/workflows/cleanup.yml` chạy `curl /api/admin/cleanup`
2. **Cron-job.org** — service free, set call hằng đêm
3. **Vercel Pro Cron** — $20/tháng, tích hợp sẵn

```bash
# Manual cleanup (gọi từ admin UI hoặc curl)
curl -X POST https://your-domain.vercel.app/api/admin/cleanup \
  -H "Cookie: session_token=<admin_session>" \
  -H "Content-Type: application/json" \
  -d '{"vacuum":false}'
```

## 🛡️ Bảo mật đã có sẵn (không cần làm gì)

- ✅ pbkdf2 600k iterations + lazy upgrade hash cũ
- ✅ Token reset/verify lưu **hash** trong DB (không phải plaintext)
- ✅ TOTP secret encrypt AES-256-GCM
- ✅ Cookie httpOnly + sameSite=lax + secure=true ở prod
- ✅ Rate limit per-IP (login 10/15min, register 5/h, forgot 5/h)
- ✅ Lock account theo username sau 10 fail (15 phút)
- ✅ Withdraw PIN khoá sau 5 fail (15 phút)
- ✅ Generic error message (chống user enumeration)
- ✅ Timing-safe compare cho mọi password
- ✅ Turnstile captcha bắt buộc cho login/register/forgot
- ✅ Email verification bắt buộc trước khi login
- ✅ CSP siết chặt + COOP same-origin + Permissions-Policy
- ✅ X-Frame-Options SAMEORIGIN + frame-ancestors
- ✅ HSTS 2 năm + preload (production HTTPS)
- ✅ Origin check ở proxy cho mọi POST/PUT/PATCH/DELETE
- ✅ Body size limit 256KB ở proxy + 1MB ở route handler
- ✅ Audit log mọi action nhạy cảm
- ✅ Session sliding 7 ngày + hard cap 30 ngày
- ✅ Force logout khi đổi password
- ✅ Admin không thể tự khoá / hạ cấp / reset password chính mình
- ✅ Không thể demote admin cuối cùng
- ✅ RLS enable trên Supabase (deep defense — block accidental anon queries)

## 🚀 Deploy Vercel CLI

```bash
# 1. Cài Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Link project (lần đầu)
vercel link

# 4. Set env vars (lặp lại cho mỗi key)
vercel env add DATABASE_URL production
vercel env add APP_ENCRYPTION_KEY production
# ... (tất cả env trong checklist mục 1)

# 5. Deploy preview
vercel

# 6. Deploy production
vercel --prod
```

Hoặc dùng UI:
1. Push code lên GitHub
2. Vercel Dashboard → New Project → Import từ GitHub
3. Set tất cả env vars
4. Deploy

## 🚨 Incident response

Nếu nghi ngờ bị xâm nhập:
1. Vào `/admin?tab=settings` → bật **Maintenance mode**
2. Chạy `/api/admin/cleanup` → xoá tất cả session
3. Reset password tất cả admin
4. Soát `/admin/audit` xem hành vi bất thường
5. Backup snapshot Supabase (Dashboard → Backups → Download)
6. Sau khi fix → đổi `APP_ENCRYPTION_KEY` (yêu cầu user setup lại 2FA)
7. Reset password DB Supabase → cập nhật `DATABASE_URL` trong Vercel env

## 📋 Sau khi deploy

- [ ] Smoke test 5 flow chính:
  - Đăng ký user mới → nhận email verify → login
  - Forgot password → reset → login lại
  - Tạo affiliate link → import CSV → cashback đúng vào ví user
  - User rút tiền → admin duyệt → ví user trừ
  - Admin set role + force logout user
- [ ] Kiểm tra mobile responsive (Lighthouse)
- [ ] Test 404/500 page
- [ ] Set Sentry hoặc tương tự để monitor lỗi production
- [ ] Set Cron cleanup (GitHub Actions / cron-job.org)
