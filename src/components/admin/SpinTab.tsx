"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/Toast";

interface SegmentBreakdown {
  segmentIndex: number;
  label: string;
  count: number;
  totalAmount: number;
}
interface RecentWin {
  id: number;
  username: string;
  display_name: string | null;
  reward_amount: number;
  reward_label: string;
  spun_at: string;
}
interface TopWinner {
  username: string;
  display_name: string | null;
  total_won: number;
  spin_count: number;
}
interface SpinStats {
  totalSpins: number;
  totalPaidOut: number;
  spinsToday: number;
  paidToday: number;
  uniquePlayers: number;
  segmentBreakdown: SegmentBreakdown[];
  recentWins: RecentWin[];
  topWinners: TopWinner[];
}

function fmtVND(n: number) { return (n || 0).toLocaleString("vi-VN") + "đ"; }
function fmtDate(s: string) {
  if (!s) return "—";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function SpinTab() {
  const toast = useToast();
  const [stats, setStats] = useState<SpinStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Spin config (từ settings API)
  const [cfg, setCfg] = useState<Record<string, string>>({});
  const [cfgLoaded, setCfgLoaded] = useState(false);
  const [savingCfg, setSavingCfg] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/admin/spin", { cache: "no-store" });
      const d = await r.json();
      if (d.success) setStats(d.stats);
      else setError(d.error || "Không tải được thống kê vòng quay");
    } catch {
      setError("Lỗi kết nối khi tải thống kê vòng quay");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/settings");
      const d = await r.json();
      if (d.success) { setCfg(d.settings); setCfgLoaded(true); }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch set state sau await
    loadStats();
    loadConfig();
  }, [loadStats, loadConfig]);

  const saveCfg = async () => {
    setSavingCfg(true);
    try {
      const r = await fetch("/api/admin/settings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            spin_enabled: cfg.spin_enabled,
            spin_orders_per_token: cfg.spin_orders_per_token,
            spin_referrals_per_token: cfg.spin_referrals_per_token,
          },
        }),
      });
      const d = await r.json();
      if (d.success) { toast.success("Đã lưu cấu hình vòng quay"); setCfg(d.settings); }
      else toast.error(d.error || "Lỗi");
    } catch {
      toast.error("Lỗi kết nối khi lưu cấu hình");
    } finally {
      setSavingCfg(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">🎰 Quản Lý Vòng Quay May Mắn</h2>
        <button
          onClick={loadStats}
          className="text-sm font-medium px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          🔄 Làm mới
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Cấu hình */}
      {cfgLoaded && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">⚙️ Cấu hình vòng quay</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.spin_enabled === "1"}
                onChange={(e) => setCfg((p) => ({ ...p, spin_enabled: e.target.checked ? "1" : "0" }))}
                className="w-4 h-4 accent-orange-500"
              />
              <span className="text-gray-700 dark:text-gray-300 font-medium">Bật vòng quay</span>
            </label>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Số đơn / 1 lượt quay</label>
              <input
                type="number" min={1}
                value={cfg.spin_orders_per_token ?? ""}
                onChange={(e) => setCfg((p) => ({ ...p, spin_orders_per_token: e.target.value }))}
                className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Số bạn mời / 1 lượt quay</label>
              <input
                type="number" min={1}
                value={cfg.spin_referrals_per_token ?? ""}
                onChange={(e) => setCfg((p) => ({ ...p, spin_referrals_per_token: e.target.value }))}
                className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            onClick={saveCfg}
            disabled={savingCfg}
            className="mt-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            {savingCfg ? "Đang lưu..." : "💾 Lưu cấu hình"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Đang tải thống kê…</p>
      ) : stats ? (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <KpiCard label="Tổng lượt quay" value={stats.totalSpins.toLocaleString("vi-VN")} icon="🎡" cls="bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400" />
            <KpiCard label="Tổng đã chi" value={fmtVND(stats.totalPaidOut)} icon="💸" cls="bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400" />
            <KpiCard label="Lượt quay hôm nay" value={stats.spinsToday.toLocaleString("vi-VN")} icon="📅" cls="bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400" />
            <KpiCard label="Chi hôm nay" value={fmtVND(stats.paidToday)} icon="💰" cls="bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400" />
            <KpiCard label="Người chơi" value={stats.uniquePlayers.toLocaleString("vi-VN")} icon="👥" cls="bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Segment breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">📊 Phân bố ô trúng</h3>
              {stats.segmentBreakdown.length === 0 ? (
                <p className="text-sm text-gray-400">Chưa có lượt quay nào.</p>
              ) : (
                <div className="space-y-2">
                  {stats.segmentBreakdown.map((s) => {
                    const pct = stats.totalSpins > 0 ? (s.count / stats.totalSpins) * 100 : 0;
                    return (
                      <div key={s.segmentIndex}>
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span className="text-gray-700 dark:text-gray-300 font-medium">{s.label}</span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {s.count} lượt ({pct.toFixed(1)}%) · {fmtVND(s.totalAmount)}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-orange-400 to-orange-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top winners */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">🏆 Top trúng nhiều nhất</h3>
              {stats.topWinners.length === 0 ? (
                <p className="text-sm text-gray-400">Chưa có dữ liệu.</p>
              ) : (
                <div className="space-y-1.5">
                  {stats.topWinners.map((w, i) => (
                    <div key={w.username} className="flex items-center gap-2 text-sm">
                      <span className="w-5 text-center font-bold text-gray-400">{i + 1}</span>
                      <span className="flex-1 truncate text-gray-700 dark:text-gray-200">{w.display_name || w.username}</span>
                      <span className="text-xs text-gray-400">{w.spin_count} lượt</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400 w-20 text-right">{fmtVND(w.total_won)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent wins */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mt-6">
            <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">🕐 Lượt quay gần đây</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium">User</th>
                    <th className="text-left px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Kết quả</th>
                    <th className="text-right px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Thưởng</th>
                    <th className="text-right px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentWins.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Chưa có lượt quay nào</td></tr>
                  ) : stats.recentWins.map((w) => (
                    <tr key={w.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-2.5 text-gray-900 dark:text-white">{w.display_name || w.username}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{w.reward_label}</td>
                      <td className={`px-4 py-2.5 text-right font-medium ${w.reward_amount > 0 ? "text-orange-600 dark:text-orange-400" : "text-gray-400"}`}>
                        {w.reward_amount > 0 ? fmtVND(w.reward_amount) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400 text-xs">{fmtDate(w.spun_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

function KpiCard({ label, value, icon, cls }: { label: string; value: string; icon: string; cls: string }) {
  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${cls}`}>
      <div className="text-xl sm:text-2xl mb-1">{icon}</div>
      <p className="text-base sm:text-lg font-bold truncate">{value}</p>
      <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{label}</p>
    </div>
  );
}
