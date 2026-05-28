/**
 * Icon 3D có animation cho navbar dashboard — premium edition.
 *
 * Khác bản cũ:
 *  - Mỗi icon có MÀU IDENTITY riêng khi idle (không còn xám hết)
 *  - Active state: gradient cam đặc trưng + boost shadow
 *  - Hover: scale + brightness pulse
 *  - Glyph chi tiết hơn (không chỉ stroke đơn)
 *  - Inner glow + outer ring khi active
 */
"use client";

import { useId } from "react";

interface NavIcon3DProps {
  active?: boolean;
  size?: number;
  className?: string;
}

/** Color tone cho mỗi tab — pastel khi idle, vibrant khi active. */
interface ToneSet {
  /** Idle (chưa active) */
  idleTop: string;
  idleMid: string;
  idleBot: string;
  idleGlyph: string;
  idleShadow: string;
  /** Active (đang chọn) — luôn dùng cam-amber gradient */
  activeTop: string;
  activeMid: string;
  activeBot: string;
  activeGlyph: string;
  activeShadow: string;
}

// Active state — chung 1 cam-amber cho mọi icon (consistent brand).
const ACTIVE_TONE = {
  activeTop: "#fff7ed",
  activeMid: "#fb923c",
  activeBot: "#c2410c",
  activeGlyph: "#ffffff",
  activeShadow: "rgba(234, 88, 12, 0.6)",
};

// Idle tones — mỗi icon 1 sắc thái pastel riêng.
const TONES: Record<string, ToneSet> = {
  grid: { // Tổng quan — slate trung tính
    idleTop: "#ffffff",
    idleMid: "#cbd5e1",
    idleBot: "#64748b",
    idleGlyph: "#1e293b",
    idleShadow: "rgba(15, 23, 42, 0.25)",
    ...ACTIVE_TONE,
  },
  link: { // Tạo link — blue
    idleTop: "#eff6ff",
    idleMid: "#93c5fd",
    idleBot: "#1d4ed8",
    idleGlyph: "#1e3a8a",
    idleShadow: "rgba(29, 78, 216, 0.3)",
    ...ACTIVE_TONE,
  },
  orders: { // Đơn hàng — emerald
    idleTop: "#ecfdf5",
    idleMid: "#6ee7b7",
    idleBot: "#047857",
    idleGlyph: "#064e3b",
    idleShadow: "rgba(4, 120, 87, 0.3)",
    ...ACTIVE_TONE,
  },
  wallet: { // Ví — green tiền
    idleTop: "#f0fdf4",
    idleMid: "#86efac",
    idleBot: "#15803d",
    idleGlyph: "#14532d",
    idleShadow: "rgba(21, 128, 61, 0.3)",
    ...ACTIVE_TONE,
  },
  clock: { // Lịch sử — violet
    idleTop: "#faf5ff",
    idleMid: "#c4b5fd",
    idleBot: "#6d28d9",
    idleGlyph: "#4c1d95",
    idleShadow: "rgba(109, 40, 217, 0.3)",
    ...ACTIVE_TONE,
  },
  help: { // Hướng dẫn — sky
    idleTop: "#f0f9ff",
    idleMid: "#7dd3fc",
    idleBot: "#0369a1",
    idleGlyph: "#0c4a6e",
    idleShadow: "rgba(3, 105, 161, 0.3)",
    ...ACTIVE_TONE,
  },
  referral: { // Giới thiệu — rose
    idleTop: "#fff1f2",
    idleMid: "#fda4af",
    idleBot: "#be123c",
    idleGlyph: "#881337",
    idleShadow: "rgba(190, 18, 60, 0.3)",
    ...ACTIVE_TONE,
  },
};

interface BubbleProps extends NavIcon3DProps {
  id: string;
  tone: ToneSet;
  children: React.ReactNode;
}

/** Khung tròn 3D — gradient + gloss + drop shadow + active outer ring. */
function Bubble({ id, active, size, className, tone, children }: BubbleProps) {
  const s = size ?? 28;
  const top = active ? tone.activeTop : tone.idleTop;
  const mid = active ? tone.activeMid : tone.idleMid;
  const bot = active ? tone.activeBot : tone.idleBot;
  const glyph = active ? tone.activeGlyph : tone.idleGlyph;
  const shadow = active ? tone.activeShadow : tone.idleShadow;

  const gradId = `grad-${id}`;
  const glossId = `gloss-${id}`;
  const ringId = `ring-${id}`;
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
        {/* Main vertical gradient */}
        <linearGradient id={gradId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor={top} />
          <stop offset="55%" stopColor={mid} />
          <stop offset="100%" stopColor={bot} />
        </linearGradient>
        {/* Specular highlight */}
        <radialGradient id={glossId} cx="35%" cy="22%" r="55%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        {/* Outer ring glow when active */}
        <radialGradient id={ringId} cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor={shadow} stopOpacity="0" />
          <stop offset="80%" stopColor={shadow} stopOpacity={active ? "0.6" : "0"} />
          <stop offset="100%" stopColor={shadow} stopOpacity="0" />
        </radialGradient>
        {/* Drop shadow filter */}
        <filter id={shadowId} x="-30%" y="-20%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={active ? "1.8" : "1"} />
          <feOffset dx="0" dy="1" result="off" />
          <feFlood floodColor={shadow} floodOpacity={active ? "0.8" : "0.5"} />
          <feComposite in2="off" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer glow ring (only visible when active) */}
      {active && <circle cx="16" cy="16" r="15.5" fill={`url(#${ringId})`} />}

      {/* Soft floor shadow */}
      <ellipse cx="16" cy="29.5" rx="9" ry="1.2" fill={shadow} opacity={active ? 0.55 : 0.3} />

      {/* Main bubble */}
      <circle
        cx="16"
        cy="15"
        r="13"
        fill={`url(#${gradId})`}
        filter={`url(#${shadowId})`}
      />

      {/* Specular gloss */}
      <ellipse cx="11.5" cy="9" rx="6.5" ry="3.8" fill={`url(#${glossId})`} />

      {/* Glyph wrapper — translate to (8,7) so child uses 16x16 grid */}
      <g
        transform="translate(8 7)"
        stroke={glyph}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        {children}
      </g>
    </svg>
  );
}

/* ─────────────── 7 icons ─────────────── */

export function GridIcon3D(props: NavIcon3DProps) {
  const id = useId();
  const tone = TONES.grid;
  const glyph = props.active ? tone.activeGlyph : tone.idleGlyph;
  return (
    <Bubble id={id} tone={tone} {...props}>
      <g data-glyph="grid">
        <rect x="1"  y="1"  width="6" height="6" rx="1.5" fill={glyph} stroke="none" />
        <rect x="9"  y="1"  width="6" height="6" rx="1.5" fill={glyph} stroke="none" opacity="0.85" />
        <rect x="1"  y="9"  width="6" height="6" rx="1.5" fill={glyph} stroke="none" opacity="0.85" />
        <rect x="9"  y="9"  width="6" height="6" rx="1.5" fill={glyph} stroke="none" />
      </g>
    </Bubble>
  );
}

export function LinkIcon3D(props: NavIcon3DProps) {
  const id = useId();
  const tone = TONES.link;
  return (
    <Bubble id={id} tone={tone} {...props}>
      <g data-glyph="link">
        <path d="M3 9.5a3.5 3.5 0 0 0 5 .4l2.2-2.2a3.5 3.5 0 0 0-4.95-4.95L4 4" strokeWidth="2.2" />
        <path d="M13 6.5a3.5 3.5 0 0 0-5-.4L5.8 8.3a3.5 3.5 0 0 0 4.95 4.95L12 12" strokeWidth="2.2" />
      </g>
    </Bubble>
  );
}

export function OrdersIcon3D(props: NavIcon3DProps) {
  const id = useId();
  const tone = TONES.orders;
  const glyph = props.active ? tone.activeGlyph : tone.idleGlyph;
  return (
    <Bubble id={id} tone={tone} {...props}>
      <g data-glyph="orders">
        {/* Box body với fill subtle */}
        <path
          d="M3 5 L8 2 L13 5 L13 13 L8 16 L3 13 Z"
          fill={glyph}
          fillOpacity="0.1"
          strokeWidth="1.8"
        />
        {/* Top crease lines */}
        <path d="M3 5 L8 8 L13 5" strokeWidth="1.8" />
        <path d="M8 8 L8 16" strokeWidth="1.8" />
        {/* Tape on top */}
        <path d="M5.5 4 L8 2.6 L10.5 4" strokeWidth="1.5" opacity="0.6" />
      </g>
    </Bubble>
  );
}

export function WalletIcon3D(props: NavIcon3DProps) {
  const id = useId();
  const tone = TONES.wallet;
  const glyph = props.active ? tone.activeGlyph : tone.idleGlyph;
  return (
    <Bubble id={id} tone={tone} {...props}>
      <g data-glyph="wallet">
        {/* Card body */}
        <rect x="1" y="3" width="14" height="11" rx="2" strokeWidth="1.8" />
        {/* Magnetic stripe (top band) */}
        <rect
          x="1"
          y="5.5"
          width="14"
          height="1.5"
          fill={glyph}
          stroke="none"
          opacity="0.4"
        />
        {/* Chip indicator */}
        <rect
          x="3"
          y="9"
          width="3"
          height="2"
          rx="0.4"
          fill={glyph}
          stroke="none"
        />
        {/* Card number dots */}
        <circle cx="9.5" cy="11.5" r="0.6" fill={glyph} stroke="none" />
        <circle cx="11" cy="11.5" r="0.6" fill={glyph} stroke="none" />
        <circle cx="12.5" cy="11.5" r="0.6" fill={glyph} stroke="none" />
        {/* Shimmer slot for wallet animation */}
        <g data-glyph="wallet-shimmer">
          <rect
            x="-3"
            y="9"
            width="2.5"
            height="3"
            rx="1"
            fill={glyph}
            opacity={0}
            stroke="none"
          />
        </g>
      </g>
    </Bubble>
  );
}

export function ClockIcon3D(props: NavIcon3DProps) {
  const id = useId();
  const tone = TONES.clock;
  const glyph = props.active ? tone.activeGlyph : tone.idleGlyph;
  return (
    <Bubble id={id} tone={tone} {...props}>
      <g data-glyph="clock">
        {/* Outer ring */}
        <circle cx="8" cy="8" r="7" strokeWidth="1.8" />
        {/* Minute markers */}
        <line x1="8" y1="2.5" x2="8" y2="3.5" strokeWidth="1.8" />
        <line x1="8" y1="12.5" x2="8" y2="13.5" strokeWidth="1.8" />
        <line x1="2.5" y1="8" x2="3.5" y2="8" strokeWidth="1.8" />
        <line x1="12.5" y1="8" x2="13.5" y2="8" strokeWidth="1.8" />
        {/* Center dot */}
        <circle cx="8" cy="8" r="1.1" fill={glyph} stroke="none" />
        {/* Hands - rotatable group */}
        <g data-glyph="clock-hand">
          <line x1="8" y1="8" x2="8" y2="3.5" strokeWidth="1.8" />
          <line x1="8" y1="8" x2="11" y2="9.5" strokeWidth="1.4" />
        </g>
      </g>
    </Bubble>
  );
}

export function HelpIcon3D(props: NavIcon3DProps) {
  const id = useId();
  const tone = TONES.help;
  const glyph = props.active ? tone.activeGlyph : tone.idleGlyph;
  return (
    <Bubble id={id} tone={tone} {...props}>
      <g data-glyph="help">
        {/* Question mark — hook on top */}
        <path
          d="M5.5 6 a2.7 2.7 0 1 1 5.2 1 c-0.7 1 -1.6 1.3 -1.7 2.4"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Dot bottom */}
        <circle cx="9" cy="13" r="1.2" stroke="none" fill={glyph} />
      </g>
    </Bubble>
  );
}

export function ReferralIcon3D(props: NavIcon3DProps) {
  const id = useId();
  const tone = TONES.referral;
  const glyph = props.active ? tone.activeGlyph : tone.idleGlyph;
  return (
    <Bubble id={id} tone={tone} {...props}>
      <g data-glyph="referral">
        {/* Person 1 (left, larger) */}
        <circle cx="5.5" cy="6" r="2.4" strokeWidth="1.8" />
        <path d="M1.5 14 a4 4 0 0 1 8 0" strokeWidth="1.8" strokeLinecap="round" />
        {/* Person 2 silhouette (right, smaller) */}
        <circle cx="11" cy="9" r="1.7" fill={glyph} fillOpacity="0.4" stroke={glyph} strokeWidth="1.2" />
        <path d="M8.5 14 a3 3 0 0 1 5 0" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
        {/* Plus badge top-right */}
        <circle cx="13" cy="3" r="2.4" fill={glyph} stroke="none" />
        <line x1="13" y1="1.5" x2="13" y2="4.5" stroke={tone.idleTop} strokeWidth="1.6" strokeLinecap="round" />
        <line x1="11.5" y1="3" x2="14.5" y2="3" stroke={tone.idleTop} strokeWidth="1.6" strokeLinecap="round" />
      </g>
    </Bubble>
  );
}
