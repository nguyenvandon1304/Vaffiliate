# Thiết kế: Chuẩn hóa Responsive/Layout Mobile cho Dashboard (Android ↔ iOS)

> Tài liệu này được viết theo hướng **Design-First**. Sau khi chốt thiết kế, ta sẽ
> quay lại bổ sung `requirements.md` (suy ra từ thiết kế) rồi tới `tasks.md`.

## Overview

### Vấn đề
Giao diện dashboard của V-Affiliate hiển thị **không nhất quán giữa Android và iOS**.
Các triệu chứng đã ghi nhận:

1. **Avatar header bị cắt trên Android**: Header dashboard chính
   (`src/app/dashboard/page.tsx`) quá rộng trên màn Android hẹp → cụm phải (avatar)
   bị `overflow-x: hidden` cắt mất. iOS hiển thị đủ.
2. **Chữ thương hiệu chồng badge streak**: Sau fix bước 1 (commit `8aca582`), avatar
   hiện ra nhưng chữ "V-Affiliate / Thương mại liên kết" bị dính/chồng vào badge
   streak "1 ngày" vì header vẫn chật.
3. **Bố cục lệch chung trên Android** ("bố cục bị lệch") ở nhiều trang dashboard.

### Mục tiêu thiết kế
- **Pixel-parity Android ↔ iOS**: cùng một viewport width phải render giống nhau 1:1.
- **Header co giãn an toàn**: không tràn ngang, không chồng phần tử, ưu tiên ẩn dần
  các phần tử ít quan trọng khi chật.
- **Chuẩn hóa nền tảng**: thống nhất breakpoint, spacing, tap-target ≥ 44px, và các
  "bẫy flexbox" (`min-w-0` / `min-h-0`) thành quy tắc dùng chung.
- **Không thêm thư viện mới**: chỉ dùng Tailwind v4 + utility-class hiện có.

### Phi mục tiêu (Out of scope)
- Không đổi bảng màu / design tokens (oklch) hiện tại.
- Không refactor logic nghiệp vụ (cashback, ví, đơn hàng).
- Không đụng `BrandLogo` (chỉ chuẩn hóa `CaffiliateLogo`).

### Nguyên nhân gốc (Root Cause Analysis)

**Vì sao Android khác iOS?**

| Khác biệt | iOS Safari | Android Chrome | Hệ quả |
|---|---|---|---|
| Bề rộng viewport thực | thường ≥ 390px | có dòng máy 360px / 320px | Android hẹp hơn → tràn sớm hơn |
| Cách tính `100vw` & scrollbar | scrollbar overlay | một số máy chiếm chỗ | lệch vài px → wrap khác nhau |
| Font hệ thống mặc định | San Francisco | Roboto (rộng hơn) | cùng text → Android dài hơn → đẩy layout |
| `safe-area-inset` (tai thỏ) | hỗ trợ tốt | không đồng nhất | padding cạnh khác nhau |

→ **Kết luận**: layout đang "vừa khít" trên iOS nhưng **không có khoảng đệm co giãn**
nên Android (hẹp hơn + font rộng hơn) bị tràn/chồng. Giải pháp không phải "sửa riêng
Android" mà là **làm layout chịu được màn hẹp nhất (320–360px)**.

**Bẫy flexbox cụ thể trong header**
- Cụm trái (`logo + nav`) và cụm phải (`streak + tier + avatar`) cùng nằm trong
  `flex ... justify-between`. Khi tổng nội dung > bề rộng, **mặc định flex item không
  co dưới kích thước nội dung** (`min-width: auto`) → tràn ra ngoài → bị `overflow
  hidden` cắt.
- Cách chữa chuẩn: cụm trái phải `min-w-0` (cho phép co + `truncate`), cụm phải phải
  `shrink-0` (không bị bóp), và các phần tử phụ ẩn dần theo breakpoint.

## Architecture

### Sơ đồ cấu trúc header (sau chuẩn hóa)

```
┌─────────────────────────────────────────────────────────────────────┐
│ <header> sticky, bg, border-b, z-30                                   │
│ ┌───────────────────────────────────────────────────────────────┐   │
│ │ container: max-w-6xl, px-4 sm:px-6, h-14, flex, justify-between │   │
│ │  ┌──────────────────────────┐        ┌────────────────────────┐│   │
│ │  │ CỤM TRÁI  (min-w-0)       │        │ CỤM PHẢI (shrink-0)    ││   │
│ │  │  [Logo]  (icon-only<sm)   │        │  Streak (portal)       ││   │
│ │  │  | divider (hidden md)    │        │  CmdBar (hidden sm)    ││   │
│ │  │  Nav icons (hidden md)    │        │  TierPill (hidden sm)  ││   │
│ │  └──────────────────────────┘        │  Theme | Bell          ││   │
│ │                                       │  Avatar (shrink-0)     ││   │
│ │                                       └────────────────────────┘│   │
│ └───────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

Thứ tự ưu tiên hiển thị khi màn hẹp dần (ẩn từ ít quan trọng → quan trọng):
  Nav icons → Tier pill / CmdBar → Tên user (chữ) → Brand text (chữ logo)
  LUÔN giữ: icon logo, avatar, chuông, theme toggle.
```

### Thang breakpoint thống nhất (Tailwind mặc định)

| Tên | min-width | Thiết bị đại diện | Quy ước hiển thị header |
|---|---|---|---|
| (base) | 0px | Android nhỏ 320–360px | Chỉ icon logo + cụm icon phải tối thiểu + avatar |
| `sm` | 640px | điện thoại lớn / phablet | Hiện chữ brand, tên user, tier pill, command bar |
| `md` | 768px | tablet dọc | Hiện nav icons + divider |
| `lg` | 1024px | tablet ngang / desktop nhỏ | đầy đủ |
| `xl` | 1280px | desktop | đầy đủ |

**Quy tắc vàng**: thiết kế & kiểm thử ở **360px trước tiên** (mobile-first thật sự),
không phải 390px. Nếu đẹp ở 360px thì iOS (≥390px) chắc chắn đẹp.

### Chiến lược lan tỏa (toàn dashboard)
1. Sửa tại **component header dùng chung** trước (header chính + `DashboardHeader`)
   để bao phủ phần lớn trang.
2. Rà soát từng **flex container ngang** còn lại theo quy tắc trong phần
   "Components and Interfaces".
3. Ưu tiên sửa tại component, hạn chế đụng CSS global; chỉ **thêm** utility mới chứ
   không sửa class đang được dùng rộng.

## Components and Interfaces

### `CaffiliateLogo` — đã có sẵn prop, cần dùng đúng
Trạng thái hiện tại (đã xác nhận trong `src/components/icons.tsx`):

```tsx
export function CaffiliateLogo({
  className,
  title = "V-Affiliate",
  subtitle = "Thương mại liên kết",
  hideTextOnMobile = false,           // ✅ đã thêm
}: {
  className?: string;
  title?: string;
  subtitle?: string;
  hideTextOnMobile?: boolean;          // ✅ đã thêm
}) {
  return (
    <div className={`group/logo ${className ?? ""}`}>
      <div className="flex items-center gap-2.5">
        <span className="logo-3d ... h-10 w-10 ... shrink-0 overflow-hidden ...">
          <img src="/seo/icon-192.png" alt="V-Affiliate" width={40} height={40} .../>
        </span>
        {/* ✅ đã đổi: ẩn cụm chữ < sm khi hideTextOnMobile */}
        <div className={`flex-col leading-tight min-w-0 ${hideTextOnMobile ? "hidden sm:flex" : "flex"}`}>
          <span className="... truncate">{title}</span>
          <span className="... truncate">{subtitle}</span>
        </div>
      </div>
    </div>
  );
}
```

→ **Phần code component đã xong.** Việc còn lại là **truyền prop** ở các header.

### Header dashboard chính — `src/app/dashboard/page.tsx`
Hiện tại (đã có 1 phần fix `8aca582`):

```tsx
<div className="... h-14 flex items-center justify-between gap-2">
  <div className="flex items-center gap-4 min-w-0">          {/* ✅ min-w-0 */}
    <button ... className="cursor-pointer shrink-0">          {/* ✅ shrink-0 */}
      <CaffiliateLogo />                                      {/* ❌ THIẾU hideTextOnMobile */}
    </button>
    <div className="hidden md:block h-6 w-px ..." />          {/* ✅ divider ẩn < md */}
    <nav className="hidden md:flex ...">…</nav>               {/* ✅ nav ẩn < md */}
  </div>
  <div className="flex items-center gap-2 sm:gap-3 shrink-0"> {/* ✅ shrink-0 */}
    <StreakBadge />
    <CommandBarTrigger ... />                                 {/* nên hidden sm:inline-flex */}
    <div className="hidden sm:block"><TierPill ... /></div>   {/* ✅ ẩn < sm */}
    <ThemeToggleButton />
    <NotificationBell />
    <div className="relative shrink-0" ref={dropdownRef}>     {/* ✅ avatar cụm shrink-0 */}
      <button ...>
        <span className="hidden sm:block ...">{user?...}</span> {/* ✅ tên ẩn < sm */}
        <div className="w-9 h-9 rounded-full ... shrink-0">…</div>
      </button>
    </div>
  </div>
</div>
```

**Thay đổi cần làm:**
1. `<CaffiliateLogo />` → `<CaffiliateLogo hideTextOnMobile />`
   → Trên < `sm` chỉ còn icon logo, giải phóng chỗ → hết chồng badge streak.
2. (Tùy chọn, khuyến nghị) `CommandBarTrigger` thêm `className="hidden sm:inline-flex"`
   nếu nó chiếm chỗ trên màn rất hẹp (360px) — vì lệnh Ctrl+K chủ yếu cho desktop.

### Header trang con — `src/components/DashboardHeader.tsx`
Hiện tại **chưa có** `min-w-0 / shrink-0` và dùng `<CaffiliateLogo />` không prop:

```tsx
<div className="... h-14 flex items-center justify-between">
  <div className="flex items-center gap-4">          {/* ❌ thiếu min-w-0 */}
    <button ...><CaffiliateLogo /></button>          {/* ❌ thiếu shrink-0 + hideTextOnMobile */}
    <div className="hidden md:block ..." />
    <DashboardNavIcons />                              {/* cần kiểm tra tự ẩn < md */}
  </div>
  <div className="flex items-center gap-3">           {/* ❌ thiếu shrink-0 */}
    <StreakBadge />
    <CommandBarTrigger ... />
    <div className="hidden sm:block"><TierPill ... /></div>
    <ThemeToggleButton />
    <NotificationBell />
    <div className="relative" ref={dropdownRef}>      {/* ❌ thiếu shrink-0 */}
      <button ...>
        <span className="hidden sm:block ...">{user?...}</span>
        <div className="w-9 h-9 ...">{initial}</div>   {/* ❌ thiếu shrink-0 */}
      </button>
    </div>
  </div>
</div>
```

**Thay đổi cần làm — đồng bộ y hệt header chính:**
1. Cụm trái: `className="flex items-center gap-4"` → `"flex items-center gap-4 min-w-0"`.
2. Nút logo: thêm `shrink-0`; `<CaffiliateLogo />` → `<CaffiliateLogo hideTextOnMobile />`.
3. Cụm phải: `className="flex items-center gap-3"` → `"flex items-center gap-2 sm:gap-3 shrink-0"`.
4. Cụm avatar: `<div className="relative" …>` → thêm `shrink-0`; vòng tròn initial thêm `shrink-0`.

### Quy tắc remediation áp cho mọi flex container ngang (pseudocode)

```
FOR mỗi flex container nằm ngang (header, toolbar, hàng card, hàng nút):
  - Nếu có item chứa text dài (tên, email, tiêu đề) → item đó thêm `min-w-0` + `truncate`.
  - Nếu có item cố định (icon, avatar, badge) → item đó thêm `shrink-0`.
  - Container cuộn dọc → flex item con phải có `min-h-0` thì `overflow-y-auto` mới cuộn.

FOR mỗi nút bấm chính trên mobile:
  - Áp `.tap-target` (≥44×44px) — đặc biệt nút icon nhỏ.

FOR mỗi padding cạnh trang trên mobile:
  - Dùng `px-4 sm:px-6` thống nhất; cân nhắc safe-area cho thiết bị tai thỏ.
```

### Interface utility class (đã có trong `globals.css`)
| Class | Hợp đồng |
|---|---|
| `.vfa-card` | surface card chuẩn |
| `.vfa-btn-primary` / `.vfa-btn-secondary` | nút CTA chính/phụ |
| `.tap-target` | `min-height/min-width: 44px` + `touch-manipulation` |
| `.nav-bubble` | wrapper nav icon (desktop) |

### (Tùy chọn) Token safe-area mới trong `globals.css`
Chỉ thêm khi xác nhận có vấn đề sát cạnh trên thiết bị tai thỏ:

```css
@layer utilities {
  .px-safe {
    padding-left: max(1rem, env(safe-area-inset-left));
    padding-right: max(1rem, env(safe-area-inset-right));
  }
}
```

## Data Models

Tính năng này **không thêm/đổi model dữ liệu** (không đụng DB, API, hay state nghiệp vụ).
Chỉ chuẩn hóa **token layout** ở tầng UI/CSS:

| Token / quy ước | Giá trị | Phạm vi dùng |
|---|---|---|
| Header height | `h-14` (56px) | mọi header dashboard |
| Padding ngang trang | `px-4 sm:px-6` | container chính |
| Gap cụm header | `gap-2` (base) → `sm:gap-3` | cụm phải header |
| Tap target tối thiểu | `44px` (qua `.tap-target`) | nút bấm mobile |
| Breakpoint chuẩn | `sm=640 / md=768 / lg=1024 / xl=1280` | toàn bộ |
| Ngưỡng ẩn brand text | `< sm` (qua `hideTextOnMobile`) | logo header |

## Correctness Properties

### Property 1: Không tràn ngang
Ở mọi viewport 320–768px, header không tạo scroll ngang (không có overflow ngang ngoài ý muốn).
**Validates: Requirements 1.1, 3.1**

### Property 2: Avatar luôn hiển thị
Avatar (cụm phải) không bao giờ bị `overflow` cắt trên bất kỳ viewport nào.
**Validates: Requirements 1.2**

### Property 3: Không chồng phần tử
Brand text không bao giờ chồng/dính lên badge streak ở bất kỳ breakpoint nào.
**Validates: Requirements 1.3**

### Property 4: Đồng nhất header
Header trang chính và trang con có cùng hành vi co giãn ở mọi breakpoint (640/768/1024/1280px).
**Validates: Requirements 2.1, 2.2**

### Property 5: Không "nhảy" layout tại ranh giới breakpoint
Tại đúng ranh giới breakpoint (640px, 768px) không có hiện tượng giật/mất phần tử quan trọng.
**Validates: Requirements 3.2**

### Property 6: Tap target đạt chuẩn a11y
Mọi nút bấm chính trên mobile có vùng chạm ≥ 44×44px.
**Validates: Requirements 4.1**

## Error Handling
Đây là thay đổi UI thuần (không có luồng lỗi runtime mới). Các "lỗi hiển thị" cần phòng:

| Tình huống | Cách xử lý |
|---|---|
| Tên user quá dài | `min-w-0` + `truncate` để cắt gọn, không đẩy layout |
| Thiếu avatar/ảnh logo | `CaffiliateLogo` dùng `<img>` với `alt`; nếu ảnh lỗi vẫn giữ khung `h-10 w-10` |
| Thiết bị tai thỏ sát cạnh | (tùy chọn) `.px-safe` với `env(safe-area-inset-*)` |
| Người dùng bật reduce-motion | đã có `@media (prefers-reduced-motion: reduce)` tắt animation logo/nav |

## Testing Strategy

| Mức | Cách làm |
|---|---|
| Tĩnh | `npm run lint ; npm run typecheck` (PowerShell dùng `;`) |
| Build | `npm run build` vì có thay đổi CSS/layout |
| Thủ công | Chrome DevTools device toolbar: 320 / 360 (Android nhỏ) / 390 (iPhone) / 414 / 768px — xác nhận avatar không bị cắt, brand text không chồng streak, không tràn ngang |
| Thực tế | Mở trên 1 máy Android thật + 1 iOS thật, so sánh 1:1 header và 2–3 trang con |

**Tiêu chí đạt:**
- Ở 360px: header chỉ hiện icon logo + cụm icon phải + avatar, **không tràn ngang**,
  **không chồng** badge streak.
- Avatar **luôn hiển thị đầy đủ** trên mọi máy.
- Trang con (`/dashboard/cashback`, `/dashboard/help`, `/dashboard/referral`) có header
  **giống hệt** trang chính về hành vi co giãn.

## Rủi ro & Giảm thiểu
| Rủi ro | Giảm thiểu |
|---|---|
| Ẩn nhầm phần tử quan trọng trên mobile | Giữ nguyên tắc ưu tiên ở Architecture; avatar/bell/theme luôn hiển thị |
| `hideTextOnMobile` làm logo desktop mất chữ | Prop chỉ ẩn < `sm`; ≥ `sm` vẫn `flex` hiện chữ |
| Đổi gap gây "nhảy" layout giữa các trang | Dùng đúng 1 bộ class chuẩn cho cả header chính & header con |
| Thay đổi CSS global ảnh hưởng nơi khác | Ưu tiên sửa tại component; chỉ thêm utility mới (không sửa class đang dùng) |

## Tóm tắt thay đổi đề xuất (để lên tasks)
1. Truyền `hideTextOnMobile` vào `<CaffiliateLogo />` ở header dashboard chính.
2. Đồng bộ `min-w-0 / shrink-0 / gap-2 sm:gap-3 / hideTextOnMobile` cho `DashboardHeader.tsx`.
3. Rà soát các flex container ngang khác trên dashboard theo quy tắc remediation.
4. Đảm bảo nút bấm chính mobile đạt `.tap-target` (≥44px).
5. (Tùy chọn) Thêm tiện ích `.px-safe` nếu phát hiện vấn đề safe-area.
6. Verify: lint + typecheck + build + kiểm thử 320/360/390/414/768px.
