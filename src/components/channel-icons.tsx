/**
 * Logo cách điệu cho các sàn thương mại liên kết.
 *
 * Đây là các SVG inline mô phỏng đặc điểm thương hiệu (màu, ký hiệu, hình
 * dáng), KHÔNG copy logo gốc — để tôn trọng bản quyền brand. Mỗi component
 * nhận `size` (mặc định 28).
 */

interface BrandIconProps {
  size?: number;
  className?: string;
}

/* ─────────────── Shopee ─────────────── */
// Đặc trưng: cam #ee4d2d, biểu tượng giỏ mua hàng kèm chữ S.
export function ShopeeIcon({ size = 28, className }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="shopee-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff6a3d" />
          <stop offset="100%" stopColor="#ee4d2d" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="32" height="32" rx="9" fill="url(#shopee-bg)" />
      {/* Quai túi */}
      <path
        d="M11.5 11.5 V10 a4.5 4.5 0 0 1 9 0 v1.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Thân túi */}
      <path
        d="M9 12 H23 L22 24 a1.5 1.5 0 0 1 -1.5 1.4 H11.5 a1.5 1.5 0 0 1 -1.5 -1.4 Z"
        fill="#ffffff"
      />
      {/* Chữ S (móc câu) */}
      <path
        d="M13.6 17.6 c0 -1.4 1 -2.2 2.4 -2.2 c1.2 0 2 0.5 2.5 1 M18.4 19.6 c0 1.5 -1.1 2.4 -2.6 2.4 c-1.4 0 -2.2 -0.6 -2.6 -1.2"
        fill="none"
        stroke="#ee4d2d"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ─────────────── Shopee Food ─────────────── */
// Đặc trưng: cam-đỏ cùng tone Shopee, icon dao+nĩa.
export function ShopeeFoodIcon({ size = 28, className }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="spfood-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff6b6b" />
          <stop offset="100%" stopColor="#e63946" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="32" height="32" rx="9" fill="url(#spfood-bg)" />
      {/* Nĩa */}
      <path
        d="M11 8 V14 M9 8 V12 M13 8 V12 M11 14 V24"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Dao */}
      <path
        d="M21 8 c1 0 1.5 1 1.5 3 V14 c0 0.6 -0.5 1 -1 1 H20.5 V24"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/* ─────────────── TikTok ─────────────── */
// Đặc trưng: nền đen, nốt nhạc với hiệu ứng split màu cyan + magenta.
export function TikTokIcon({ size = 28, className }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="0" y="0" width="32" height="32" rx="9" fill="#010101" />
      {/* Cyan offset */}
      <path
        d="M21.6 9 c0 1.5 0.7 3 2 4 c1 0.7 2 1 3.2 1 V17 c-1.5 0 -3 -0.4 -4.3 -1.2 V21 c0 3.4 -2.7 6 -6 6 c-3.3 0 -6 -2.6 -6 -6 c0 -3.3 2.7 -6 6 -6 c0.4 0 0.7 0 1 0.1 V19 c-0.3 -0.1 -0.6 -0.2 -1 -0.2 c-1.4 0 -2.5 1.1 -2.5 2.5 c0 1.4 1.1 2.5 2.5 2.5 c1.4 0 2.5 -1.1 2.5 -2.5 V9 Z"
        fill="#25f4ee"
        transform="translate(-1 1)"
        opacity="0.85"
      />
      {/* Magenta offset */}
      <path
        d="M21.6 9 c0 1.5 0.7 3 2 4 c1 0.7 2 1 3.2 1 V17 c-1.5 0 -3 -0.4 -4.3 -1.2 V21 c0 3.4 -2.7 6 -6 6 c-3.3 0 -6 -2.6 -6 -6 c0 -3.3 2.7 -6 6 -6 c0.4 0 0.7 0 1 0.1 V19 c-0.3 -0.1 -0.6 -0.2 -1 -0.2 c-1.4 0 -2.5 1.1 -2.5 2.5 c0 1.4 1.1 2.5 2.5 2.5 c1.4 0 2.5 -1.1 2.5 -2.5 V9 Z"
        fill="#fe2c55"
        transform="translate(1 -1)"
        opacity="0.85"
      />
      {/* White trên cùng */}
      <path
        d="M21.6 9 c0 1.5 0.7 3 2 4 c1 0.7 2 1 3.2 1 V17 c-1.5 0 -3 -0.4 -4.3 -1.2 V21 c0 3.4 -2.7 6 -6 6 c-3.3 0 -6 -2.6 -6 -6 c0 -3.3 2.7 -6 6 -6 c0.4 0 0.7 0 1 0.1 V19 c-0.3 -0.1 -0.6 -0.2 -1 -0.2 c-1.4 0 -2.5 1.1 -2.5 2.5 c0 1.4 1.1 2.5 2.5 2.5 c1.4 0 2.5 -1.1 2.5 -2.5 V9 Z"
        fill="#ffffff"
      />
    </svg>
  );
}

/* ─────────────── Lazada ─────────────── */
// Đặc trưng: gradient xanh dương → tím → cam, biểu tượng giỏ mua hàng cách điệu.
export function LazadaIcon({ size = 28, className }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lazada-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f146d" />
          <stop offset="50%" stopColor="#a020f0" />
          <stop offset="100%" stopColor="#ff6900" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="32" height="32" rx="9" fill="url(#lazada-bg)" />
      {/* Giỏ mua hàng */}
      <path
        d="M11 13 H21 L19.5 22 a1.5 1.5 0 0 1 -1.5 1.2 H14 a1.5 1.5 0 0 1 -1.5 -1.2 Z"
        fill="#ffffff"
      />
      {/* Quai */}
      <path
        d="M13 13 V11 a3 3 0 0 1 6 0 V13"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Tia */}
      <circle cx="22" cy="11" r="1" fill="#ffd700" />
      <circle cx="10" cy="11" r="0.8" fill="#ffd700" opacity="0.7" />
    </svg>
  );
}

/* ─────────────── TIKI ─────────────── */
// Đặc trưng: nền xanh dương đậm, chữ "tiki" trắng + tia chớp.
export function TikiIcon({ size = 28, className }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="tiki-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a94ff" />
          <stop offset="100%" stopColor="#0d68b1" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="32" height="32" rx="9" fill="url(#tiki-bg)" />
      {/* Chữ "tiki" stylized */}
      <text
        x="16"
        y="20"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="9"
        fontWeight="900"
        fill="#ffffff"
        letterSpacing="-0.5"
      >
        tiki
      </text>
      {/* Tia chớp dưới chữ */}
      <path
        d="M11 23 L13 21 L12.5 22.5 L14 22 L12 24 L12.5 22.5 Z"
        fill="#ffd700"
      />
      <path
        d="M19 23 L21 21 L20.5 22.5 L22 22 L20 24 L20.5 22.5 Z"
        fill="#ffd700"
      />
    </svg>
  );
}

/* ─────────────── Sendo ─────────────── */
// Đặc trưng: gradient đỏ-cam, chữ "S" sans-serif đậm.
export function SendoIcon({ size = 28, className }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="sendo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff5e3a" />
          <stop offset="100%" stopColor="#d62828" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="32" height="32" rx="9" fill="url(#sendo-bg)" />
      {/* Chữ S stylized */}
      <path
        d="M21 12 c-1 -1.2 -2.5 -2 -4.5 -2 c-2.5 0 -4.5 1.5 -4.5 3.5 c0 1.8 1.5 2.7 4 3.2 l1 0.2 c2.5 0.5 4 1.4 4 3.2 c0 2 -2 3.4 -4.5 3.4 c-2 0 -3.5 -0.7 -4.5 -2"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ─────────────── Điện Máy Xanh ─────────────── */
// Đặc trưng: nền xanh lá đậm #00A651, chữ "DMX" trắng đậm.
export function DienMayXanhIcon({ size = 28, className }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="dmx-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00c853" />
          <stop offset="100%" stopColor="#007e33" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="32" height="32" rx="9" fill="url(#dmx-bg)" />
      {/* Tia sét — biểu tượng điện */}
      <path
        d="M16.5 7 L11 17 H15 L14 25 L20 14 H16 Z"
        fill="#ffeb3b"
        stroke="#ffffff"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
