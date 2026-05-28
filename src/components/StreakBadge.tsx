"use client";

import { useEffect, useState } from "react";

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastStreakDate: string | null;
  nextMilestone: number | null;
  nextBonus: number;
}

const MILESTONES = [7, 14, 30, 60, 90];
const BONUSES = [5_000, 10_000, 25_000, 50_000, 100_000];

/**
 * Streak badge — hiển thị trong dashboard với pulse fire emoji + progress.
 * Click vào → mở modal chi tiết milestones.
 */
export function StreakBadge() {
  const [info, setInfo] = useState<StreakInfo | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/streak", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.success && d.info) setInfo(d.info);
      })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, []);

  if (!info || info.currentStreak === 0) return null;

  const intensity = info.currentStreak >= 30 ? "🔥🔥🔥" : info.currentStreak >= 7 ? "🔥🔥" : "🔥";
  const progress = info.nextMilestone
    ? Math.min(100, Math.round((info.currentStreak / info.nextMilestone) * 100))
    : 100;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Streak ${info.currentStreak} ngày — Click để xem chi tiết`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500/15 to-amber-500/15 dark:from-orange-500/20 dark:to-amber-500/20 border border-orange-300/50 dark:border-orange-500/30 hover:scale-105 transition-transform shadow-sm group"
      >
        <span className="text-base group-hover:animate-bounce-once">{intensity}</span>
        <span className="text-xs font-black text-orange-600 dark:text-orange-400 tabular-nums">
          {info.currentStreak}
        </span>
        <span className="text-[10px] font-medium text-orange-700/80 dark:text-orange-300/80">
          ngày
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200/70 dark:border-zinc-700 overflow-hidden animate-in zoom-in-95 fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header gradient cam-vàng */}
            <div className="bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 p-6 text-white relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-yellow-300/30 blur-2xl" />
              <button
                onClick={() => setOpen(false)}
                aria-label="Đóng"
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              <p className="text-[11px] uppercase tracking-widest opacity-85 font-bold mb-1">
                Daily Login Streak
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl">{intensity}</span>
                <div>
                  <p className="text-5xl font-black tabular-nums leading-none drop-shadow-md">
                    {info.currentStreak}
                  </p>
                  <p className="text-sm font-bold opacity-90">ngày liên tiếp</p>
                </div>
              </div>
              {info.longestStreak > info.currentStreak && (
                <p className="text-[11px] opacity-85 mt-2">
                  Kỷ lục cao nhất: <b>{info.longestStreak}</b> ngày
                </p>
              )}
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {info.nextMilestone ? (
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-gray-500 dark:text-zinc-400">
                      Tới mốc tiếp theo:{" "}
                      <b className="text-orange-600 dark:text-orange-400">
                        {info.nextMilestone} ngày
                      </b>
                    </span>
                    <span className="text-gray-500 dark:text-zinc-400">
                      Còn{" "}
                      <b className="text-gray-800 dark:text-zinc-100">
                        {info.nextMilestone - info.currentStreak}
                      </b>{" "}
                      ngày
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-700"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-2">
                    Phần thưởng kế tiếp:{" "}
                    <b className="text-emerald-600 dark:text-emerald-400">
                      +{info.nextBonus.toLocaleString("vi-VN")}đ
                    </b>{" "}
                    vào ví
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 px-4 py-3 text-center">
                  <p className="text-sm font-bold text-violet-700 dark:text-violet-300">
                    🎉 Bạn đã đạt mốc cao nhất!
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    Tiếp tục giữ streak để thiết lập kỷ lục mới.
                  </p>
                </div>
              )}

              {/* All milestones list */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold mb-2">
                  Bảng phần thưởng
                </p>
                <ul className="space-y-1.5">
                  {MILESTONES.map((day, i) => {
                    const reached = info.currentStreak >= day;
                    const isNext = info.nextMilestone === day;
                    return (
                      <li
                        key={day}
                        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg ${
                          reached
                            ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30"
                            : isNext
                            ? "bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30"
                            : "bg-gray-50 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">
                            {reached ? "✅" : isNext ? "🔥" : "🔒"}
                          </span>
                          <span className={`text-sm font-bold ${
                            reached
                              ? "text-emerald-700 dark:text-emerald-400"
                              : isNext
                              ? "text-orange-700 dark:text-orange-400"
                              : "text-gray-500 dark:text-zinc-500"
                          }`}>
                            {day} ngày
                          </span>
                        </div>
                        <span className={`text-xs font-bold tabular-nums ${
                          reached
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-gray-600 dark:text-zinc-400"
                        }`}>
                          +{BONUSES[i].toLocaleString("vi-VN")}đ
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <p className="text-[11px] text-gray-500 dark:text-zinc-400 text-center leading-relaxed">
                💡 Đăng nhập <b>mỗi ngày</b> để giữ streak. Bỏ 1 ngày → reset về 0.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
