# Checklist deploy V-Affiliate

## 🔐 Bảo mật — BẮT BUỘC trước deploy

### 1. Env vars
- [ ] `APP_ENCRYPTION_KEY` — sinh bằng `openssl rand -hex 32` (32 byte). **Backup riêng** ở chỗ khác DB. Mất key = mất tất cả TOTP secret.
- [ ] `ADMIN_SEED_PASSWORD` — mật khẩu admin lần đầu. Mạnh, tối thiểu 16 ký tự ngẫu nhiên. Đăng nhập lần đầu xong **đổi ngay** trong /dashboard/security.
- [ ] `NEXT_PUBLIC_BASE_URL` — domain HTTPS production thật.
- [ ] `ALLOWED_ORIGINS` — nếu có nhiều domain (apex + www), liệt kê đầy đủ.
- [ ] `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — keys production cho domain thật.
- [ ] `SMTP_USER` / `SMTP_PASS` — App Password Gmail (KHÔNG dùng password thật).
- [ ] `DISABLE_RATE_LIMIT` và `DISABLE_TURNSTILE` — **KHÔNG bật**, để trống.

### 2. Tài khoản admin
- [ ] Đăng nhập lần đầu, đổi password admin sang chuỗi mạnh.
- [ ] Setup TOTP 2FA cho admin tại `/dashboard/security`.
- [ ] Vào `/admin?tab=settings` → bật `Bắt buộc 2FA cho admin`.

### 3. Cấu hình hệ thống
- [ ] Đặt `min_withdraw_amount` phù hợp ở `/admin?tab=settings`.
- [ ] Test gửi mail: tạo user mới và verify email — link click được không.
- [ ] Test Turnstile: trên trang login phải hiện widget Cloudflare.

### 4. Backup
- [ ] Lên cron auto chạy `bash scripts/backup-db.sh` hằng ngày, lưu off-site.
- [ ] Test restore: copy `caffiliate.backup.db` → `caffiliate.db` và boot lại — vào được.

### 5. Cleanup định kỳ
Lên cron Linux (vd. `crontab -e`):
```
# Cleanup hằng đêm 3h sáng
0 3 * * * curl -X POST -H "Cookie: session_token=<admin_token>" http://localhost:3000/api/admin/cleanup -d '{"vacuum":false}'

# VACUUM hằng tuần (chủ nhật 4h sáng)
0 4 * * 0 curl -X POST -H "Cookie: session_token=<admin_token>" http://localhost:3000/api/admin/cleanup -d '{"vacuum":true}'
```
Hoặc gọi từ admin UI (nút Cleanup trong tab Cấu hình).

## 🛡️ Bảo mật đã có sẵn (không cần làm gì)

- ✅ pbkdf2 600k iterations + lazy upgrade hash cũ
- ✅ Token reset/verify lưu **hash** trong DB (không phải plaintext)
- ✅ TOTP secret encrypt AES-256-GCM
- ✅ Cookie httpOnly + sameSite=lax + secure=true ở prod
- ✅ Rate limit per-IP (login 10/15min, register 5/h, forgot 5/h)
- ✅ Lock account theo username sau 10 fail (15 phút) — chống IP-rotation
- ✅ Withdraw PIN khoá sau 5 fail (15 phút)
- ✅ Generic error message (chống user enumeration)
- ✅ Timing-safe compare cho mọi password
- ✅ Turnstile captcha bắt buộc cho login/register/forgot
- ✅ Email verification bắt buộc trước khi login
- ✅ CSP siết chặt + COOP same-origin + Permissions-Policy
- ✅ X-Frame-Options SAMEORIGIN + frame-ancestors
- ✅ HSTS 2 năm + preload (production HTTPS)
- ✅ X-Content-Type-Options nosniff
- ✅ Origin check ở proxy cho mọi POST/PUT/PATCH/DELETE
- ✅ Body size limit 256KB ở proxy + 1MB ở route handler
- ✅ Audit log mọi action nhạy cảm (login fail, role change, withdraw, broadcast, cleanup, reset password admin…)
- ✅ Session sliding 7 ngày + hard cap 30 ngày + IP/UA tracking
- ✅ Force logout khi đổi password / admin force logout
- ✅ Admin không thể tự khoá / hạ cấp / reset password chính mình
- ✅ Không thể demote admin cuối cùng

## 🚀 Deploy

### Docker Compose
```bash
# 1. Copy env
cp .env.example .env.local
# 2. Sửa các giá trị bắt buộc (xem checklist ở trên)
nano .env.local
# 3. Build + run
docker compose up -d app
# 4. Theo dõi log
docker compose logs -f app
```

### Vercel
- Đẩy code lên repo Git
- Vào Vercel → Import project → set tất cả env vars
- ⚠️ Vercel multi-region: rate limit in-memory không share giữa các instance.
  Khuyến nghị move sang Redis / Upstash nếu trafficr cao
- ⚠️ Vercel serverless: file-based SQLite không persist giữa cold starts.
  Khuyến nghị dùng Vercel Postgres / Turso

### Self-host (VPS)
- Cài Node ≥ 24 (vì dùng `node:sqlite`)
- `npm ci --omit=dev && npm run build`
- Chạy bằng `pm2 start npm --name v-affiliate -- start`
- Đặt nginx reverse proxy với Let's Encrypt SSL
- Bật firewall, chỉ mở port 80/443

## 🚨 Incident response

Nếu nghi ngờ bị xâm nhập:
1. Vào `/admin?tab=settings` → bật **Maintenance mode**
2. Chạy `/api/admin/cleanup` → xoá tất cả session
3. Reset password tất cả admin (qua DB hoặc reset từ user khác)
4. Soát `/admin/audit` xem hành vi bất thường
5. Backup snapshot hiện tại trước khi điều tra
6. Sau khi fix → đổi `APP_ENCRYPTION_KEY` (yêu cầu user setup lại 2FA)

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
