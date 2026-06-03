# Requirements Document

## Introduction

Dashboard của V-Affiliate hiển thị không nhất quán giữa Android và iOS: avatar header
bị cắt trên màn Android hẹp, chữ thương hiệu chồng vào badge streak, và bố cục bị lệch
ở nhiều trang. Mục tiêu là chuẩn hóa hệ thống responsive (breakpoint, spacing, tap
target, quy tắc flexbox) để toàn bộ dashboard hiển thị nhất quán 1:1 giữa hai nền tảng,
chịu được màn hẹp nhất (320–360px), đồng thời hoàn tất phần fix avatar header đang dở.

Tài liệu này suy ra từ `design.md` (hướng Design-First).

## Glossary

- **Breakpoint**: ngưỡng bề rộng viewport theo Tailwind (`sm=640`, `md=768`, `lg=1024`, `xl=1280`).
- **Tap target**: vùng chạm tối thiểu của nút trên mobile (chuẩn 44×44px) qua class `.tap-target`.
- **Cụm trái / cụm phải**: hai nhóm phần tử trong header (logo+nav / actions+avatar).
- **`min-w-0` / `shrink-0`**: tiện ích Tailwind để xử lý bẫy flexbox (cho phép co / không cho co).
- **`hideTextOnMobile`**: prop của `CaffiliateLogo` để ẩn chữ thương hiệu dưới breakpoint `sm`.
- **Header trang chính / trang con**: header ở `/dashboard` và header dùng chung `DashboardHeader` ở các trang con.

## Requirements

### Requirement 1: Header dashboard không tràn / không chồng trên màn hẹp

**User Story:** Là người dùng truy cập bằng điện thoại Android màn hẹp, tôi muốn header
hiển thị gọn gàng và đầy đủ avatar, để tôi luôn dùng được menu tài khoản như trên iOS.

#### Acceptance Criteria
1. WHEN viewport rộng từ 320px đến 768px THEN header SHALL không tạo scroll ngang (không tràn ngang).
2. WHEN viewport ở bất kỳ kích thước mobile nào THEN avatar người dùng SHALL hiển thị đầy đủ, không bị `overflow` cắt.
3. WHEN viewport nhỏ hơn breakpoint `sm` (640px) THEN chữ thương hiệu "V-Affiliate / Thương mại liên kết" SHALL được ẩn (chỉ hiện icon logo) và SHALL không chồng/dính lên badge streak.
4. WHEN viewport từ `sm` trở lên THEN chữ thương hiệu SHALL hiển thị lại bình thường.

### Requirement 2: Header trang con đồng nhất với header trang chính

**User Story:** Là người dùng điều hướng giữa các trang dashboard, tôi muốn header
giống nhau ở mọi trang, để giao diện không bị "nhảy" khi chuyển trang.

#### Acceptance Criteria
1. WHEN người dùng ở trang con (`/dashboard/cashback`, `/dashboard/help`, `/dashboard/referral`) THEN header (`DashboardHeader`) SHALL có cùng hành vi co giãn với header trang chính.
2. WHEN viewport thay đổi qua các breakpoint (640/768/1024/1280px) THEN header trang con và trang chính SHALL ẩn/hiện cùng một tập phần tử theo cùng quy tắc ưu tiên.
3. WHEN render `CaffiliateLogo` ở header trang con THEN nó SHALL dùng `hideTextOnMobile` giống header trang chính.

### Requirement 3: Quy tắc responsive nhất quán toàn dashboard

**User Story:** Là nhà phát triển, tôi muốn một bộ quy tắc responsive thống nhất, để
các trang dashboard không bị lệch bố cục trên Android.

#### Acceptance Criteria
1. WHEN một flex container ngang chứa phần tử text dài THEN phần tử đó SHALL có `min-w-0` + `truncate`, còn phần tử cố định (icon/avatar/badge) SHALL có `shrink-0`.
2. WHEN viewport ở đúng ranh giới breakpoint (640px, 768px) THEN layout SHALL không bị giật/mất phần tử quan trọng.
3. WHEN một container cần cuộn dọc bên trong flex THEN flex item con SHALL có `min-h-0` để `overflow-y-auto` hoạt động.
4. WHEN áp dụng padding cạnh trang trên mobile THEN SHALL dùng quy ước thống nhất `px-4 sm:px-6`.

### Requirement 4: Vùng chạm đạt chuẩn a11y trên mobile

**User Story:** Là người dùng thao tác bằng ngón tay, tôi muốn các nút đủ lớn để bấm
chính xác, để không bị bấm nhầm.

#### Acceptance Criteria
1. WHEN một nút bấm chính hiển thị trên mobile THEN nó SHALL có vùng chạm tối thiểu 44×44px (qua class `.tap-target`).
2. WHEN nút là icon nhỏ THEN nó SHALL vẫn đạt vùng chạm 44×44px dù icon nhỏ hơn.

### Requirement 5: Không hồi quy chức năng & build sạch

**User Story:** Là chủ sản phẩm, tôi muốn các thay đổi giao diện không phá vỡ chức năng
hiện có, để có thể deploy an toàn.

#### Acceptance Criteria
1. WHEN hoàn tất thay đổi THEN `npm run lint` và `npm run typecheck` SHALL chạy không lỗi.
2. WHEN có thay đổi CSS/layout THEN `npm run build` SHALL build thành công.
3. WHEN chuẩn hóa layout THEN SHALL không thay đổi design tokens (oklch), logic nghiệp vụ, hay `BrandLogo`.
4. WHEN cần token mới (ví dụ `.px-safe`) THEN SHALL chỉ thêm utility mới, không sửa class đang được dùng rộng.
