# Implementation Plan: Chuẩn hóa Responsive/Layout Mobile cho Dashboard

## Overview

Kế hoạch triển khai việc chuẩn hóa responsive/layout mobile cho toàn bộ dashboard
V-Affiliate, đảm bảo hiển thị nhất quán giữa Android và iOS, đồng thời hoàn tất phần
fix avatar header đang dở. Các task được sắp xếp tăng dần: hoàn tất fix header chính →
đồng bộ header trang con → chuẩn hóa các flex container còn lại → tap target → kiểm thử
→ commit. Mỗi task tham chiếu tới yêu cầu trong `requirements.md`.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2.1"], "description": "Hoàn tất header chính + đồng bộ header trang con (độc lập, song song)" },
    { "wave": 2, "tasks": ["3.1", "3.2", "3.3"], "description": "Rà soát & chuẩn hóa các flex container ngang còn lại" },
    { "wave": 3, "tasks": ["4", "5"], "description": "Tap target ≥44px; (tùy chọn) safe-area nếu cần" },
    { "wave": 4, "tasks": ["6.1", "6.2"], "description": "Kiểm thử tĩnh/build + kiểm thử responsive thủ công" },
    { "wave": 5, "tasks": ["7"], "description": "Commit & đẩy lên main" }
  ]
}
```

Sơ đồ phụ thuộc tổng quát:

```
1 (header chính) ─┐
                  ├─→ 3 (rà soát flex) ─→ 4 (tap target) ─→ 6 (kiểm thử) ─→ 7 (commit)
2 (header con) ───┘                                  ↑
5 (tùy chọn safe-area) ──────────────────────────────┘
```

- Task 1 và 2 độc lập, có thể làm song song.
- Task 3 nên làm sau khi 1 & 2 ổn định (cùng quy tắc co giãn).
- Task 4 sau task 3.
- Task 5 tùy chọn, chỉ khi kiểm thử (6.2) phát hiện vấn đề sát cạnh.
- Task 6 sau khi 1–4 (và 5 nếu có) xong; Task 7 cuối cùng.

## Tasks

- [ ] 1. Hoàn tất fix avatar header trang chính (`/dashboard`)
  - Truyền prop `hideTextOnMobile` vào `<CaffiliateLogo />` trong header dashboard chính (`src/app/dashboard/page.tsx`, cụm logo ~dòng 385) để ẩn chữ thương hiệu dưới `sm`, giải phóng chỗ → hết chồng badge streak.
  - Xác nhận cụm trái đã có `min-w-0`, nút logo `shrink-0`, cụm phải `gap-2 sm:gap-3 shrink-0`, cụm avatar + vòng tròn initial có `shrink-0` (giữ nguyên nếu đã đúng).
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Đồng bộ header trang con (`DashboardHeader.tsx`) với header chính
  - [ ] 2.1 Áp quy tắc co giãn cho `src/components/DashboardHeader.tsx`
    - Cụm trái: `flex items-center gap-4` → thêm `min-w-0`.
    - Nút logo: thêm `shrink-0`; đổi `<CaffiliateLogo />` → `<CaffiliateLogo hideTextOnMobile />`.
    - Cụm phải: `flex items-center gap-3` → `flex items-center gap-2 sm:gap-3 shrink-0`.
    - Cụm avatar: `<div className="relative" …>` → thêm `shrink-0`; vòng tròn initial (`w-9 h-9 …`) → thêm `shrink-0`.
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 3. Rà soát & chuẩn hóa các flex container ngang còn lại trên dashboard
  - [ ] 3.1 Quét các trang dashboard tìm flex container ngang dễ tràn
    - Tìm các hàng có text dài (tên/email/tiêu đề) cạnh phần tử cố định trong `src/app/dashboard/**` và các component header/toolbar liên quan.
    - _Requirements: 3.1, 3.2_
  - [ ] 3.2 Áp quy tắc `min-w-0 + truncate` / `shrink-0`
    - Phần tử text dài → `min-w-0` + `truncate`; phần tử cố định (icon/avatar/badge) → `shrink-0`.
    - Container cuộn dọc trong flex → đảm bảo flex item con có `min-h-0`.
    - _Requirements: 3.1, 3.3_
  - [ ] 3.3 Thống nhất padding cạnh trang
    - Đảm bảo container chính dùng `px-4 sm:px-6` nhất quán giữa các trang.
    - _Requirements: 3.4_

- [ ] 4. Đảm bảo tap target ≥ 44px cho nút bấm chính trên mobile
  - Rà soát các nút icon/nút hành động chính trên dashboard mobile, áp class `.tap-target` cho nút chưa đạt 44×44px.
  - _Requirements: 4.1, 4.2_

- [ ] 5. (Tùy chọn) Thêm tiện ích safe-area nếu phát hiện sát cạnh
  - Chỉ thực hiện nếu kiểm thử thực tế cho thấy nội dung sát cạnh trên thiết bị tai thỏ: thêm `.px-safe` vào `@layer utilities` trong `src/app/globals.css` và áp cho container header/khung trang cần thiết.
  - _Requirements: 5.4_

- [ ] 6. Kiểm thử & xác minh
  - [ ] 6.1 Kiểm thử tĩnh + build
    - Chạy `npm run lint ; npm run typecheck` (PowerShell dùng `;`), rồi `npm run build`. Sửa lỗi nếu có.
    - _Requirements: 5.1, 5.2_
  - [ ] 6.2 Kiểm thử responsive thủ công
    - Dùng Chrome DevTools device toolbar kiểm tra 320 / 360 / 390 / 414 / 768px: avatar không bị cắt, brand text không chồng streak, không tràn ngang, header trang chính & trang con đồng nhất.
    - Xác nhận không thay đổi design tokens, logic nghiệp vụ, hay `BrandLogo`.
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 5.3_

- [ ] 7. Commit & đẩy lên `main`
  - Chạy lại lint+typecheck (pre-commit hook), commit với message mô tả rõ, `git push origin main` (Render tự deploy). Xác nhận bằng `git log origin/main --oneline -1`.
  - _Requirements: 5.1, 5.2_

## Notes

- Phần code `CaffiliateLogo` (prop `hideTextOnMobile`) đã có sẵn trong `src/components/icons.tsx` — task 1 & 2 chỉ cần truyền prop, không sửa component.
- KHÔNG đụng `BrandLogo` và design tokens (oklch).
- PowerShell: dùng `;` thay `&&`. Pre-commit hook tự chạy lint+typecheck.
- KHÔNG tự deploy — push lên `main` thì Render auto-deploy.
- Ưu tiên sửa tại component; chỉ THÊM utility CSS mới, không sửa class đang dùng rộng.
