/**
 * Nav icons — minimal Lucide style cho V-Affiliate fintech identity.
 *
 * Khác bản 3D bubble cũ:
 *  - Dùng Lucide icons chuẩn (stroke 2, clean lines)
 *  - Bubble container nhỏ hơn, không gradient
 *  - Active: gradient cam-amber bg + icon trắng
 *  - Idle: gray icon, hover orange tint
 *  - Modern fintech feel (Stripe / Revolut / Cash App style)
 */
"use client";

import {
  LayoutGrid,
  Link2,
  Package,
  Wallet,
  Clock,
  HelpCircle,
  UserPlus,
} from "lucide-react";

interface NavIcon3DProps {
  active?: boolean;
  size?: number;
  className?: string;
}

interface CommonProps extends NavIcon3DProps {
  Icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  /** Tab key for animation hooks. */
  glyphKey: string;
}

function NavBubble({ active, size = 28, className = "", Icon, glyphKey }: CommonProps) {
  const containerSize = Math.max(size, 36);
  const iconSize = Math.round(size * 0.55);

  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-2xl transition-all duration-300 ${
        active
          ? "bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/40"
          : "bg-gray-100/70 dark:bg-zinc-800/60 text-gray-500 dark:text-zinc-400 group-hover:bg-orange-50 dark:group-hover:bg-orange-500/10 group-hover:text-orange-500 dark:group-hover:text-orange-400"
      } ${className}`}
      style={{ width: containerSize, height: containerSize }}
      aria-hidden="true"
    >
      {/* Active glow pulse ring */}
      {active && (
        <span className="absolute inset-0 rounded-2xl bg-orange-400/20 blur-md -z-10" />
      )}
      <span data-glyph={glyphKey} className="inline-flex">
        <Icon size={iconSize} strokeWidth={active ? 2.5 : 2} />
      </span>
    </span>
  );
}

/* ─────────────── 7 nav icons ─────────────── */

export function GridIcon3D(props: NavIcon3DProps) {
  return <NavBubble {...props} Icon={LayoutGrid} glyphKey="grid" />;
}

export function LinkIcon3D(props: NavIcon3DProps) {
  return <NavBubble {...props} Icon={Link2} glyphKey="link" />;
}

export function OrdersIcon3D(props: NavIcon3DProps) {
  return <NavBubble {...props} Icon={Package} glyphKey="orders" />;
}

export function WalletIcon3D(props: NavIcon3DProps) {
  return <NavBubble {...props} Icon={Wallet} glyphKey="wallet" />;
}

export function ClockIcon3D(props: NavIcon3DProps) {
  return <NavBubble {...props} Icon={Clock} glyphKey="clock" />;
}

export function HelpIcon3D(props: NavIcon3DProps) {
  return <NavBubble {...props} Icon={HelpCircle} glyphKey="help" />;
}

export function ReferralIcon3D(props: NavIcon3DProps) {
  return <NavBubble {...props} Icon={UserPlus} glyphKey="referral" />;
}
