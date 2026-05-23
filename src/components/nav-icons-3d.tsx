/**
 * Icon 3D có animation cho navbar dashboard.
 *
 * - SVG thuần, không phụ thuộc thư viện 3D.
 * - Mỗi icon là một "viên kẹo" với gradient (sáng-tối), highlight specular,
 *   và inner shadow nhẹ để tạo cảm giác có chiều sâu.
 * - Animation chạy qua CSS keyframes định nghĩa ở `globals.css`, kích hoạt qua
 *   `data-active` / `:hover`. Idle hoàn toàn đứng yên để không gây nhiễu.
 * - `id` dùng `useId` để tránh va chạm <defs> khi nhiều icon cùng render.
 */
"use client";

import { useId } from "react";

interface NavIcon3DProps {
  active?: boolean;
  size?: number;
  className?: string;
}

const ACTIVE = {
  topFill: "#fff7ed",
  midFill: "#fb923c",
  botFill: "#c2410c",
  glyph: "#ffffff",
  shadow: "rgba(234, 88, 12, 0.55)",
  highlight: "rgba(255, 255, 255, 0.85)",
};

const IDLE = {
  topFill: "#ffffff",
  midFill: "#e5e7eb",
  botFill: "#9ca3af",
  glyph: "#475569",
  shadow: "rgba(15, 23, 42, 0.25)",
  highlight: "rgba(255, 255, 255, 0.9)",
};

function tones(active: boolean) {
  return active ? ACTIVE : IDLE;
}

/** Khung tròn 3D dùng chung. children = glyph nội bên trong (đã translate sẵn). */
function Bubble({
  id,
  active,
  size,
  className,
  children,
}: NavIcon3DProps & { id: string; children: React.ReactNode }) {
  const t = tones(!!active);
  const s = size ?? 28;
  const gradId = `grad-${id}`;
  const glossId = `gloss-${id}`;
  const shadowId = `shadow-${id}`;

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor={t.topFill} />
          <stop offset="55%" stopColor={t.midFill} />
          <stop offset="100%" stopColor={t.botFill} />
        </linearGradient>
        <radialGradient id={glossId} cx="35%" cy="22%" r="55%">
          <stop offset="0%" stopColor={t.highlight} />
          <stop offset="100%" stopColor={t.highlight} stopOpacity="0" />
        </radialGradient>
        <filter id={shadowId} x="-30%" y="-20%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="0.9" />
          <feOffset dx="0" dy="0.6" result="off" />
          <feFlood floodColor={t.shadow} />
          <feComposite in2="off" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <ellipse cx="16" cy="29.5" rx="9" ry="1.2" fill={t.shadow} opacity={active ? 0.55 : 0.35} />

      <circle cx="16" cy="15" r="13" fill={`url(#${gradId})`} filter={`url(#${shadowId})`} />

      <ellipse cx="11.5" cy="9" rx="6.5" ry="3.8" fill={`url(#${glossId})`} />

      {/* Glyph được wrap trong <g> dịch về (8,7) — animation áp lên child này */}
      <g transform="translate(8 7)" stroke={t.glyph} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        {children}
      </g>
    </svg>
  );
}

/* ─────────────── 5 icon ─────────────── */

export function GridIcon3D(props: NavIcon3DProps) {
  const id = useId();
  const t = tones(!!props.active);
  return (
    <Bubble id={id} {...props}>
      <g data-glyph="grid">
        <rect x="1"  y="1"  width="6" height="6" rx="1.2" fill={t.glyph} stroke="none" />
        <rect x="9"  y="1"  width="6" height="6" rx="1.2" fill={t.glyph} stroke="none" />
        <rect x="1"  y="9"  width="6" height="6" rx="1.2" fill={t.glyph} stroke="none" />
        <rect x="9"  y="9"  width="6" height="6" rx="1.2" fill={t.glyph} stroke="none" />
      </g>
    </Bubble>
  );
}

export function LinkIcon3D(props: NavIcon3DProps) {
  const id = useId();
  return (
    <Bubble id={id} {...props}>
      <g data-glyph="link">
        <path d="M3 9.5a3.5 3.5 0 0 0 5 .4l2.2-2.2a3.5 3.5 0 0 0-4.95-4.95L4 4" />
        <path d="M13 6.5a3.5 3.5 0 0 0-5-.4L5.8 8.3a3.5 3.5 0 0 0 4.95 4.95L12 12" />
      </g>
    </Bubble>
  );
}

export function ClockIcon3D(props: NavIcon3DProps) {
  const id = useId();
  return (
    <Bubble id={id} {...props}>
      <g data-glyph="clock">
        <circle cx="8" cy="8" r="7" />
        {/* Kim đồng hồ tách thành group riêng để xoay quanh tâm 8,8 */}
        <g data-glyph="clock-hand">
          <line x1="8" y1="8" x2="8" y2="3.5" />
          <line x1="8" y1="8" x2="11" y2="9.5" strokeWidth="1.5" />
        </g>
      </g>
    </Bubble>
  );
}

export function OrdersIcon3D(props: NavIcon3DProps) {
  const id = useId();
  return (
    <Bubble id={id} {...props}>
      <g data-glyph="orders">
        <path d="M5 1 H11 L13 4 V14 a1 1 0 0 1 -1 1 H4 a1 1 0 0 1 -1 -1 V4 Z" />
        <path d="M3 4 H13" />
        <path d="M11 7 a3 3 0 0 1 -6 0" />
      </g>
    </Bubble>
  );
}

export function WalletIcon3D(props: NavIcon3DProps) {
  const id = useId();
  const t = tones(!!props.active);
  return (
    <Bubble id={id} {...props}>
      <g data-glyph="wallet">
        <rect x="1" y="3" width="14" height="11" rx="1.5" />
        <path d="M1 6 H15" strokeWidth="2.4" />
        <circle cx="11.5" cy="10.5" r="0.9" fill={t.glyph} stroke="none" />
        {/* Dải sáng quét ngang qua thẻ — animation translate */}
        <g data-glyph="wallet-shimmer">
          <rect
            x="-3"
            y="9"
            width="2.5"
            height="3"
            rx="1"
            fill={t.glyph}
            opacity={0}
            stroke="none"
          />
        </g>
      </g>
    </Bubble>
  );
}


/** Help / Hướng dẫn — dấu hỏi tròn 3D, có animation xoay nhẹ khi active. */
export function HelpIcon3D(props: NavIcon3DProps) {
  const id = useId();
  return (
    <Bubble id={id} {...props}>
      <g data-glyph="help">
        {/* Dấu hỏi: cong trên + chấm dưới */}
        <path d="M6 6 a2.4 2.4 0 1 1 4.6 1 c-0.6 0.8 -1.6 1.1 -1.6 2.2" strokeLinecap="round" />
        <circle cx="9" cy="12" r="0.9" stroke="none" fill="currentColor" />
      </g>
    </Bubble>
  );
}

/** Referral / Giới thiệu bạn bè — 2 hình người + dấu cộng. */
export function ReferralIcon3D(props: NavIcon3DProps) {
  const id = useId();
  const t = tones(!!props.active);
  return (
    <Bubble id={id} {...props}>
      <g data-glyph="referral">
        {/* Người chính (trái) */}
        <circle cx="6" cy="6" r="2.2" />
        <path d="M2 14 a4 4 0 0 1 8 0" strokeLinecap="round" />
        {/* Dấu + ở góc phải-trên = mời thêm */}
        <g>
          <line x1="13" y1="3.5" x2="13" y2="7.5" strokeLinecap="round" strokeWidth="1.6" />
          <line x1="11" y1="5.5" x2="15" y2="5.5" strokeLinecap="round" strokeWidth="1.6" />
        </g>
        {/* Bóng người thứ 2 (mờ) */}
        <circle cx="12" cy="11" r="1.6" fill={t.glyph} opacity="0.35" stroke="none" />
      </g>
    </Bubble>
  );
}
