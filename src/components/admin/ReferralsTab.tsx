"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/Toast";

interface TopReferrer {
  userId: number;
  username: string;
  display_name: string | null;
  total_invited: number;
  active_invited: number;
}
interface Overview {
  totalReferrals: number;
  activeReferrals: number;
  totalReferrers: number;
  conversionRate: number;
  topReferrers: TopReferrer[];
}
interface ReferralNode {
  userId: number;
  username: string;
  display_name: string | null;
  bonus_credited: number;
  created_at: string;
  invited_count: number;
}

function fmtDate(s: string) {
  if (!s) return "—";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function ReferralsTab() {
  const toast = useToast();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/admin/referrals", { cache: "no-store" });
      const d = await r.json();
      if (d.success) setOverview(d.overview);
      else setError(d.error || "Không tải được dữ liệu giới thiệu");
    } catch {
      setError("Lỗi kết nối khi tải mạng lưới giới thiệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch set state sau await
    load();
  }, [load]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">🌳 Mạng Lưới Giới Thiệu</h2>
        <button
          onClick={load}
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

      {loading ? (
        <p className="text-sm text-gray-400">Đang tải…</p>
      ) : overview ? (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <KpiCard label="Tổng lượt mời" value={overview.totalReferrals.toLocaleString("vi-VN")} icon="🔗" cls="bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400" />
            <KpiCard label="Mời thành công" value={overview.activeReferrals.toLocaleString("vi-VN")} icon="✅" cls="bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" />
            <KpiCard label="Số người mời" value={overview.totalReferrers.toLocaleString("vi-VN")} icon="👥" cls="bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400" />
            <KpiCard label="Tỉ lệ chuyển đổi" value={`${overview.conversionRate}%`} icon="📈" cls="bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400" />
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            💡 &quot;Mời thành công&quot; = người được mời đã có ít nhất 1 đơn hoàn tiền. Bấm vào 1 người để xem họ đã mời ai.
          </p>

          {/* Top referrers — expandable tree */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">🏆 Top người giới thiệu</h3>
            </div>
            {overview.topReferrers.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">Chưa có ai mời bạn bè.</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {overview.topReferrers.map((r, i) => (
                  <ReferrerRow key={r.userId} referrer={r} rank={i + 1} onError={(m) => toast.error(m)} />
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </>
  );
}

function ReferrerRow({ referrer, rank, onError }: { referrer: TopReferrer; rank: number; onError: (m: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<ReferralNode[] | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(false);

  const toggle = async () => {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (children === null) {
      setLoadingChildren(true);
      try {
        const r = await fetch(`/api/admin/referrals?userId=${referrer.userId}`, { cache: "no-store" });
        const d = await r.json();
        if (d.success) setChildren(d.children);
        else { onError(d.error || "Lỗi tải danh sách"); setChildren([]); }
      } catch {
        onError("Lỗi kết nối"); setChildren([]);
      } finally {
        setLoadingChildren(false);
      }
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left"
      >
        <span className={`w-6 text-center font-bold text-sm ${rank <= 3 ? "text-orange-500" : "text-gray-400"}`}>{rank}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{referrer.display_name || referrer.username}</p>
          <p className="text-xs text-gray-400">@{referrer.username}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{referrer.active_invited} thành công</p>
          <p className="text-xs text-gray-400">/ {referrer.total_invited} đã mời</p>
        </div>
        <svg viewBox="0 0 24 24" className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="bg-gray-50 dark:bg-gray-900/30 px-5 py-3 border-t border-gray-100 dark:border-gray-700/50">
          {loadingChildren ? (
            <p className="text-xs text-gray-400 py-2">Đang tải danh sách…</p>
          ) : children && children.length > 0 ? (
            <div className="space-y-1.5 pl-6 border-l-2 border-orange-200 dark:border-orange-500/30">
              {children.map((c) => (
                <div key={c.userId} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-300 dark:text-gray-600">└</span>
                  <span className="flex-1 truncate text-gray-700 dark:text-gray-200">{c.display_name || c.username}</span>
                  {c.invited_count > 0 && (
                    <span className="text-[10px] text-orange-500 bg-orange-100 dark:bg-orange-500/15 px-1.5 py-0.5 rounded-full">
                      mời {c.invited_count}
                    </span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    c.bonus_credited
                      ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  }`}>
                    {c.bonus_credited ? "Có đơn" : "Chưa có đơn"}
                  </span>
                  <span className="text-xs text-gray-400 w-16 text-right">{fmtDate(c.created_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-2 pl-6">Chưa mời được ai.</p>
          )}
        </div>
      )}
    </div>
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
