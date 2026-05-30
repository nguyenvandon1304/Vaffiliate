"use client";

import { useEffect, useRef, useState } from "react";
import { Tilt3D } from "@/components/Tilt3D";

interface WalletHeroProps {
  /** Số dư khả dụng (đ). */
  balance: number;
  /** Tổng tiền đang chờ rút (đ). */
  pendingWithdraw: number;
  /** Tổng đã rút thành công (đ). */
  totalWithdrawn: number;
  /** Lifetime cashback đã nhận (đ). Optional — show "đã tiết kiệm" nếu > 0. */
  totalCashback?: number;
}

/** Hook count-up cho big number, ease-out cubic, 1.4s. */
function useCountUp(target: number, duration = 1400): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const prevTargetRef = useRef<number>(0);

  useEffect(() => {
    if (target === prevTargetRef.current) return;
    const startTime = performance.now();
    const startValue = prevTargetRef.current;

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(startValue + (target - startValue) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevTargetRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}

export function WalletHero({ balance, pendingWithdraw, totalWithdrawn, totalCashback = 0 }: WalletHeroProps) {
  const animatedBalance = useCountUp(balance);
  const lifetimeSaved = totalCashback > 0 ? totalCashback : totalWithdrawn;

  return (
    <Tilt3D max={6} lift={5} glare className="rounded-3xl">
    <div className="relative overflow-hidden rounded-3xl border border-orange-100 dark:border-orange-500/25 shadow-sm dark:shadow-lg dark:shadow-orange-950/30 animate-tier-card-in">
      {/* ═══ Background — nền kem sáng (light) / tối pha cam ấm (dark) ═══ */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/40 dark:via-zinc-900 dark:to-amber-950/30" />
      {/* Top-right glow orb */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-orange-200/40 dark:bg-orange-500/15 blur-3xl orb-parallax" />
      {/* Bottom-left glow orb */}
      <div className="absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-amber-200/40 dark:bg-amber-500/10 blur-3xl orb-parallax-slow" />
      {/* Soft inner highlight */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 dark:from-white/[0.03] to-transparent" />

      {/* Subtle stripe pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.05] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent 0 16px, rgba(234,88,12,0.4) 16px 17px)",
        }}
      />

      {/* Decorative floating sparkles */}
      <div className="pointer-events-none absolute top-5 right-12 text-orange-300/60 dark:text-orange-400/40 text-lg animate-tier-float">✦</div>
      <div className="pointer-events-none absolute bottom-8 right-32 text-amber-300/50 dark:text-amber-400/30 text-sm">★</div>
      <div className="pointer-events-none absolute top-12 left-6 text-orange-300/40 dark:text-orange-400/25 text-xs">✦</div>

      {/* ═══ Content ═══ */}
      <div className="relative p-6 sm:p-7 text-gray-800 dark:text-gray-100">
        {/* Top row: label + chip card brand */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-orange-700 dark:text-orange-300 bg-orange-500/10 dark:bg-orange-500/20 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Số dư khả dụng
            </div>
          </div>
          {/* Apple Pay-style card chip */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-8 h-6 rounded-md bg-gradient-to-br from-yellow-300 to-amber-400 shadow-inner flex items-center justify-center">
              <div className="grid grid-cols-3 gap-[1px] w-5 h-3.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-amber-700/40 rounded-[1px]" />
                ))}
              </div>
            </div>
            <span className="text-[10px] font-bold tracking-widest text-orange-600/70 dark:text-orange-300/70">V-AFFILIATE</span>
          </div>
        </div>

        {/* Big balance number — gradient text cam ấm để nổi bật như "tài sản", không chói vì là chữ trên nền sáng */}
        <div className="flex items-baseline gap-1 mb-2 flex-wrap">
          <span className="text-4xl sm:text-5xl font-black tabular-nums tracking-tight bg-gradient-to-br from-orange-600 to-amber-500 dark:from-orange-300 dark:to-amber-200 bg-clip-text text-transparent break-all">
            {animatedBalance.toLocaleString("vi-VN")}
          </span>
          <span className="text-xl sm:text-2xl font-bold text-orange-500 dark:text-orange-400">đ</span>
        </div>

        {/* Lifetime saved badge */}
        {lifetimeSaved > 0 && (
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 dark:bg-emerald-400/15 border border-emerald-500/30 dark:border-emerald-300/30 rounded-full px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-200">
            <span>💚</span>
            <span>Đã tiết kiệm cùng V-Affiliate:</span>
            <b className="text-emerald-800 dark:text-emerald-50">{lifetimeSaved.toLocaleString("vi-VN")}đ</b>
          </div>
        )}

        {/* ═══ Sub stats row ═══ */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/70 dark:bg-white/[0.06] backdrop-blur-md border border-orange-100 dark:border-white/10 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-300">
              <span>⏳</span>
              <span>Rút chờ duyệt</span>
            </div>
            <p className="mt-1 text-base sm:text-lg font-black tabular-nums text-gray-800 dark:text-gray-100">
              {pendingWithdraw.toLocaleString("vi-VN")}
              <span className="text-xs font-bold text-orange-500 dark:text-orange-400 ml-0.5">đ</span>
            </p>
          </div>

          <div className="rounded-xl bg-white/70 dark:bg-white/[0.06] backdrop-blur-md border border-orange-100 dark:border-white/10 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-300">
              <span>↗️</span>
              <span>Tổng đã rút</span>
            </div>
            <p className="mt-1 text-base sm:text-lg font-black tabular-nums text-gray-800 dark:text-gray-100">
              {totalWithdrawn.toLocaleString("vi-VN")}
              <span className="text-xs font-bold text-orange-500 dark:text-orange-400 ml-0.5">đ</span>
            </p>
          </div>
        </div>
      </div>
    </div>
    </Tilt3D>
  );
}
