# Kiểm thử & Kiểm soát chất lượng (V-Affiliate)

Mục tiêu: thay vì rà soát thủ công mỗi lần (dễ sót, không nhất quán), dùng một
bộ kiểm tra tự động cố định — chạy y hệt nhau mỗi lần.

## Một lệnh kiểm tra tất cả

```bash
npm run verify
```

Chạy tuần tự: **lint → typecheck → unit test → build**. Nếu lệnh này pass, code
đạt mức kiểm soát cơ bản trước khi deploy.

Các lệnh con (chạy lẻ khi cần):

| Lệnh | Việc |
|------|------|
| `npm run lint` | ESLint — bắt lỗi style + một số bug tĩnh |
| `npm run typecheck` | TypeScript — bắt lỗi kiểu/null/cú pháp |
| `npm run test` | Vitest watch mode (dev) |
| `npm run test:ci` | Vitest chạy 1 lần (unit, CI) |
| `npm run test:integration` | Integration test với DB dev (cần `.env.local`) |
| `npm run test:e2e` | E2E Playwright (tự khởi động dev server) |
| `npm run build` | Next.js production build |
| `npm run check` | lint + typecheck + build (không test) |

## Unit test

- Nằm trong `tests/`, đặt tên `*.test.ts`.
- Test **logic thuần** không cần DB/network: validate, cashback math, CSV
  escaping (chống formula injection), TOTP, cấu hình vòng quay.
- Mỗi lỗi quan trọng đã từng sửa nên có 1 test tương ứng để chống tái phát
  (regression). Ví dụ: `csv.test.ts` khoá lại lỗ hổng CSV injection,
  `totp.test.ts` khoá cửa sổ TOTP ±1.

## Integration test (chạy với DB thật — dev)

- Nằm trong `tests/integration/`, chạy bằng `npm run test:integration`.
- Test các flow cần DB: đăng ký/đăng nhập, đổi mật khẩu, **rút tiền** (rule cần
  ≥1 đơn hoàn tiền, check số dư/PIN, không cho âm ví), admin cộng/trừ tiền.
- Bao gồm regression cho lỗ hổng chiếm tài khoản (C1): `changeUnverifiedEmail`
  phải từ chối mật khẩu sai.

**An toàn — chỉ chạy trên DB dev:**
- `tests/integration/setup.ts` nạp `.env.local` (đang trỏ DB dev) + set
  `INTEGRATION_DB=1`.
- `assertSafeTestDb()` **chặn cứng** nếu `DATABASE_URL` trỏ vào project
  production (`PROD_DB_REF`) → throw ngay, không tạo/xoá data khách thật.
- Mỗi test tạo user tên duy nhất rồi tự xoá (`afterAll` → `DELETE` cascade).
- **Không** nằm trong `npm run verify` / CI (vì CI không có DB). Chạy thủ công
  ở local khi cần.

## CI (GitHub Actions)

`.github/workflows/ci.yml` chạy trên mọi push/PR vào `main` (và `master`):
lint → typecheck → unit test → build. CI là lưới an toàn cuối — không cho merge
code làm hỏng các kiểm tra này.

## Pre-commit hook (chặn lỗi tại máy)

Hook nằm ở `.githooks/pre-commit`, chạy lint + typecheck trước mỗi commit.

Kích hoạt **một lần cho mỗi máy** (vì `core.hooksPath` không version được):

```bash
git config core.hooksPath .githooks
```

Bỏ qua tạm thời (không khuyến khích): `git commit --no-verify`.

## Smoke test production

```bash
powershell -ExecutionPolicy Bypass -File scripts/smoke-test.ps1
```

Ping 13 endpoint trên site live, xác nhận trả đúng mã (200/401). Chạy sau khi
deploy để chắc chắn production còn sống.

## E2E test (Playwright)

```bash
npm run test:e2e
```

- Test trong `e2e/`, chạy trên Chromium (đã `npx playwright install chromium`).
- Tự khởi động dev server (`reuseExistingServer: true` nếu đã chạy).
- Phủ smoke quan trọng: trang chủ load, form đăng nhập/đăng ký, đăng nhập sai
  không vào được dashboard, auth gating (`/dashboard` redirect, API 401/200).
- Cố ý KHÔNG test flow phụ thuộc API ngoài (Shopee/GoAffiliate) hay email thật
  để tránh flaky. Selector dùng placeholder cho ổn định.

## Việc nên làm tiếp (chưa làm)

- E2E sâu hơn: hành trình đăng nhập thật (cần seed user + bypass captcha ở môi
  trường test) → tạo link → admin import → rút tiền → admin duyệt.
- Allowlist host cho resolve short-link (`/api/affiliate`) chống SSRF.
- Giới hạn số kết nối SSE / user.
