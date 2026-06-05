"use client";

import { useCallback, useEffect, useState } from "react";

interface Check { label: string; ok: boolean; detail: string }
interface FinanceData {
  totalCredit: number;
  totalDebit: number;
  netWalletBalance: number;
  creditCashback: number;
  creditSpin: number;
  creditStreak: number;
  creditRefund: number;
  creditAdmin: number;
  debitWithdraw: number;
  debitReversal: number;
  debitAdmin: number;
  withdrawApprovedTotal: number;
  withdrawPendingTotal: number;
  withdrawRejectedTotal: number;
  checks: Check[];
}

function fmtVND(n: number) { return (n || 0).toLocaleString("vi-VN") + "đ"; }

export function FinanceTab() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/admin/finance", { cache: "no-store" });
      const d = await r.json();
      if (d.success) setData(d.data);
      else setError(d.error || "Không tải được số liệu đối soát");
    } catch {
      setError("Lỗi kết nối khi đối soát tài chính");
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
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">⚖️ Đối Soát Tài Chính</h2>
        <button
          onClick={load}
          className="text-sm font-medium px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          🔄 Đối soát lại
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Đang đối soát…</p>
      ) : data ? (
        <>
          {/* Cờ cảnh báo — quan trọng nhất, hiện trên cùng */}
          <div className="space-y-2 mb-6">
            {data.checks.map((c, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-xl border p-3.5 ${
                  c.ok
                    ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30"
                    : "bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/40"
                }`}
              >
                <span className="text-lg shrink-0">{c.ok ? "✅" : "🚨"}</span>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${c.ok ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
                    {c.label}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{c.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 3 con số tổng quan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <BigCard label="Tổng tiền VÀO ví" value={fmtVND(data.totalCredit)} icon="⬇️" cls="bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" />
            <BigCard label="Tổng tiền RA ví" value={fmtVND(data.totalDebit)} icon="⬆️" cls="bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400" />
            <BigCard label="Số dư đang nợ user" value={fmtVND(data.netWalletBalance)} icon="💼" cls="bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tiền vào — breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-3">⬇️ Tiền vào ví (theo nguồn)</h3>
              <div className="space-y-2">
                <Row label="Hoàn tiền đơn hàng (cashback)" value={data.creditCashback} total={data.totalCredit} color="emerald" />
                <Row label="Vòng quay may mắn" value={data.creditSpin} total={data.totalCredit} color="amber" />
                <Row label="Thưởng streak đăng nhập" value={data.creditStreak} total={data.totalCredit} color="blue" />
                <Row label="Hoàn tiền rút bị từ chối" value={data.creditRefund} total={data.totalCredit} color="amber" />
                <Row label="Admin cộng tay / khác" value={data.creditAdmin} total={data.totalCredit} color="gray" />
                <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between text-sm font-bold">
                  <span className="text-gray-700 dark:text-gray-200">Tổng vào</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{fmtVND(data.totalCredit)}</span>
                </div>
              </div>
            </div>

            {/* Tiền ra — breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-3">⬆️ Tiền ra ví (theo nguồn)</h3>
              <div className="space-y-2">
                <Row label="Rút tiền" value={data.debitWithdraw} total={data.totalDebit} color="rose" />
                <Row label="Thu hồi / hủy đơn" value={data.debitReversal} total={data.totalDebit} color="amber" />
                <Row label="Admin trừ tay / khác" value={data.debitAdmin} total={data.totalDebit} color="gray" />
                <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between text-sm font-bold">
                  <span className="text-gray-700 dark:text-gray-200">Tổng ra</span>
                  <span className="text-rose-600 dark:text-rose-400">{fmtVND(data.totalDebit)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Đối soát rút tiền */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mt-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">💸 Đối soát bảng rút tiền</h3>
            <div className="grid grid-cols-3 gap-3">
              <MiniCard label="Đã duyệt" value={fmtVND(data.withdrawApprovedTotal)} cls="text-emerald-600 dark:text-emerald-400" />
              <MiniCard label="Đang chờ" value={fmtVND(data.withdrawPendingTotal)} cls="text-amber-600 dark:text-amber-400" />
              <MiniCard label="Đã từ chối" value={fmtVND(data.withdrawRejectedTotal)} cls="text-gray-500 dark:text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              💡 &quot;Đã duyệt&quot; = tiền thật đã chuyển cho user. &quot;Đang chờ&quot; = đã trừ ví, chờ admin chuyển khoản. &quot;Đã từ chối&quot; = đã hoàn lại ví user.
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Số liệu tính trực tiếp từ database. Đối soát giúp phát hiện lệch tiền do bug hoặc gian lận.
          </p>
        </>
      ) : null}
    </>
  );
}

function BigCard({ label, value, icon, cls }: { label: string; value: string; icon: string; cls: string }) {
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-xl font-bold truncate">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function MiniCard({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700 text-center">
      <p className={`text-base font-bold truncate ${cls}`}>{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

const COLOR_MAP: Record<string, string> = {
  emerald: "from-emerald-400 to-emerald-500",
  amber: "from-amber-400 to-orange-500",
  blue: "from-blue-400 to-blue-500",
  amber: "from-amber-400 to-amber-500",
  rose: "from-rose-400 to-rose-500",
  gray: "from-gray-300 to-gray-400",
};

function Row({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-0.5">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-gray-500 dark:text-gray-400 font-medium">{fmtVND(value)} ({pct.toFixed(1)}%)</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${COLOR_MAP[color] ?? COLOR_MAP.gray}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}
