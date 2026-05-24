"use client";

import { useEffect, useMemo, useState } from "react";

interface FunnelData {
  totalUsers: number;
  usersWithLink: number;
  usersWithOrder: number;
  usersWithCompletedOrder: number;
  totalLinks: number;
  totalOrders: number;
  completedOrders: number;
  linkToOrderRate: number;
  orderToCompletedRate: number;
}

interface HeatmapPoint { dayOfWeek: number; hour: number; count: number; }

interface TopProduct {
  itemId: string;
  shopId: string;
  productName: string;
  totalSold: number;
  totalRevenue: number;
  totalCommission: number;
}

interface CohortRow {
  cohortMonth: string;
  totalUsers: number;
  retention: number[];
}

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function formatVND(n: number) { return (n || 0).toLocaleString("vi-VN") + "đ"; }

export function AnalyticsTab() {
  const [loading, setLoading] = useState(true);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [cohort, setCohort] = useState<CohortRow[]>([]);
  const [heatmapDays, setHeatmapDays] = useState<7 | 30 | 90>(30);
  const [cohortMonths, setCohortMonths] = useState<3 | 6 | 12>(6);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch sync with filter changes
    setLoading(true);
    fetch(`/api/admin/analytics?heatmapDays=${heatmapDays}&topLimit=10&cohortMonths=${cohortMonths}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.success) return;
        setFunnel(d.funnel);
        setHeatmap(d.heatmap);
        setTopProducts(d.topProducts);
        setCohort(d.cohort);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [heatmapDays, cohortMonths]);

  const heatmapMax = useMemo(() => Math.max(1, ...heatmap.map((p) => p.count)), [heatmap]);

  if (loading && !funnel) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Analytics chi tiết</h2>

      {/* ─── 1. Funnel Conversion ─── */}
      <section className="mb-8">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <span>🔻</span> Funnel Conversion
        </h3>
        {funnel && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <FunnelStep label="Tổng user" value={funnel.totalUsers} sub="đăng ký" color="from-blue-400 to-blue-500" />
              <FunnelStep
                label="User đã tạo link"
                value={funnel.usersWithLink}
                sub={`${funnel.totalUsers > 0 ? Math.round((funnel.usersWithLink / funnel.totalUsers) * 100) : 0}% từ tổng user`}
                color="from-cyan-400 to-cyan-500"
              />
              <FunnelStep
                label="User có đơn hàng"
                value={funnel.usersWithOrder}
                sub={`${funnel.linkToOrderRate}% từ user có link`}
                color="from-amber-400 to-orange-500"
              />
              <FunnelStep
                label="User có đơn hoàn"
                value={funnel.usersWithCompletedOrder}
                sub={`${funnel.usersWithOrder > 0 ? Math.round((funnel.usersWithCompletedOrder / funnel.usersWithOrder) * 100) : 0}% từ user có đơn`}
                color="from-green-400 to-emerald-500"
              />
            </div>
            <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Link đã tạo</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{funnel.totalLinks}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Đơn tổng</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{funnel.totalOrders}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Đơn hoàn tiền</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{funnel.completedOrders}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tỉ lệ hoàn</p>
                <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{funnel.orderToCompletedRate}%</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ─── 2. Hourly Heatmap ─── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>🔥</span> Heatmap đơn hàng theo giờ
          </h3>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900/50 rounded-lg p-0.5">
            {([7, 30, 90] as const).map((d) => (
              <button
                key={d}
                onClick={() => setHeatmapDays(d)}
                className={`text-xs font-medium px-3 py-1 rounded-md transition-colors ${
                  heatmapDays === d
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >{d} ngày</button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          {heatmap.every((p) => p.count === 0) ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">
              Chưa có đơn hàng trong {heatmapDays} ngày qua. Heatmap sẽ hiện khi có đơn.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div className="flex">
                  {/* Day labels column */}
                  <div className="flex flex-col">
                    <div className="h-6" /> {/* spacer for hour header */}
                    {DAY_LABELS.map((d) => (
                      <div key={d} className="h-6 flex items-center text-[11px] text-gray-500 dark:text-gray-400 pr-2 font-mono">
                        {d}
                      </div>
                    ))}
                  </div>
                  {/* Heatmap grid */}
                  <div className="flex-1">
                    {/* Hour header */}
                    <div className="flex h-6">
                      {Array.from({ length: 24 }, (_, h) => (
                        <div key={h} className="flex-1 min-w-[18px] text-center text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                          {h % 3 === 0 ? h : ""}
                        </div>
                      ))}
                    </div>
                    {/* Rows */}
                    {DAY_LABELS.map((_, dow) => (
                      <div key={dow} className="flex h-6 gap-[1px]">
                        {Array.from({ length: 24 }, (_, h) => {
                          const point = heatmap.find((p) => p.dayOfWeek === dow && p.hour === h);
                          const count = point?.count ?? 0;
                          const intensity = count / heatmapMax;
                          // Map intensity → bg color
                          let bg = "bg-gray-100 dark:bg-gray-700/50";
                          if (intensity > 0.8) bg = "bg-orange-600";
                          else if (intensity > 0.6) bg = "bg-orange-500";
                          else if (intensity > 0.4) bg = "bg-orange-400";
                          else if (intensity > 0.2) bg = "bg-orange-300";
                          else if (count > 0) bg = "bg-orange-200";
                          return (
                            <div
                              key={h}
                              className={`flex-1 min-w-[18px] h-full rounded-sm ${bg} hover:ring-2 hover:ring-orange-500 cursor-help transition-all`}
                              title={`${DAY_LABELS[dow]} ${h}:00 — ${count} đơn`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                  <span>Ít</span>
                  <div className="flex gap-[1px]">
                    <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-700/50" />
                    <div className="w-3 h-3 rounded-sm bg-orange-200" />
                    <div className="w-3 h-3 rounded-sm bg-orange-300" />
                    <div className="w-3 h-3 rounded-sm bg-orange-400" />
                    <div className="w-3 h-3 rounded-sm bg-orange-500" />
                    <div className="w-3 h-3 rounded-sm bg-orange-600" />
                  </div>
                  <span>Nhiều</span>
                  <span className="ml-auto">Max: {heatmapMax} đơn/giờ</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── 3. Top Products ─── */}
      <section className="mb-8">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <span>🏆</span> Top 10 sản phẩm được tạo link nhiều nhất
        </h3>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-10 px-5">
              Chưa có sản phẩm nào được tạo link. Hãy chờ user bắt đầu sử dụng.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                    <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">#</th>
                    <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Sản phẩm</th>
                    <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Shop ID / Item ID</th>
                    <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Số link</th>
                    <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Doanh thu</th>
                    <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Hoa hồng</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <tr key={`${p.shopId}-${p.itemId}`} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-bold">
                        {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-medium max-w-md truncate" title={p.productName}>
                        {p.productName}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">
                        {p.shopId} / {p.itemId}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-bold">
                        {p.totalSold}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">
                        {formatVND(p.totalRevenue)}
                      </td>
                      <td className="px-4 py-3 text-right text-orange-600 dark:text-orange-400 font-bold">
                        {formatVND(p.totalCommission)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ─── 4. Cohort Retention ─── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>📊</span> Cohort Retention
          </h3>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900/50 rounded-lg p-0.5">
            {([3, 6, 12] as const).map((d) => (
              <button
                key={d}
                onClick={() => setCohortMonths(d)}
                className={`text-xs font-medium px-3 py-1 rounded-md transition-colors ${
                  cohortMonths === d
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >{d} tháng</button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          {cohort.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">
              Chưa đủ dữ liệu để vẽ cohort. Cần user đăng ký trong các tháng vừa qua.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Mỗi hàng = nhóm user đăng ký cùng tháng. Cột = % user còn active (có session/order) sau N tháng.
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-3 py-2 text-gray-500 dark:text-gray-400 font-medium">Tháng đăng ký</th>
                    <th className="text-center px-3 py-2 text-gray-500 dark:text-gray-400 font-medium">Tổng user</th>
                    {Array.from({ length: cohortMonths }, (_, i) => (
                      <th key={i} className="text-center px-2 py-2 text-gray-500 dark:text-gray-400 font-medium text-xs">
                        M{i}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohort.map((c) => (
                    <tr key={c.cohortMonth} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="px-3 py-2 text-gray-900 dark:text-white font-mono text-xs">{c.cohortMonth}</td>
                      <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300 font-bold">{c.totalUsers}</td>
                      {Array.from({ length: cohortMonths }, (_, i) => {
                        const r = c.retention[i];
                        if (r === undefined) {
                          return <td key={i} className="px-2 py-2 text-center text-gray-300 dark:text-gray-600">—</td>;
                        }
                        // Color intensity
                        const intensity = r / 100;
                        let bg = "";
                        let textColor = "text-gray-700 dark:text-gray-300";
                        if (r >= 80) { bg = "bg-emerald-500"; textColor = "text-white"; }
                        else if (r >= 60) { bg = "bg-emerald-400"; textColor = "text-white"; }
                        else if (r >= 40) { bg = "bg-emerald-300"; textColor = "text-emerald-900"; }
                        else if (r >= 20) { bg = "bg-emerald-200"; textColor = "text-emerald-900"; }
                        else if (r > 0) { bg = "bg-emerald-100"; textColor = "text-emerald-700"; }
                        else bg = "bg-gray-50 dark:bg-gray-700/30";
                        // intensity unused but kept for future fine-tuning
                        void intensity;
                        return (
                          <td key={i} className={`px-2 py-2 text-center text-xs font-bold ${bg} ${textColor}`}>
                            {r}%
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function FunnelStep({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  return (
    <div className={`rounded-lg p-4 bg-gradient-to-br ${color} text-white`}>
      <p className="text-xs uppercase tracking-wider opacity-90 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value.toLocaleString("vi-VN")}</p>
      <p className="text-[11px] opacity-80 mt-1">{sub}</p>
    </div>
  );
}
