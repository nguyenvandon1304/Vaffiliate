"use client";

import { useEffect, useState } from "react";

export interface TierInfo {
  current: {
    code: "bronze" | "silver" | "gold" | "vip";
    name: string;
    icon: string;
    color: string;
    minOrders: number;
    minReferrals: number;
    cashbackPercent: number;
  };
  next: TierInfo["current"] | null;
  ordersCount: number;
  referralsCount: number;
  progressPercent: number;
  ordersToNext: number;
  referralsToNext: number;
  cashbackPercent: number;
}

/** Ngày local hoá tier name → tiếng Việt cho user. */
const TIER_LABEL: Record<string, string> = {
  bronze: "ĐỒNG",
  silver: "BẠC",
  gold: "VÀNG",
  vip: "KIM CƯƠNG",
};

const TIER_THEME: Record<
  string,
  {
    pill: string;        // gradient + text class cho pill nhỏ
    pillIcon: string;    // emoji ring background
    card: string;        // gradient header card
    progressBar: string; // progress fill
    accent: string;      // text color cho subtitle
  }
> = {
  bronze: {
    pill: "from-amber-100 to-orange-100 text-amber-700 border-amber-200",
    pillIcon: "bg-amber-500/15 text-amber-600",
    card: "from-amber-50 via-orange-50/60 to-amber-100/50 dark:from-amber-500/[0.08] dark:via-orange-500/[0.06] dark:to-amber-500/[0.04]",
    progressBar: "from-amber-400 to-orange-500",
    accent: "text-amber-600 dark:text-amber-400",
  },
  silver: {
    pill: "from-slate-100 to-slate-200 text-slate-700 border-slate-300",
    pillIcon: "bg-slate-400/20 text-slate-600",
    card: "from-slate-50 via-zinc-50 to-slate-100/60 dark:from-slate-500/[0.08] dark:via-zinc-500/[0.06] dark:to-slate-500/[0.04]",
    progressBar: "from-slate-400 to-slate-600",
    accent: "text-slate-600 dark:text-slate-400",
  },
  gold: {
    pill: "from-yellow-100 to-amber-200 text-yellow-700 border-yellow-300",
    pillIcon: "bg-yellow-500/20 text-yellow-700",
    card: "from-yellow-50 via-amber-50 to-yellow-100/60 dark:from-yellow-500/[0.08] dark:via-amber-500/[0.06] dark:to-yellow-500/[0.04]",
    progressBar: "from-yellow-400 via-amber-500 to-yellow-600",
    accent: "text-yellow-700 dark:text-yellow-400",
  },
  vip: {
    pill: "from-violet-100 to-fuchsia-100 text-violet-700 border-violet-200",
    pillIcon: "bg-violet-500/20 text-violet-600",
    card: "from-violet-50 via-fuchsia-50 to-purple-100/60 dark:from-violet-500/[0.10] dark:via-fuchsia-500/[0.08] dark:to-purple-500/[0.06]",
    progressBar: "from-violet-500 via-fuchsia-500 to-purple-600",
    accent: "text-violet-600 dark:text-violet-400",
  },
};

/**
 * Hook fetch tier info — cache qua sessionStorage 60s để tránh re-fetch
 * khi user navigate giữa các tab.
 */
export function useTierInfo() {
  const [info, setInfo] = useState<TierInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = "tier_info_cache_v1";
    const TTL_MS = 60_000;

    // Try cache first
    let cachedHit: TierInfo | null = null;
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { at: number; data: TierInfo };
        if (Date.now() - parsed.at < TTL_MS) {
          cachedHit = parsed.data;
        }
      }
    } catch { /* ignore */ }

    if (cachedHit) {
      // Defer setState to next microtask để tránh cascading render warning.
      queueMicrotask(() => {
        if (cancelled) return;
        setInfo(cachedHit);
        setLoading(false);
      });
      return () => { cancelled = true; };
    }

    fetch("/api/tier", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.success && d.info) {
          setInfo(d.info);
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), data: d.info }));
          } catch { /* ignore */ }
        }
      })
      .catch(() => { /* silent */ })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  return { info, loading };
}

/**
 * Pill nhỏ — hiện ở header bên cạnh notification bell.
 * Click vào để xem chi tiết tier (link tới hero card section).
 */
export function TierPill({ info, onClick }: { info: TierInfo | null; onClick?: () => void }) {
  if (!info) return null;
  const theme = TIER_THEME[info.current.code];
  const label = TIER_LABEL[info.current.code] ?? info.current.name.toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Cấp bậc: ${label} · Cashback ${info.cashbackPercent}% · Click để xem chi tiết`}
      className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-gradient-to-r ${theme.pill} hover:scale-105 transition-transform shadow-sm`}
    >
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${theme.pillIcon}`}>
        {info.current.icon}
      </span>
      <span className="text-[11px] font-black tracking-wider whitespace-nowrap">{label}</span>
    </button>
  );
}

/**
 * Hero card — hiện ở overview, bên phải welcome banner hoặc trên cùng.
 * Layout: avatar tròn + tên tier + progress + tip lên tier kế.
 */
export function TierHeroCard({ info }: { info: TierInfo | null }) {
  if (!info) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 animate-pulse">
        <div className="h-4 w-1/3 bg-gray-200 dark:bg-zinc-800 rounded mb-3" />
        <div className="h-8 w-1/2 bg-gray-200 dark:bg-zinc-800 rounded" />
      </div>
    );
  }

  const theme = TIER_THEME[info.current.code];
  const label = TIER_LABEL[info.current.code] ?? info.current.name.toUpperCase();
  const nextLabel = info.next ? (TIER_LABEL[info.next.code] ?? info.next.name.toUpperCase()) : null;

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-gray-200/70 dark:border-zinc-700 bg-gradient-to-br ${theme.card} p-5 shadow-sm`}>
      {/* Decorative background ring */}
      <div className="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full border-2 border-current opacity-[0.04]" />
      <div className="pointer-events-none absolute top-12 right-6 text-current opacity-[0.06] text-3xl">★</div>

      <div className="relative flex items-center gap-4">
        {/* Tier icon avatar */}
        <div className="shrink-0 w-16 h-16 rounded-full bg-white dark:bg-zinc-800 shadow-md flex items-center justify-center text-3xl border-4 border-white/60 dark:border-zinc-700/60">
          {info.current.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`text-2xl font-black ${theme.accent}`}>{label}</h3>
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500">
              CẤP BẬC
            </span>
          </div>

          {info.next ? (
            <>
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-600 dark:text-zinc-300">
                <span>
                  Đơn hàng:{" "}
                  <b className="text-gray-800 dark:text-zinc-100">
                    {info.ordersCount} / {info.next.minOrders}
                  </b>
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
                Còn{" "}
                <b className="text-gray-800 dark:text-zinc-100">
                  {info.ordersToNext} đơn
                </b>{" "}
                để lên{" "}
                <b className={theme.accent}>{nextLabel}</b>
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs text-gray-500 dark:text-zinc-400">
              🎉 Chúc mừng! Bạn đã đạt cấp cao nhất —{" "}
              <b className={theme.accent}>cashback {info.cashbackPercent}%</b> cho mọi đơn.
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {info.next && (
        <div className="mt-4">
          <div className="relative h-2 rounded-full bg-gray-200/70 dark:bg-zinc-700/70 overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${theme.progressBar} transition-all duration-700`}
              style={{ width: `${Math.max(2, info.progressPercent)}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] font-medium">
            <span className="text-gray-500 dark:text-zinc-400">
              {info.progressPercent}% tới {nextLabel}
            </span>
            <span className={theme.accent}>
              Cashback hiện tại: <b>{info.cashbackPercent}%</b>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
