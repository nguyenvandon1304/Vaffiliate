"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastStreakDate: string | null;
  nextMilestone: number | null;
  nextBonus: number;
}

const MILESTONES = [7, 14, 30, 60, 90];
const BONUSES = [2_000, 3_000, 5_000, 10_000, 20_000];

/**
 * Streak badge — hiển thị trong dashboard với pulse fire emoji + progress.
 * Click vào → mở modal chi tiết milestones.
 */
export function StreakBadge() {
  const [info, setInfo] = useState<StreakInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- portal chỉ render sau khi mount (client)
  useEffect(() => { setMounted(true); }, []);

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

  // Khoá scroll nền khi modal mở.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

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
        className="streak-badge-compact android-only inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500/15 to-amber-500/15 dark:from-orange-500/20 dark:to-amber-500/20 border border-orange-300/50 dark:border-orange-500/30 hover:scale-105 transition-transform shadow-sm group"
      >
        <span className="text-base streak-icon group-hover:animate-bounce-once">{intensity}</span>
        <span className="text-xs font-black text-orange-600 dark:text-orange-400 tabular-nums streak-text">
          {info.currentStreak}
        </span>
        <span className="text-[10px] font-medium text-orange-700/80 dark:text-orange-300/80 streak-label">
          ngày
        </span>
      </button>

      {mounted && open && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm max-h-[85vh] flex flex-col bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-gray-200/70 dark:border-zinc-700 overflow-hidden animate-in zoom-in-95 fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header gradient cam-vàng — gọn, cân đối */}
            <div className="shrink-0 bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 px-5 pt-5 pb-5 text-white relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-yellow-300/30 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-8 w-32 h-32 rounded-full bg-orange-300/20 blur-2xl pointer-events-none" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Đóng"
                className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-white/25 hover:bg-white/45 active:bg-white/60 flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              <p className="text-[10px] uppercase tracking-widest opacity-85 font-bold mb-3">
                Daily Login Streak
              </p>

              {/* Streak count — ngọn lửa + số căn giữa cân đối */}
              <div className="flex items-center gap-3">
                <span className="text-5xl leading-none drop-shadow-lg shrink-0">{intensity.slice(0, 2)}</span>
                <div className="leading-none">
                  <div className="flex items-end gap-1.5">
                    <span className="text-5xl font-black tabular-nums leading-none drop-shadow-md">
                      {info.currentStreak}
                    </span>
                    <span className="text-base font-bold opacity-90 mb-1">ngày</span>
                  </div>
                  <p className="text-xs font-semibold opacity-90 mt-1">liên tiếp 🎯</p>
                </div>
              </div>

              {info.longestStreak > info.currentStreak && (
                <div className="mt-3 inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1 text-[11px] font-semibold">
                  <span>🏆</span>
                  Kỷ lục: <b>{info.longestStreak}</b> ngày
                </div>
              )}
            </div>

            {/* Body — cuộn được nếu dài */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              {info.nextMilestone ? (
                <div className="rounded-xl bg-orange-50/70 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 p-3">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-gray-600 dark:text-zinc-300">
                      Tới mốc{" "}
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
                  <div className="h-2.5 rounded-full bg-white dark:bg-zinc-800 overflow-hidden shadow-inner">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-700"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 mt-2.5 text-xs">
                    <span>🎁</span>
                    <span className="text-gray-600 dark:text-zinc-300">Phần thưởng kế tiếp:</span>
                    <b className="text-emerald-600 dark:text-emerald-400">
                      +{info.nextBonus.toLocaleString("vi-VN")}đ
                    </b>
                  </div>
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
                            ? "bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 ring-1 ring-orange-200/60 dark:ring-orange-500/20"
                            : "bg-gray-50 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base shrink-0">
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
                          {isNext && (
                            <span className="text-[10px] font-semibold text-orange-500">· Tiếp theo</span>
                          )}
                        </div>
                        <span className={`text-sm font-black tabular-nums ${
                          reached
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isNext
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-gray-500 dark:text-zinc-400"
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
              <p className="text-[11px] text-amber-600 dark:text-amber-400/90 text-center leading-relaxed bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-3 py-2">
                🎁 Thưởng streak là quà động viên, cộng thẳng vào ví. Để rút về ngân hàng, bạn chỉ cần có <b>1 đơn hoàn tiền</b> mua qua link V-Affiliate — mở khoá rút là rút thoải mái nhé!
              </p>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
