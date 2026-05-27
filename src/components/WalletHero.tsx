"use client";

import { useEffect, useRef, useState } from "react";

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
    <div className="relative overflow-hidden rounded-3xl shadow-xl shadow-orange-500/30 dark:shadow-orange-900/40 animate-tier-card-in">
      {/* ═══ Background mesh gradient ═══ */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600" />
      {/* Top-right glow orb */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-yellow-300/40 blur-3xl animate-tier-float" />
      {/* Bottom-left glow orb */}
      <div className="absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-rose-400/30 blur-3xl" />
      {/* Soft inner highlight */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />

      {/* Subtle stripe pattern */}
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent 0 16px, rgba(255,255,255,0.4) 16px 17px)",
        }}
      />

      {/* Decorative floating sparkles */}
      <div className="pointer-events-none absolute top-5 right-12 text-white/40 text-lg animate-tier-float">✦</div>
      <div className="pointer-events-none absolute bottom-8 right-32 text-white/30 text-sm">★</div>
      <div className="pointer-events-none absolute top-12 left-6 text-white/25 text-xs">✦</div>

      {/* ═══ Content ═══ */}
      <div className="relative p-6 sm:p-7 text-white">
        {/* Top row: label + chip card brand */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              Số dư khả dụng
            </div>
          </div>
          {/* Apple Pay-style card chip */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-8 h-6 rounded-md bg-gradient-to-br from-yellow-200 to-amber-300 shadow-inner flex items-center justify-center">
              <div className="grid grid-cols-3 gap-[1px] w-5 h-3.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-amber-700/40 rounded-[1px]" />
                ))}
              </div>
            </div>
            <span className="text-[10px] font-bold tracking-widest opacity-80">V-AFFILIATE</span>
          </div>
        </div>

        {/* Big balance number */}
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-4xl sm:text-5xl font-black tabular-nums drop-shadow-md tracking-tight">
            {animatedBalance.toLocaleString("vi-VN")}
          </span>
          <span className="text-xl sm:text-2xl font-bold opacity-80">đ</span>
        </div>

        {/* Lifetime saved badge */}
        {lifetimeSaved > 0 && (
          <div className="inline-flex items-center gap-1.5 bg-emerald-400/25 backdrop-blur-sm border border-emerald-300/40 rounded-full px-3 py-1 text-xs font-semibold">
            <span>💚</span>
            <span className="opacity-90">Đã tiết kiệm cùng V-Affiliate:</span>
            <b className="text-emerald-50">{lifetimeSaved.toLocaleString("vi-VN")}đ</b>
          </div>
        )}

        {/* ═══ Sub stats row ═══ */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/15 backdrop-blur-md border border-white/20 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-90">
              <span>⏳</span>
              <span>Rút chờ duyệt</span>
            </div>
            <p className="mt-1 text-base sm:text-lg font-black tabular-nums">
              {pendingWithdraw.toLocaleString("vi-VN")}
              <span className="text-xs font-bold opacity-70 ml-0.5">đ</span>
            </p>
          </div>

          <div className="rounded-xl bg-white/15 backdrop-blur-md border border-white/20 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-90">
              <span>↗️</span>
              <span>Tổng đã rút</span>
            </div>
            <p className="mt-1 text-base sm:text-lg font-black tabular-nums">
              {totalWithdrawn.toLocaleString("vi-VN")}
              <span className="text-xs font-bold opacity-70 ml-0.5">đ</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
