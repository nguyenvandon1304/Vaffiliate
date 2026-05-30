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
| `npm run test:ci` | Vitest chạy 1 lần (CI) |
| `npm run build` | Next.js production build |
| `npm run check` | lint + typecheck + build (không test) |

## Unit test

- Nằm trong `tests/`, đặt tên `*.test.ts`.
- Test **logic thuần** không cần DB/network: validate, cashback math, CSV
  escaping (chống formula injection), TOTP, cấu hình vòng quay.
- Mỗi lỗi quan trọng đã từng sửa nên có 1 test tương ứng để chống tái phát
  (regression). Ví dụ: `csv.test.ts` khoá lại lỗ hổng CSV injection,
  `totp.test.ts` khoá cửa sổ TOTP ±1.

Lưu ý: các flow cần DB thật (rút tiền, import đơn, session...) **không** test ở
đây vì `.env.local` đang trỏ vào DB production. Muốn test các flow đó cần DB
riêng cho test (xem "Việc nên làm tiếp").

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

## Việc nên làm tiếp (chưa làm)

- Tách DB test riêng (Supabase project khác hoặc Postgres docker) → cho phép
  test integration các flow tiền/auth thật sự.
- E2E test (Playwright) cho hành trình người dùng: đăng ký → tạo link → rút tiền.
- Rate-limit cho `/api/affiliate`, allowlist host cho resolve short-link.
