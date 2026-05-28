"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  /** Callback chạy khi user pull-to-refresh. Trả Promise — UI sẽ đợi xong. */
  onRefresh: () => Promise<void> | void;
  /** Disable trên desktop. Default true. */
  mobileOnly?: boolean;
  /** Min pull distance để trigger (px). Default 70. */
  threshold?: number;
  children: React.ReactNode;
}

/**
 * Pull-to-refresh wrapper — native feel cho mobile.
 *
 * Hoạt động:
 *   1. User vuốt xuống khi đã ở top
 *   2. Hiện loading spinner ở top
 *   3. Khi vuốt > threshold → trigger onRefresh
 *   4. Sau khi onRefresh xong → reset
 *
 * Disable trên desktop (mobileOnly default true) vì desktop có F5.
 */
export function PullToRefresh({ onRefresh, mobileOnly = true, threshold = 70, children }: Props) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (mobileOnly && window.innerWidth >= 768) return;

    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      // Chỉ track khi đang ở top trang
      if (window.scrollY > 0) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (refreshing || startY.current === null) return;
      const currentY = e.touches[0].clientY;
      const delta = currentY - startY.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }
      // Nonlinear curve — feel mềm hơn (ease out)
      const eased = Math.min(threshold * 1.5, delta * 0.5);
      setPullDistance(eased);
    };

    const onTouchEnd = async () => {
      if (refreshing) return;
      if (pullDistance >= threshold) {
        setRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
      startY.current = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [refreshing, pullDistance, threshold, mobileOnly, onRefresh]);

  const triggerVisible = pullDistance > 0 || refreshing;
  const ringRotation = Math.min(360, (pullDistance / threshold) * 360);

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator at top */}
      {triggerVisible && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none transition-transform duration-150"
          style={{
            transform: `translateY(${refreshing ? threshold : pullDistance - 30}px)`,
            zIndex: 50,
          }}
        >
          <div
            className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 shadow-lg flex items-center justify-center border border-gray-200 dark:border-zinc-700"
          >
            {refreshing ? (
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-orange-500 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 text-orange-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: `rotate(${ringRotation}deg)`, transition: "transform 50ms" }}
              >
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Content with pull offset */}
      <div
        style={{
          transform: triggerVisible ? `translateY(${refreshing ? threshold : pullDistance}px)` : undefined,
          transition: pullDistance > 0 || refreshing ? "transform 150ms ease-out" : "transform 250ms ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
