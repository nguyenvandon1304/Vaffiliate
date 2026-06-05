"use client";

import { useEffect, useRef, useState } from "react";

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  /** Background tint + accent — vd. "orange" | "blue" | "amber" | "green" */
  tone: "orange" | "blue" | "amber" | "green";
  /** 14-day data: index 0 = oldest, 13 = today. Optional. */
  series?: number[];
  /** Click handler — drill down vào tab tương ứng. */
  onClick?: () => void;
  /** Aria label cho screen reader. */
  ariaLabel?: string;
}

const TONE_CLASSES: Record<
  StatCardProps["tone"],
  { bg: string; text: string; sparkline: string; deltaUp: string; deltaDown: string }
> = {
  orange: {
    bg: "bg-gradient-to-br from-orange-50 to-orange-100/60 dark:from-orange-500/[0.08] dark:to-orange-500/[0.04] border-orange-100 dark:border-orange-500/20",
    text: "text-orange-700 dark:text-orange-400",
    sparkline: "stroke-orange-500",
    deltaUp: "text-emerald-600 dark:text-emerald-400",
    deltaDown: "text-rose-600 dark:text-rose-400",
  },
  blue: {
    bg: "bg-gradient-to-br from-blue-50 to-blue-100/60 dark:from-blue-500/[0.08] dark:to-blue-500/[0.04] border-blue-100 dark:border-blue-500/20",
    text: "text-blue-700 dark:text-blue-400",
    sparkline: "stroke-blue-500",
    deltaUp: "text-emerald-600 dark:text-emerald-400",
    deltaDown: "text-rose-600 dark:text-rose-400",
  },
  amber: {
    bg: "bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-amber-500/[0.08] dark:to-amber-500/[0.04] border-amber-100 dark:border-amber-500/20",
    text: "text-amber-700 dark:text-amber-400",
    sparkline: "stroke-amber-500",
    // Pending: tăng = xấu (đỏ), giảm = tốt (xanh)
    deltaUp: "text-rose-600 dark:text-rose-400",
    deltaDown: "text-emerald-600 dark:text-emerald-400",
  },
  green: {
    bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/60 dark:from-emerald-500/[0.08] dark:to-emerald-500/[0.04] border-emerald-100 dark:border-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-400",
    sparkline: "stroke-emerald-500",
    deltaUp: "text-emerald-600 dark:text-emerald-400",
    deltaDown: "text-rose-600 dark:text-rose-400",
  },
};

/**
 * Tính WoW% delta — so 7 ngày gần nhất với 7 ngày trước đó.
 *  - Trả null nếu cả 2 đều = 0 (không có data).
 *  - Trả số với dấu (+/-) và %.
 */
function computeWoWDelta(series: number[]): { delta: number; isUp: boolean } | null {
  if (series.length < 14) return null;
  const last7 = series.slice(7).reduce((a, b) => a + b, 0);
  const prev7 = series.slice(0, 7).reduce((a, b) => a + b, 0);
  if (last7 === 0 && prev7 === 0) return null;
  if (prev7 === 0) {
    // Tuần trước = 0, tuần này có data → tăng "vô hạn", hiện "+100%" tròn.
    return { delta: 100, isUp: true };
  }
  const pct = Math.round(((last7 - prev7) / prev7) * 100);
  return { delta: Math.abs(pct), isUp: pct >= 0 };
}

/** Render SVG sparkline path từ array. */
function Sparkline({ data, className }: { data: number[]; className?: string }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 60;
  const h = 20;
  const step = w / Math.max(1, data.length - 1);

  const points = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = `M ${points.join(" L ")}`;
  // Area fill underneath
  const areaPath = `${path} L ${w},${h} L 0,${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={`w-full h-5 ${className ?? ""}`}
      aria-hidden
    >
      <path d={areaPath} fill="currentColor" opacity="0.12" />
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      {data.length > 0 && (
        <circle
          cx={(data.length - 1) * step}
          cy={h - ((data[data.length - 1] - min) / range) * h}
          r="1.8"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

/**
 * Hook count-up animation for numeric strings.
 * Parses leading digits; preserves suffix (đ, %, etc.).
 */
function useAnimatedValue(targetStr: string): string {
  const targetNum = parseInt(targetStr.replace(/\D/g, ""), 10) || 0;
  const [num, setNum] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (targetNum === 0) {
      queueMicrotask(() => setNum(0));
      return;
    }
    const startTime = performance.now();
    const duration = 1000;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setNum(Math.round(targetNum * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [targetNum]);

  // Re-format with VND grouping if original had separators
  if (targetStr.includes(".") || targetStr.includes(",")) {
    const formatted = num.toLocaleString("vi-VN");
    const suffix = targetStr.match(/[^\d.,\s]+\s*$/)?.[0] ?? "";
    return formatted + suffix;
  }
  // Plain number
  const suffix = targetStr.match(/[^\d.,\s]+\s*$/)?.[0] ?? "";
  return String(num) + suffix;
}

export function StatCard({ label, value, icon, tone, series, onClick, ariaLabel }: StatCardProps) {
  const cls = TONE_CLASSES[tone];
  const wow = series && series.length === 14 ? computeWoWDelta(series) : null;
  const animatedValue = useAnimatedValue(value);

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-lg sm:text-xl">{icon}</span>
        {wow && (
          <span
            className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/70 dark:bg-zinc-900/50 backdrop-blur-sm ${
              wow.isUp ? cls.deltaUp : cls.deltaDown
            }`}
            title={`So với tuần trước`}
          >
            <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="currentColor" aria-hidden>
              {wow.isUp ? (
                <path d="M6 2 L10 7 L8 7 L8 10 L4 10 L4 7 L2 7 Z" />
              ) : (
                <path d="M6 10 L2 5 L4 5 L4 2 L8 2 L8 5 L10 5 Z" />
              )}
            </svg>
            {wow.delta}%
          </span>
        )}
      </div>
      <p className="text-[10px] sm:text-xs font-medium opacity-70">{label}</p>
      <p className={`text-xs sm:text-sm font-black tabular-nums ${cls.text}`}>
        {animatedValue}
      </p>
      {/* Sparkline */}
      {series && series.length > 0 && (
        <div className={`mt-1.5 sm:mt-2 ${cls.sparkline}`}>
          <Sparkline data={series} />
        </div>
      )}
    </>
  );

  const baseClass = `block w-full text-left rounded-xl border p-3 sm:p-4 transition-all duration-300 ${cls.bg} backdrop-blur-sm`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel ?? label}
        className={`${baseClass} hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400`}
      >
        {inner}
      </button>
    );
  }

  return <div className={baseClass}>{inner}</div>;
}
