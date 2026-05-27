"use client";

import { useEffect, useRef, useState } from "react";

interface ProgressRingProps {
  /** 0-100 */
  percent: number;
  /** Diameter in px. Default 120. */
  size?: number;
  /** Stroke width. Default 10. */
  strokeWidth?: number;
  /** Tailwind class on filled stroke (e.g. "text-orange-500"). */
  trackClass?: string;
  /** Tailwind class on background stroke. */
  bgClass?: string;
  /** Center label children. */
  children?: React.ReactNode;
  /** Animate from 0 to percent on mount. */
  animate?: boolean;
}

export function ProgressRing({
  percent,
  size = 120,
  strokeWidth = 10,
  trackClass = "text-orange-500",
  bgClass = "text-gray-200 dark:text-zinc-700",
  children,
  animate = true,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  const [offset, setOffset] = useState(animate ? circumference : targetOffset);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animate) {
      queueMicrotask(() => setOffset(targetOffset));
      return;
    }
    const startTime = performance.now();
    const startOffset = circumference;
    const duration = 1200;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setOffset(startOffset + (targetOffset - startOffset) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percent]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          className={bgClass}
        />
        {/* Filled progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${trackClass} transition-[stroke-dashoffset] duration-1000`}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
