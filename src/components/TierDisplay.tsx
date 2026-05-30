"use client";

import { useEffect, useRef, useState } from "react";
import { AchievementShareButton } from "@/components/AchievementShareButton";

interface Tier {
  code: "bronze" | "silver" | "gold" | "vip";
  name: string;
  icon: string;
  color: string;
  minOrders: number;
  minReferrals: number;
  cashbackPercent: number;
}

export interface TierInfo {
  current: Tier;
  next: Tier | null;
  ordersCount: number;
  referralsCount: number;
  progressPercent: number;
  ordersToNext: number;
  referralsToNext: number;
  cashbackPercent: number;
}

interface TierTheme {
  /** Pill nhỏ ở header */
  pill: string;
  pillIcon: string;
  /** Hero card */
  cardBg: string;          // gradient nền cả card
  cardGlow: string;        // soft glow ring decorative
  medalRing: string;       // gradient ring quanh medal
  medalBg: string;         // bg trong medal
  medalIcon: string;       // emoji unicode kim loại
  accentText: string;      // gradient text cho heading "Hoàn X%"
  accentSolid: string;     // text-color đậm thay thế cho gradient nếu cần solid
  progressBar: string;     // gradient cho progress
  shimmerColor: string;    // shimmer overlay
  cardOrder: string;
  cardRef: string;
  /** VIP rewards section */
  rewardsBorder: string;
}

const TIER_THEME: Record<string, TierTheme> = {
  bronze: {
    pill: "from-amber-100 to-orange-100 text-amber-700 border-amber-200",
    pillIcon: "bg-amber-500/15 text-amber-600",
    cardBg: "from-amber-50/80 via-orange-50/50 to-white dark:from-amber-500/[0.07] dark:via-orange-500/[0.05] dark:to-zinc-900",
    cardGlow: "from-amber-400/30 to-orange-500/20",
    medalRing: "from-amber-400 via-orange-400 to-amber-500",
    medalBg: "bg-gradient-to-br from-amber-100 to-orange-200 dark:from-amber-950/60 dark:to-orange-950/40",
    medalIcon: "🥉",
    accentText: "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent",
    accentSolid: "text-amber-600 dark:text-amber-400",
    progressBar: "from-amber-400 via-orange-400 to-amber-500",
    shimmerColor: "from-transparent via-white/60 to-transparent",
    cardOrder: "from-orange-500/[0.08] to-amber-500/[0.04] border-orange-500/20",
    cardRef: "from-rose-500/[0.08] to-pink-500/[0.04] border-rose-500/20",
    rewardsBorder: "border-amber-500/30",
  },
  silver: {
    pill: "from-slate-100 to-slate-200 text-slate-700 border-slate-300",
    pillIcon: "bg-slate-400/20 text-slate-600",
    cardBg: "from-slate-50/80 via-zinc-50/50 to-white dark:from-slate-500/[0.07] dark:via-zinc-500/[0.05] dark:to-zinc-900",
    cardGlow: "from-slate-400/30 to-zinc-500/20",
    medalRing: "from-slate-300 via-slate-400 to-slate-500",
    medalBg: "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900/60 dark:to-zinc-900/40",
    medalIcon: "🥈",
    accentText: "bg-gradient-to-r from-slate-500 via-slate-600 to-slate-700 bg-clip-text text-transparent dark:from-slate-200 dark:to-slate-400",
    accentSolid: "text-slate-600 dark:text-slate-300",
    progressBar: "from-slate-300 via-slate-400 to-slate-500",
    shimmerColor: "from-transparent via-white/60 to-transparent",
    cardOrder: "from-slate-500/[0.08] to-zinc-500/[0.04] border-slate-500/20",
    cardRef: "from-rose-500/[0.08] to-pink-500/[0.04] border-rose-500/20",
    rewardsBorder: "border-slate-500/30",
  },
  gold: {
    pill: "from-yellow-100 to-amber-200 text-yellow-700 border-yellow-300",
    pillIcon: "bg-yellow-500/20 text-yellow-700",
    cardBg: "from-yellow-50/80 via-amber-50/50 to-white dark:from-yellow-500/[0.08] dark:via-amber-500/[0.05] dark:to-zinc-900",
    cardGlow: "from-yellow-400/40 to-amber-500/20",
    medalRing: "from-yellow-300 via-amber-400 to-yellow-500",
    medalBg: "bg-gradient-to-br from-yellow-100 to-amber-200 dark:from-yellow-950/60 dark:to-amber-950/40",
    medalIcon: "🥇",
    accentText: "bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 bg-clip-text text-transparent",
    accentSolid: "text-yellow-600 dark:text-yellow-400",
    progressBar: "from-yellow-300 via-amber-400 to-yellow-500",
    shimmerColor: "from-transparent via-white/70 to-transparent",
    cardOrder: "from-yellow-500/[0.08] to-amber-500/[0.04] border-yellow-500/20",
    cardRef: "from-rose-500/[0.08] to-pink-500/[0.04] border-rose-500/20",
    rewardsBorder: "border-yellow-500/30",
  },
  vip: {
    pill: "from-violet-100 to-fuchsia-100 text-violet-700 border-violet-200",
    pillIcon: "bg-violet-500/20 text-violet-600",
    cardBg: "from-violet-50/80 via-fuchsia-50/50 to-white dark:from-violet-500/[0.10] dark:via-fuchsia-500/[0.06] dark:to-zinc-900",
    cardGlow: "from-violet-500/40 to-fuchsia-500/30",
    medalRing: "from-violet-400 via-fuchsia-500 to-purple-600",
    medalBg: "bg-gradient-to-br from-violet-100 to-fuchsia-200 dark:from-violet-950/60 dark:to-fuchsia-950/40",
    medalIcon: "💎",
    accentText: "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-purple-600 bg-clip-text text-transparent",
    accentSolid: "text-violet-600 dark:text-violet-400",
    progressBar: "from-violet-400 via-fuchsia-500 to-purple-600",
    shimmerColor: "from-transparent via-white/70 to-transparent",
    cardOrder: "from-violet-500/[0.08] to-fuchsia-500/[0.04] border-violet-500/20",
    cardRef: "from-rose-500/[0.08] to-pink-500/[0.04] border-rose-500/20",
    rewardsBorder: "border-violet-500/30",
  },
};

/** Quyền lợi khi lên hạng — chỉ liệt kê những gì hệ thống THẬT có. */
const VIP_PERKS = [
  { icon: "💸", label: "Cashback cao hơn cho mọi đơn — áp dụng vĩnh viễn" },
  { icon: "🎰", label: "Càng nhiều đơn & bạn mời, càng nhiều lượt quay" },
  { icon: "🏆", label: "Huy hiệu hạng hiển thị trên hồ sơ & bảng xếp hạng" },
  { icon: "💎", label: "Lên hạng tự động, không cần đăng ký gì thêm" },
];

/** Hook fetch tier info + cache 60s qua sessionStorage. */
export function useTierInfo() {
  const [info, setInfo] = useState<TierInfo | null>(null);
  const [tiers, setTiers] = useState<Tier[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = "tier_info_cache_v2";
    const TTL_MS = 60_000;

    let cachedHit: { info: TierInfo; tiers: Tier[] } | null = null;
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { at: number; info: TierInfo; tiers: Tier[] };
        if (Date.now() - parsed.at < TTL_MS) {
          cachedHit = { info: parsed.info, tiers: parsed.tiers };
        }
      }
    } catch { /* ignore */ }

    if (cachedHit) {
      const hit = cachedHit;
      queueMicrotask(() => {
        if (cancelled) return;
        setInfo(hit.info);
        setTiers(hit.tiers);
        setLoading(false);
      });
      return () => { cancelled = true; };
    }

    fetch("/api/tier", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.success && d.info && d.tiers) {
          setInfo(d.info);
          setTiers(d.tiers);
          try {
            sessionStorage.setItem(
              cacheKey,
              JSON.stringify({ at: Date.now(), info: d.info, tiers: d.tiers }),
            );
          } catch { /* ignore */ }
        }
      })
      .catch(() => { /* silent */ })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  return { info, tiers, loading };
}

/** Hook count-up animation cho 1 number, easing ease-out. */
function useCountUp(target: number, duration = 1000): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) {
      queueMicrotask(() => setValue(0));
      return;
    }
    const startTime = performance.now();
    const startValue = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(startValue + (target - startValue) * eased);
      setValue(v);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}

/** Pill nhỏ ở header. */
export function TierPill({ info, onClick }: { info: TierInfo | null; onClick?: () => void }) {
  if (!info) return null;
  const theme = TIER_THEME[info.current.code];

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Tier hiện tại: ${info.current.name} · Cashback ${info.cashbackPercent}% · Click để xem chi tiết`}
      className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-gradient-to-r ${theme.pill} hover:scale-105 transition-transform shadow-sm`}
    >
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${theme.pillIcon}`}>
        {info.current.icon}
      </span>
      <span className="text-[11px] font-black tracking-wider whitespace-nowrap">
        {info.current.name.toUpperCase()}
      </span>
    </button>
  );
}

/** Medal icon: gradient ring + glow + tilt. */
function MedalIcon({ theme }: { theme: TierTheme }) {
  return (
    <div className="relative shrink-0">
      <div
        className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${theme.medalRing} p-[3px] animate-medal-glow`}
      >
        <div className={`relative w-full h-full rounded-[14px] ${theme.medalBg} flex items-center justify-center text-3xl sm:text-4xl overflow-hidden`}>
          <span className="animate-medal-tilt drop-shadow-md">{theme.medalIcon}</span>
          {/* Inner shimmer accross medal */}
          <span className="pointer-events-none absolute inset-0 -translate-x-full animate-progress-shimmer">
            <span className={`block w-1/2 h-full bg-gradient-to-r ${theme.shimmerColor} skew-x-12`} />
          </span>
        </div>
      </div>
    </div>
  );
}

interface HeroProps {
  info: TierInfo | null;
  tiers: Tier[] | null;
  /** Lifetime cashback đã tiết kiệm (đ). Truyền từ stats nếu có. */
  totalCashback?: number;
  /** Wallet balance — hiện kèm "đã tiết kiệm" nếu cashback chưa có */
  walletBalance?: number;
  /** Username + display name để share button. Optional — nếu không có thì ẩn nút. */
  username?: string;
  displayName?: string;
}

/**
 * Hero card chính — đẹp + hấp dẫn:
 *  • Glass-morphism background gradient theo tier
 *  • Medal icon glow + tilt animation
 *  • Heading "Hoàn X%" với gradient text
 *  • Lifetime saved badge
 *  • Progress bar shimmer effect
 *  • 2 stat cards với count-up
 *  • Projected earnings hint
 *  • VIP rewards trailer (collapsible)
 *  • Bảng tier full
 */
export function TierHeroCard({ info, tiers, totalCashback = 0, walletBalance = 0, username, displayName }: HeroProps) {
  const [tableOpen, setTableOpen] = useState(false);
  const [perksOpen, setPerksOpen] = useState(false);

  const ordersCountAnim = useCountUp(info?.ordersCount ?? 0, 1100);
  const referralsCountAnim = useCountUp(info?.referralsCount ?? 0, 1100);

  if (!info) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 animate-pulse">
        <div className="h-4 w-1/3 bg-gray-200 dark:bg-zinc-800 rounded mb-3" />
        <div className="h-10 w-2/3 bg-gray-200 dark:bg-zinc-800 rounded" />
      </div>
    );
  }

  const theme = TIER_THEME[info.current.code];
  const orderProgress = info.next
    ? Math.min(100, Math.round((info.ordersCount / info.next.minOrders) * 100))
    : 100;
  const refProgress = info.next
    ? Math.min(100, Math.round((info.referralsCount / info.next.minReferrals) * 100))
    : 100;

  // Projected earnings — bao nhiêu tiền user có thể tiết kiệm thêm/100 đơn nếu lên tier kế.
  const cashbackDelta = info.next ? info.next.cashbackPercent - info.cashbackPercent : 0;

  // Lifetime saved value — ưu tiên totalCashback, fallback walletBalance.
  const lifetimeSaved = totalCashback > 0 ? totalCashback : walletBalance;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-gray-200/70 dark:border-zinc-700/60 bg-gradient-to-br ${theme.cardBg} backdrop-blur-xl p-5 sm:p-6 shadow-xl shadow-black/5 dark:shadow-black/30 animate-tier-card-in`}
    >
      {/* Decorative glow blobs */}
      <div
        className={`pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full bg-gradient-to-br ${theme.cardGlow} blur-3xl opacity-60 animate-tier-float`}
      />
      <div
        className={`pointer-events-none absolute -bottom-16 -left-10 w-40 h-40 rounded-full bg-gradient-to-tr ${theme.cardGlow} blur-3xl opacity-40`}
      />
      {/* Tiny decorative star */}
      <div className="pointer-events-none absolute top-4 right-6 text-amber-400/40 dark:text-amber-300/30 text-lg animate-tier-float">★</div>
      <div className="pointer-events-none absolute bottom-6 right-12 text-amber-400/30 dark:text-amber-300/20 text-sm">✦</div>

      <div className="relative">
        {/* Top: medal + tier name + heading */}
        <div className="flex items-start gap-4 sm:gap-5">
          <MedalIcon theme={theme} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400">
                Tier hiện tại
              </p>
              <span className={`inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r ${theme.pill} border ${theme.rewardsBorder}`}>
                {info.current.icon} {info.current.name}
              </span>
            </div>
            <h2 className={`mt-1 text-3xl sm:text-4xl font-black leading-tight ${theme.accentText}`}>
              Hoàn {info.cashbackPercent}% mỗi đơn
            </h2>
            {lifetimeSaved > 0 && (
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 dark:text-zinc-300">
                <span>💚</span>
                Bạn đã tiết kiệm{" "}
                <b className="text-emerald-600 dark:text-emerald-400">
                  {lifetimeSaved.toLocaleString("vi-VN")}đ
                </b>{" "}
                cùng V-Affiliate
              </p>
            )}

            {/* Share achievement button — chỉ hiện khi user có data đáng share */}
            {username && (info.current.code !== "bronze" || lifetimeSaved >= 50000) && (
              <div className="mt-3">
                <AchievementShareButton
                  type="tier"
                  username={username}
                  displayName={displayName}
                  tier={info.current.name as "Bronze" | "Silver" | "Gold" | "VIP"}
                  cashbackPercent={info.cashbackPercent}
                  variant="secondary"
                  className="!bg-orange-500/10 !border-orange-500/30 !text-orange-700 dark:!text-orange-400 hover:!bg-orange-500/20"
                />
              </div>
            )}
          </div>
        </div>

        {/* Progress bar to next tier */}
        <div className="mt-5 sm:mt-6">
          {info.next ? (
            <>
              <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                <span className="text-gray-500 dark:text-zinc-400">
                  Tiến độ lên{" "}
                  <span className="inline-flex items-center gap-1 font-bold text-gray-800 dark:text-zinc-100">
                    <span>{info.next.icon}</span>
                    {info.next.name}
                  </span>
                </span>
                <span className={`font-bold ${theme.accentSolid}`}>{info.progressPercent}%</span>
              </div>
              <div className="relative h-2.5 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${theme.progressBar} transition-all duration-1000`}
                  style={{ width: `${Math.max(2, info.progressPercent)}%` }}
                >
                  {/* Shimmer overlay slides across the filled portion */}
                  <div className="absolute inset-0 overflow-hidden rounded-full">
                    <div className={`absolute inset-y-0 w-1/3 bg-gradient-to-r ${theme.shimmerColor} animate-progress-shimmer`} />
                  </div>
                </div>
              </div>
              {cashbackDelta > 0 && (
                <p className="mt-2 text-[11px] sm:text-xs text-gray-500 dark:text-zinc-400">
                  🎯 Lên{" "}
                  <span className={`font-bold ${theme.accentSolid}`}>{info.next.name}</span>
                  {" "}sẽ nhận <b>+{cashbackDelta}%</b> cashback cho mỗi đơn — tiết kiệm thêm khoảng{" "}
                  <b className="text-emerald-600 dark:text-emerald-400">
                    {(cashbackDelta * 1000 * info.next.minOrders).toLocaleString("vi-VN")}đ
                  </b>
                  /{info.next.minOrders} đơn.
                </p>
              )}
            </>
          ) : (
            <div className="rounded-xl bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-purple-500/10 border border-violet-500/30 px-4 py-3 text-center">
              <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                🎉 Tuyệt vời! Bạn đã đạt tier cao nhất.
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                Cashback {info.cashbackPercent}% áp dụng vĩnh viễn cho mọi đơn hàng.
              </p>
            </div>
          )}
        </div>

        {/* 2 stat cards */}
        {info.next && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {/* Đơn hoàn tiền */}
            <div className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${theme.cardOrder} px-3 py-2.5 backdrop-blur-sm`}>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-zinc-200">
                <span>🛒</span>
                <span>Đơn hoàn tiền</span>
              </div>
              <p className="mt-1 text-xl font-black text-gray-800 dark:text-zinc-100 tabular-nums">
                {ordersCountAnim}
                <span className="text-sm font-medium text-gray-400 dark:text-zinc-500">
                  {" / "}{info.next.minOrders}
                </span>
              </p>
              <p className={`text-[11px] font-medium ${theme.accentSolid}`}>
                Còn {info.ordersToNext} đơn
              </p>
              <div className="mt-1.5 h-1 rounded-full bg-gray-200/60 dark:bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${theme.progressBar} transition-all duration-1000`}
                  style={{ width: `${Math.max(2, orderProgress)}%` }}
                />
              </div>
            </div>

            {/* Bạn mời active */}
            <div className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${theme.cardRef} px-3 py-2.5 backdrop-blur-sm`}>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-zinc-200">
                <span>👥</span>
                <span>Bạn mời active</span>
              </div>
              <p className="mt-1 text-xl font-black text-gray-800 dark:text-zinc-100 tabular-nums">
                {referralsCountAnim}
                <span className="text-sm font-medium text-gray-400 dark:text-zinc-500">
                  {" / "}{info.next.minReferrals}
                </span>
              </p>
              <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                Còn {info.referralsToNext} bạn
              </p>
              <div className="mt-1.5 h-1 rounded-full bg-gray-200/60 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-400 to-pink-500 transition-all duration-1000"
                  style={{ width: `${Math.max(2, refProgress)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tip */}
        {info.next && (
          <p className="mt-3 text-center text-[11px] sm:text-xs text-gray-500 dark:text-zinc-400">
            💡 Đạt <b>1 trong 2</b> mốc trên là lên tier mới
          </p>
        )}

        {/* Footer toggles */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800 flex items-center gap-4 flex-wrap">
          <button
            type="button"
            onClick={() => setTableOpen(!tableOpen)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              className={`w-3.5 h-3.5 transition-transform ${tableOpen ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Bảng tier đầy đủ
          </button>

          <button
            type="button"
            onClick={() => setPerksOpen(!perksOpen)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:text-violet-500 dark:hover:text-violet-400 transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              className={`w-3.5 h-3.5 transition-transform ${perksOpen ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Quyền lợi VIP
          </button>
        </div>

        {/* Tier table */}
        {tableOpen && tiers && (
          <div className="mt-3 overflow-x-auto -mx-1 animate-tier-card-in">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="text-gray-400 dark:text-zinc-500 text-[11px] uppercase tracking-wider">
                  <th className="text-left font-medium py-2 px-2">Tier</th>
                  <th className="text-center font-medium py-2 px-2">Đơn HT</th>
                  <th className="text-center font-medium py-2 px-2">Bạn mời</th>
                  <th className="text-right font-medium py-2 px-2">Cashback</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t) => {
                  const isCurrent = t.code === info.current.code;
                  const tTheme = TIER_THEME[t.code];
                  return (
                    <tr
                      key={t.code}
                      className={`border-t border-gray-100 dark:border-zinc-800 ${
                        isCurrent ? "bg-orange-50/40 dark:bg-orange-500/[0.04]" : ""
                      }`}
                    >
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{t.icon}</span>
                          <span className={`font-semibold ${isCurrent ? tTheme.accentSolid : "text-gray-700 dark:text-zinc-200"}`}>
                            {t.name}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-500 text-white">
                              Hiện tại
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center text-gray-600 dark:text-zinc-300 tabular-nums">
                        {t.minOrders}+
                      </td>
                      <td className="py-2.5 px-2 text-center text-gray-600 dark:text-zinc-300 tabular-nums">
                        {t.minReferrals}+
                      </td>
                      <td className={`py-2.5 px-2 text-right font-black tabular-nums ${tTheme.accentSolid}`}>
                        {t.cashbackPercent}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* VIP perks */}
        {perksOpen && (
          <div className="mt-3 grid sm:grid-cols-2 gap-2 animate-tier-card-in">
            {VIP_PERKS.map((perk, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-lg border ${theme.rewardsBorder} bg-white/60 dark:bg-zinc-800/40 px-3 py-2 backdrop-blur-sm`}
              >
                <span className="text-base">{perk.icon}</span>
                <span className="text-xs font-medium text-gray-700 dark:text-zinc-200">
                  {perk.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
