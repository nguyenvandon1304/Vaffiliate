"use client";

import { useEffect, useState } from "react";

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
  pill: string;        // gradient + text class cho pill nhỏ
  pillIcon: string;
  medalRing: string;   // gradient ring cho medal icon to ở hero
  medalBg: string;     // background bên trong ring
  accent: string;      // text color cho heading + cashback %
  progressBar: string;
  cardOrder: string;   // bg gradient card "Đơn hoàn tiền"
  cardRef: string;     // bg gradient card "Bạn mời active"
}

const TIER_THEME: Record<string, TierTheme> = {
  bronze: {
    pill: "from-amber-100 to-orange-100 text-amber-700 border-amber-200",
    pillIcon: "bg-amber-500/15 text-amber-600",
    medalRing: "from-amber-400 via-orange-400 to-amber-500",
    medalBg: "bg-amber-100 dark:bg-amber-950/40",
    accent: "text-amber-600 dark:text-amber-400",
    progressBar: "from-amber-400 via-orange-400 to-amber-500",
    cardOrder: "from-orange-500/[0.08] to-amber-500/[0.04] border-orange-500/20",
    cardRef: "from-rose-500/[0.08] to-pink-500/[0.04] border-rose-500/20",
  },
  silver: {
    pill: "from-slate-100 to-slate-200 text-slate-700 border-slate-300",
    pillIcon: "bg-slate-400/20 text-slate-600",
    medalRing: "from-slate-300 via-slate-400 to-slate-500",
    medalBg: "bg-slate-100 dark:bg-slate-900/40",
    accent: "text-slate-600 dark:text-slate-300",
    progressBar: "from-slate-300 via-slate-400 to-slate-500",
    cardOrder: "from-slate-500/[0.08] to-zinc-500/[0.04] border-slate-500/20",
    cardRef: "from-rose-500/[0.08] to-pink-500/[0.04] border-rose-500/20",
  },
  gold: {
    pill: "from-yellow-100 to-amber-200 text-yellow-700 border-yellow-300",
    pillIcon: "bg-yellow-500/20 text-yellow-700",
    medalRing: "from-yellow-300 via-amber-400 to-yellow-500",
    medalBg: "bg-yellow-100 dark:bg-yellow-950/40",
    accent: "text-yellow-600 dark:text-yellow-400",
    progressBar: "from-yellow-300 via-amber-400 to-yellow-500",
    cardOrder: "from-yellow-500/[0.08] to-amber-500/[0.04] border-yellow-500/20",
    cardRef: "from-rose-500/[0.08] to-pink-500/[0.04] border-rose-500/20",
  },
  vip: {
    pill: "from-violet-100 to-fuchsia-100 text-violet-700 border-violet-200",
    pillIcon: "bg-violet-500/20 text-violet-600",
    medalRing: "from-violet-400 via-fuchsia-500 to-purple-600",
    medalBg: "bg-violet-100 dark:bg-violet-950/40",
    accent: "text-violet-600 dark:text-violet-400",
    progressBar: "from-violet-400 via-fuchsia-500 to-purple-600",
    cardOrder: "from-violet-500/[0.08] to-fuchsia-500/[0.04] border-violet-500/20",
    cardRef: "from-rose-500/[0.08] to-pink-500/[0.04] border-rose-500/20",
  },
};

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

/**
 * Pill nhỏ ở header — hiện tier name (Bronze/Silver/Gold/VIP).
 */
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

/** Medal icon SVG to dùng trong hero — gradient theo tier. */
function MedalIcon({ theme }: { theme: TierTheme }) {
  return (
    <div
      className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${theme.medalRing} p-[3px] shadow-lg shadow-black/10`}
    >
      <div className={`w-full h-full rounded-[14px] ${theme.medalBg} flex items-center justify-center text-3xl sm:text-4xl`}>
        🏅
      </div>
    </div>
  );
}

/**
 * Hero card hoàn chỉnh — match design ảnh 1:
 *   - Top: medal icon + "Tier hiện tại {name}" + "Hoàn X% mỗi đơn" (text to)
 *   - Progress bar tới next tier
 *   - 2 stat cards (Đơn hoàn tiền + Bạn mời active)
 *   - Tip "Đạt 1 trong 2 mốc trên là lên tier mới"
 *   - Collapsible "Xem bảng tier đầy đủ"
 */
export function TierHeroCard({ info, tiers }: { info: TierInfo | null; tiers: Tier[] | null }) {
  const [tableOpen, setTableOpen] = useState(false);

  if (!info) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 animate-pulse">
        <div className="h-4 w-1/3 bg-gray-200 dark:bg-zinc-800 rounded mb-3" />
        <div className="h-8 w-1/2 bg-gray-200 dark:bg-zinc-800 rounded" />
      </div>
    );
  }

  const theme = TIER_THEME[info.current.code];

  // Progress per axis (clamp 0-100).
  const orderProgress = info.next
    ? Math.min(100, Math.round((info.ordersCount / info.next.minOrders) * 100))
    : 100;
  const refProgress = info.next
    ? Math.min(100, Math.round((info.referralsCount / info.next.minReferrals) * 100))
    : 100;

  return (
    <div className="rounded-2xl border border-gray-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 backdrop-blur p-5 sm:p-6 shadow-sm">
      {/* Header: medal + tier name + cashback */}
      <div className="flex items-start gap-4 sm:gap-5">
        <MedalIcon theme={theme} />
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400">
            Tier hiện tại{" "}
            <span className="font-bold text-gray-800 dark:text-zinc-100">{info.current.name}</span>
          </p>
          <h2 className={`text-2xl sm:text-3xl font-black mt-0.5 ${theme.accent}`}>
            Hoàn {info.cashbackPercent}% mỗi đơn
          </h2>
        </div>
      </div>

      {/* Progress to next tier */}
      <div className="mt-5">
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
              <span className={`font-bold ${theme.accent}`}>{info.progressPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${theme.progressBar} transition-all duration-700`}
                style={{ width: `${Math.max(2, info.progressPercent)}%` }}
              />
            </div>
          </>
        ) : (
          <div className="rounded-lg bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 px-3 py-2 text-xs sm:text-sm text-center">
            🎉 <span className="font-semibold">Tuyệt vời!</span> Bạn đã đạt tier cao nhất.
          </div>
        )}
      </div>

      {/* 2 stat cards */}
      {info.next && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {/* Đơn hoàn tiền */}
          <div className={`rounded-xl border bg-gradient-to-br ${theme.cardOrder} px-3 py-2.5`}>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-zinc-200">
              <span>🛒</span>
              <span>Đơn hoàn tiền</span>
            </div>
            <p className="mt-1 text-lg font-black text-gray-800 dark:text-zinc-100">
              {info.ordersCount}
              <span className="text-sm font-medium text-gray-400 dark:text-zinc-500">
                {" / "}{info.next.minOrders}
              </span>
            </p>
            <p className={`text-[11px] font-medium ${theme.accent}`}>
              Còn {info.ordersToNext} đơn
            </p>
            {/* mini progress */}
            <div className="mt-1.5 h-1 rounded-full bg-gray-200/60 dark:bg-zinc-800 overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${theme.progressBar}`}
                style={{ width: `${Math.max(2, orderProgress)}%` }}
              />
            </div>
          </div>

          {/* Bạn mời active */}
          <div className={`rounded-xl border bg-gradient-to-br ${theme.cardRef} px-3 py-2.5`}>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-zinc-200">
              <span>👥</span>
              <span>Bạn mời active</span>
            </div>
            <p className="mt-1 text-lg font-black text-gray-800 dark:text-zinc-100">
              {info.referralsCount}
              <span className="text-sm font-medium text-gray-400 dark:text-zinc-500">
                {" / "}{info.next.minReferrals}
              </span>
            </p>
            <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
              Còn {info.referralsToNext} bạn
            </p>
            <div className="mt-1.5 h-1 rounded-full bg-gray-200/60 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-400 to-pink-500"
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

      {/* Collapsible tier table */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setTableOpen(!tableOpen)}
          className="flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
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
          Xem bảng tier đầy đủ
        </button>

        {tableOpen && tiers && (
          <div className="mt-3 overflow-x-auto -mx-1">
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
                          <span className={`font-semibold ${isCurrent ? tTheme.accent : "text-gray-700 dark:text-zinc-200"}`}>
                            {t.name}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-500 text-white">
                              Hiện tại
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center text-gray-600 dark:text-zinc-300">
                        {t.minOrders}+
                      </td>
                      <td className="py-2.5 px-2 text-center text-gray-600 dark:text-zinc-300">
                        {t.minReferrals}+
                      </td>
                      <td className={`py-2.5 px-2 text-right font-black ${tTheme.accent}`}>
                        {t.cashbackPercent}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
