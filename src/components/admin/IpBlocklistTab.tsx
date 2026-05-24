"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";

interface BlockedIp {
  id: number;
  ip: string;
  reason: string | null;
  blocked_until: string | null;
  fail_count: number;
  created_at: string;
  is_active: boolean;
}

function formatDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleString("vi-VN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export function IpBlocklistTab() {
  const toast = useToast();
  const [rows, setRows] = useState<BlockedIp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newIp, setNewIp] = useState("");
  const [newReason, setNewReason] = useState("");
  const [newHours, setNewHours] = useState("24");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ip-blocklist", { cache: "no-store" });
      const d = await res.json();
      if (d.success) setRows(d.rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch on mount
    void load();
  }, []);

  const handleBlock = async () => {
    const ip = newIp.trim();
    if (!ip) { toast.error("Nhập IP"); return; }
    const res = await fetch("/api/admin/ip-blocklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip, reason: newReason || undefined, hours: Number(newHours) || 24 }),
    });
    const d = await res.json();
    if (d.success) {
      toast.success(d.message);
      setNewIp(""); setNewReason(""); setNewHours("24");
      setShowAdd(false);
      await load();
    } else {
      toast.error(d.error || "Lỗi");
    }
  };

  const handleUnblock = async (ip: string) => {
    if (!confirm(`Unblock IP ${ip}?`)) return;
    const res = await fetch(`/api/admin/ip-blocklist?ip=${encodeURIComponent(ip)}`, { method: "DELETE" });
    const d = await res.json();
    if (d.success) {
      toast.success(d.message);
      await load();
    } else {
      toast.error(d.error || "Lỗi");
    }
  };

  const activeRows = rows.filter((r) => r.is_active);
  const expiredRows = rows.filter((r) => !r.is_active);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">🚫 IP Blocklist</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {showAdd ? "× Hủy" : "+ Block IP mới"}
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Block IP thủ công</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">IP address</label>
              <input
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                placeholder="vd: 1.2.3.4"
                className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Số giờ block</label>
              <input
                type="number"
                min="1"
                max="720"
                value={newHours}
                onChange={(e) => setNewHours(e.target.value)}
                className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Lý do (optional)</label>
              <input
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="Manual block by admin"
                className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
            </div>
          </div>
          <button
            onClick={handleBlock}
            className="mt-3 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            🚫 Block ngay
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-10">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center">
          <span className="text-4xl">🛡️</span>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
            Chưa có IP nào bị block. Hệ thống sẽ tự động block khi phát hiện IP rotation.
          </p>
        </div>
      )}

      {!loading && activeRows.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
            🔒 Đang block ({activeRows.length})
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium">IP</th>
                    <th className="text-left px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Lý do</th>
                    <th className="text-center px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Fail count</th>
                    <th className="text-left px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Hết hạn</th>
                    <th className="text-center px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRows.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-red-50/50 dark:hover:bg-red-500/5">
                      <td className="px-4 py-2.5 font-mono text-gray-900 dark:text-white">{r.ip}</td>
                      <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 text-xs max-w-md truncate" title={r.reason ?? ""}>
                        {r.reason ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-center text-red-600 dark:text-red-400 font-bold">{r.fail_count}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{formatDate(r.blocked_until)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => handleUnblock(r.ip)}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline"
                        >
                          Unblock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {!loading && expiredRows.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3">
            🔓 Đã hết hạn ({expiredRows.length})
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden opacity-70">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium">IP</th>
                    <th className="text-left px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Lý do</th>
                    <th className="text-center px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Fail count</th>
                    <th className="text-left px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Đã unblock từ</th>
                  </tr>
                </thead>
                <tbody>
                  {expiredRows.slice(0, 50).map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="px-4 py-2.5 font-mono text-gray-700 dark:text-gray-300">{r.ip}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs max-w-md truncate" title={r.reason ?? ""}>
                        {r.reason ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-500 dark:text-gray-400">{r.fail_count}</td>
                      <td className="px-4 py-2.5 text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">{formatDate(r.blocked_until)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
