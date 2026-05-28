"use client";

import { useEffect, useState } from "react";

interface DeltaMetric {
  today: number;
  yesterday: number;
  deltaPct: number;
}

interface DashboardData {
  delta: {
    newUsers: DeltaMetric;
    newOrders: DeltaMetric;
    cashback: DeltaMetric;
    withdrawals: DeltaMetric;
  };
  online: number;
  activity: Array<{
    id: string;
    type: "user_register" | "order_complete" | "withdrawal_request" | "withdrawal_approved" | "tier_up" | "audit";
    username: string;
    description: string;
    amount?: number;
    createdAt: string;
  }>;
}

const TYPE_META: Record<string, { icon: string; color: string }> = {
  user_register:       { icon: "👤", color: "from-blue-400 to-blue-500" },
  order_complete:      { icon: "🎉", color: "from-emerald-400 to-emerald-500" },
  withdrawal_request:  { icon: "💸", color: "from-amber-400 to-amber-500" },
  withdrawal_approved: { icon: "✅", color: "from-green-500 to-green-600" },
  tier_up:             { icon: "🏅", color: "from-violet-400 to-fuchsia-500" },
  audit:               { icon: "📜", color: "from-slate-400 to-slate-500" },
};

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "Vừa xong";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}p trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h trước`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} ngày trước`;
  return d.toLocaleDateString("vi-VN");
}

function fmtVND(n: number): string {
  return n.toLocaleString("vi-VN");
}

/** KPI mini card — hiện number + delta vs yesterday. */
function KPICard({ label, icon, value, delta, isCurrency = false, color }: {
  label: string; icon: string; value: number; delta: number; isCurrency?: boolean;
  color: string;
}) {
  const isUp = delta >= 0;
  const display = isCurrency ? fmtVND(value) + "đ" : value.toString();
  return (
    <div className={`relative overflow-hidden rounded-xl border p-4 bg-gradient-to-br ${color} backdrop-blur-sm`}>
      <div className="flex items-start justify-between mb-1">
        <span className="text-2xl">{icon}</span>
        {(value > 0 || delta !== 0) && (
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            isUp
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
          }`}>
            <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="currentColor" aria-hidden>
              {isUp ? <path d="M6 2 L10 7 L8 7 L8 10 L4 10 L4 7 L2 7 Z" />
                    : <path d="M6 10 L2 5 L4 5 L4 2 L8 2 L8 5 L10 5 Z" />}
            </svg>
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tabular-nums truncate">
        {display}
      </p>
      <p className="text-[10px] text-gray-500 dark:text-zinc-500 mt-1">
        Hôm qua: <b className="text-gray-700 dark:text-zinc-300">{isCurrency ? fmtVND(value - delta) : delta > 0 ? value - delta : value}</b>
      </p>
    </div>
  );
}

/**
 * Admin Live Widgets — fetch /api/admin/dashboard mỗi 30s + render:
 *   - KPI delta cards (today vs yesterday)
 *   - Online users pulse
 *   - Recent activity feed
 */
export function AdminLiveWidgets() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetch1 = async () => {
      try {
        const r = await fetch("/api/admin/dashboard", { cache: "no-store" });
        const d = await r.json();
        if (cancelled) return;
        if (d?.success) {
          setData({ delta: d.delta, online: d.online, activity: d.activity });
        }
      } catch { /* silent */ }
      finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetch1();
    const id = window.setInterval(fetch1, 30_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 dark:border-zinc-700 p-4 animate-pulse">
            <div className="h-6 w-6 bg-gray-200 dark:bg-zinc-800 rounded mb-3" />
            <div className="h-3 w-2/3 bg-gray-200 dark:bg-zinc-800 rounded mb-2" />
            <div className="h-6 w-1/2 bg-gray-200 dark:bg-zinc-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Live status bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
            {data.online} user online
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-zinc-400">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Cập nhật mỗi 30 giây
        </div>
      </div>

      {/* KPI delta cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="User mới hôm nay"
          icon="👤"
          value={data.delta.newUsers.today}
          delta={data.delta.newUsers.deltaPct}
          color="from-blue-50 to-blue-100/50 dark:from-blue-500/[0.08] dark:to-blue-500/[0.04] border-blue-100 dark:border-blue-500/20"
        />
        <KPICard
          label="Đơn mới hôm nay"
          icon="📦"
          value={data.delta.newOrders.today}
          delta={data.delta.newOrders.deltaPct}
          color="from-orange-50 to-orange-100/50 dark:from-orange-500/[0.08] dark:to-orange-500/[0.04] border-orange-100 dark:border-orange-500/20"
        />
        <KPICard
          label="Cashback hôm nay"
          icon="💰"
          value={data.delta.cashback.today}
          delta={data.delta.cashback.deltaPct}
          isCurrency
          color="from-emerald-50 to-emerald-100/50 dark:from-emerald-500/[0.08] dark:to-emerald-500/[0.04] border-emerald-100 dark:border-emerald-500/20"
        />
        <KPICard
          label="Yêu cầu rút"
          icon="💸"
          value={data.delta.withdrawals.today}
          delta={data.delta.withdrawals.deltaPct}
          color="from-amber-50 to-amber-100/50 dark:from-amber-500/[0.08] dark:to-amber-500/[0.04] border-amber-100 dark:border-amber-500/20"
        />
      </div>

      {/* Activity feed */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800 dark:text-zinc-100">
            🔔 Hoạt động realtime
          </h3>
          <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider font-bold">
            {data.activity.length} item
          </span>
        </div>
        {data.activity.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chưa có hoạt động nào
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-zinc-800 max-h-[400px] overflow-y-auto">
            {data.activity.map((item) => {
              const meta = TYPE_META[item.type] ?? TYPE_META.audit;
              return (
                <li key={item.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <div className={`shrink-0 w-9 h-9 rounded-full bg-gradient-to-br ${meta.color} flex items-center justify-center text-base shadow-sm`}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-zinc-200 leading-snug">
                      <b className="font-semibold">{item.username}</b>{" "}
                      <span className="text-gray-600 dark:text-zinc-400">{item.description}</span>
                      {item.amount !== undefined && (
                        <span className="ml-1 font-bold text-emerald-600 dark:text-emerald-400">
                          {fmtVND(item.amount)}đ
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
                      {formatRelative(item.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

interface FABProps {
  pendingWithdrawals: number;
  onClick: () => void;
}

/**
 * Floating Action Button — fixed bottom-right, hiện badge count rút chờ duyệt.
 * Click → jump tới withdrawals tab pending filter.
 */
export function AdminFAB({ pendingWithdrawals, onClick }: FABProps) {
  if (pendingWithdrawals === 0) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${pendingWithdrawals} yêu cầu rút tiền chờ duyệt`}
      className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold shadow-2xl shadow-orange-500/40 transition-all hover:scale-105 active:scale-95"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0))" }}
    >
      <span className="relative">
        <span className="text-xl">💸</span>
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-black flex items-center justify-center border-2 border-white animate-pulse">
          {pendingWithdrawals > 99 ? "99+" : pendingWithdrawals}
        </span>
      </span>
      <span className="hidden sm:inline text-sm">Duyệt rút tiền</span>
    </button>
  );
}
