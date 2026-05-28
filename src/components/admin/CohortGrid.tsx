"use client";

import { useEffect, useState } from "react";

interface Cohort {
  cohort: string;
  size: number;
  retention: number[];
}

/** Color heatmap based on retention %. */
function getHeatColor(pct: number): string {
  if (pct < 0) return "bg-gray-50 dark:bg-zinc-800/30 text-gray-300 dark:text-zinc-700"; // future
  if (pct === 0) return "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500";
  if (pct < 20) return "bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300";
  if (pct < 40) return "bg-orange-200 dark:bg-orange-500/30 text-orange-800 dark:text-orange-200";
  if (pct < 60) return "bg-orange-300 dark:bg-orange-500/45 text-orange-900 dark:text-orange-100";
  if (pct < 80) return "bg-orange-400 dark:bg-orange-500/60 text-white";
  return "bg-orange-500 text-white";
}

/**
 * Cohort retention grid — admin chart hiển thị % user còn active sau N tuần
 * theo từng tuần đăng ký.
 *
 * Đọc nhanh: cột bên trái = tuần đăng ký, hàng ngang = tuần thứ N sau signup.
 * Heatmap màu cam càng đậm = retention càng cao.
 */
export function CohortGrid() {
  const [cohorts, setCohorts] = useState<Cohort[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/cohort?weeks=8", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.success && d.cohorts) setCohorts(d.cohorts);
      })
      .catch(() => { /* silent */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div className="h-5 w-1/3 bg-gray-200 dark:bg-zinc-700 rounded mb-4 animate-pulse" />
        <div className="grid grid-cols-9 gap-1">
          {Array.from({ length: 72 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!cohorts || cohorts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">📊 Cohort retention</h3>
        <p className="text-xs text-gray-500 text-center py-8">
          Chưa đủ data 8 tuần để hiển thị cohort. Quay lại sau khi có user đăng ký.
        </p>
      </div>
    );
  }

  const numWeeks = cohorts[0]?.retention.length ?? 8;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
            📊 Cohort retention (8 tuần)
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
            % user còn login mỗi tuần sau khi đăng ký. Cam đậm = retention cao.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto -mx-1">
        <table className="text-xs w-full">
          <thead>
            <tr>
              <th className="text-left p-1 font-medium text-gray-500 dark:text-zinc-500 sticky left-0 bg-white dark:bg-gray-800 z-10">
                Tuần signup
              </th>
              <th className="text-center p-1 font-medium text-gray-500 dark:text-zinc-500">
                Size
              </th>
              {Array.from({ length: numWeeks }).map((_, i) => (
                <th key={i} className="text-center p-1 font-medium text-gray-500 dark:text-zinc-500 min-w-[36px]">
                  W{i}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts.map((c) => (
              <tr key={c.cohort}>
                <td className="p-1 font-bold text-gray-800 dark:text-zinc-100 sticky left-0 bg-white dark:bg-gray-800 z-10 whitespace-nowrap">
                  {c.cohort}
                </td>
                <td className="p-1 text-center text-gray-600 dark:text-zinc-300 tabular-nums">
                  {c.size}
                </td>
                {c.retention.map((pct, w) => (
                  <td key={w} className="p-0.5">
                    <div
                      className={`w-full h-9 flex items-center justify-center rounded font-bold text-[11px] tabular-nums ${getHeatColor(pct)}`}
                      title={pct < 0 ? "Tương lai" : `Tuần ${w}: ${pct}% retention`}
                    >
                      {pct < 0 ? "—" : pct === 0 ? "·" : `${pct}%`}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3 flex-wrap text-[11px] text-gray-500 dark:text-zinc-400">
        <span>Legend:</span>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-gray-100 dark:bg-zinc-800" />
          <span>0%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-orange-100 dark:bg-orange-500/15" />
          <span>1-19%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-orange-300 dark:bg-orange-500/45" />
          <span>40-59%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-orange-500" />
          <span>80%+</span>
        </div>
      </div>
    </div>
  );
}
