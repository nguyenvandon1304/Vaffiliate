"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CaffiliateLogo } from "@/components/icons";

interface AuditLog {
  id: number;
  user_id: number | null;
  username: string | null;
  display_name: string | null;
  action: string;
  target: string | null;
  ip: string | null;
  user_agent: string | null;
  detail: string | null;
  created_at: string;
}

function formatDate(s: string): string {
  return new Date(s).toLocaleString("vi-VN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

// Map action → màu theo nhóm.
function actionColor(action: string): string {
  if (action.startsWith("admin.")) return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30";
  if (action.includes("login.failed") || action.includes("denied") || action.includes("delete")) return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30";
  if (action.includes("login")) return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
  if (action.includes("password") || action.includes("session") || action.includes("totp")) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
  if (action.includes("withdraw") || action.includes("balance")) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
  if (action.includes("import") || action.includes("order")) return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30";
  return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30";
}

function shortUA(ua: string | null): string {
  if (!ua) return "—";
  const browser = ua.match(/(Chrome|Firefox|Safari|Edg|Opera)\/[\d.]+/)?.[0] ?? "?";
  return browser;
}

const PAGE_SIZE = 100;

export default function AdminAuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [usernameFilter, setUsernameFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const [actionsList, setActionsList] = useState<string[]>([]);

  // Replay session modal
  const [replayUser, setReplayUser] = useState<{ userId: number | null; username: string; date: string } | null>(null);
  const [replayLogs, setReplayLogs] = useState<AuditLog[]>([]);
  const [replayLoading, setReplayLoading] = useState(false);

  const buildQuery = useCallback((extra: Record<string, string | number | undefined> = {}) => {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (actionFilter) q.set("action", actionFilter);
    if (usernameFilter) q.set("username", usernameFilter);
    if (fromDate) q.set("fromDate", fromDate);
    if (toDate) q.set("toDate", toDate);
    q.set("limit", String(PAGE_SIZE));
    q.set("offset", String(page * PAGE_SIZE));
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined) q.set(k, String(v));
    }
    return q.toString();
  }, [search, actionFilter, usernameFilter, fromDate, toDate, page]);

  // Load distinct actions for dropdown — once
  useEffect(() => {
    fetch("/api/admin/audit?actions=list")
      .then((r) => r.json())
      .then((d) => { if (d.success) setActionsList(d.actions); })
      .catch(() => { /* ignore */ });
  }, []);

  // Fetch logs whenever filter/page changes
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch sync with filter changes
    setLoading(true);
    fetch(`/api/admin/audit?${buildQuery()}`)
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          if (!cancelled) setAuthError(true);
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (cancelled || !d) return;
        if (d.success) {
          setLogs(d.rows);
          setTotal(d.total);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [buildQuery]);

  const handleResetFilters = () => {
    setSearch(""); setActionFilter(""); setUsernameFilter("");
    setFromDate(""); setToDate(""); setPage(0);
  };

  const handleExportCsv = () => {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (actionFilter) q.set("action", actionFilter);
    if (usernameFilter) q.set("username", usernameFilter);
    if (fromDate) q.set("fromDate", fromDate);
    if (toDate) q.set("toDate", toDate);
    q.set("export", "csv");
    window.location.href = `/api/admin/audit?${q}`;
  };

  // Replay session — fetch all logs of 1 user trong 1 ngày cụ thể
  const openReplay = async (userId: number | null, username: string, dateIso: string) => {
    if (!userId) return;
    const dayStart = dateIso.slice(0, 10);
    setReplayUser({ userId, username, date: dayStart });
    setReplayLoading(true);
    try {
      const q = new URLSearchParams({
        userId: String(userId),
        fromDate: dayStart,
        toDate: dayStart,
        limit: "5000",
      });
      const res = await fetch(`/api/admin/audit?${q}`);
      const d = await res.json();
      if (d.success) {
        // Sort ascending để xem theo thứ tự thời gian
        setReplayLogs([...d.rows].reverse());
      }
    } finally {
      setReplayLoading(false);
    }
  };

  const closeReplay = () => { setReplayUser(null); setReplayLogs([]); };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const stats = useMemo(() => {
    const byAction = new Map<string, number>();
    for (const l of logs) byAction.set(l.action, (byAction.get(l.action) ?? 0) + 1);
    return Array.from(byAction.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [logs]);

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <p className="text-red-500 font-semibold">Bạn không có quyền truy cập trang này.</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="cursor-pointer text-left"
              title="Về tổng quan admin"
            >
              <CaffiliateLogo title="Admin V-Affiliate" subtitle="Bảng điều khiển" />
            </button>
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
            <h1 className="text-base font-bold flex items-center gap-2">📜 Audit Log</h1>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Hiển thị {logs.length} / {total.toLocaleString("vi-VN")} entries
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Filters card */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tìm kiếm tự do</label>
              <input
                type="search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="action / target / detail / username..."
                className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Action</label>
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
                className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500"
              >
                <option value="">— Tất cả —</option>
                {actionsList.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Username</label>
              <input
                type="text"
                value={usernameFilter}
                onChange={(e) => { setUsernameFilter(e.target.value); setPage(0); }}
                placeholder="vd: admin"
                className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Từ ngày</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
                className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mt-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Đến ngày</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(0); }}
                className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
            </div>
            <div className="lg:col-span-2 flex items-end gap-2">
              <button
                onClick={handleResetFilters}
                className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                ↺ Reset
              </button>
              <button
                onClick={handleExportCsv}
                className="flex-1 px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
              >
                ⬇ Export CSV
              </button>
            </div>
            {stats.length > 0 && (
              <div className="lg:col-span-2 flex items-end">
                <div className="w-full text-xs text-gray-500 dark:text-gray-400">
                  Top action trong trang: {stats.slice(0, 3).map(([a, c]) => `${a} (${c})`).join(", ")}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Table card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                  <th className="text-left px-3 py-2.5 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Thời gian</th>
                  <th className="text-left px-3 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Action</th>
                  <th className="text-left px-3 py-2.5 text-gray-500 dark:text-gray-400 font-medium">User</th>
                  <th className="text-left px-3 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Target</th>
                  <th className="text-left px-3 py-2.5 text-gray-500 dark:text-gray-400 font-medium">IP</th>
                  <th className="text-left px-3 py-2.5 text-gray-500 dark:text-gray-400 font-medium">UA</th>
                  <th className="text-left px-3 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Detail</th>
                  <th className="text-center px-3 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Replay</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      Đang tải...
                    </span>
                  </td></tr>
                )}
                {!loading && logs.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    <p className="font-medium">Không có entry nào khớp bộ lọc.</p>
                    <button onClick={handleResetFilters} className="mt-2 text-orange-600 hover:text-orange-700 text-xs font-semibold">
                      Reset filter
                    </button>
                  </td></tr>
                )}
                {!loading && logs.map((l) => (
                  <tr key={l.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 align-top">
                    <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap font-mono">{formatDate(l.created_at)}</td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => { setActionFilter(l.action); setPage(0); }}
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-mono border ${actionColor(l.action)} hover:scale-105 transition-transform`}
                        title="Click để filter theo action này"
                      >
                        {l.action}
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {l.username ? (
                        <button
                          onClick={() => { setUsernameFilter(l.username!); setPage(0); }}
                          className="text-orange-600 dark:text-orange-400 hover:underline font-semibold"
                          title="Click để filter theo user này"
                        >
                          {l.username}
                        </button>
                      ) : l.user_id ? (
                        <span className="text-gray-700 dark:text-gray-300 font-mono">#{l.user_id}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 text-xs">{l.target ?? "—"}</td>
                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 font-mono text-xs">{l.ip ?? "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 text-xs">{shortUA(l.user_agent)}</td>
                    <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 text-xs max-w-xs truncate" title={l.detail ?? ""}>{l.detail ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center">
                      {l.user_id && (
                        <button
                          onClick={() => openReplay(l.user_id, l.username ?? `#${l.user_id}`, l.created_at)}
                          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
                          title="Xem tất cả hoạt động của user này trong cùng ngày"
                        >
                          ▶ Replay
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Trang {page + 1} / {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-40 hover:bg-white dark:hover:bg-gray-700"
                >
                  ← Trước
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-40 hover:bg-white dark:hover:bg-gray-700"
                >
                  Sau →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Replay session modal */}
        {replayUser && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeReplay}>
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold">▶ Replay session</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {replayUser.username} — {replayUser.date} ({replayLogs.length} actions)
                  </p>
                </div>
                <button onClick={closeReplay} className="text-gray-500 hover:text-gray-900 dark:hover:text-white text-xl">×</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {replayLoading && <p className="text-center text-gray-500 py-8">Đang tải...</p>}
                {!replayLoading && replayLogs.length === 0 && (
                  <p className="text-center text-gray-500 py-8">Không có hoạt động nào trong ngày này.</p>
                )}
                {!replayLoading && replayLogs.length > 0 && (
                  <ol className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-3">
                    {replayLogs.map((l) => (
                      <li key={l.id} className="ml-5 relative">
                        <span className="absolute -left-[1.78rem] top-1 w-3 h-3 rounded-full bg-orange-500 border-2 border-white dark:border-gray-800" />
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{formatDate(l.created_at)}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-mono border ${actionColor(l.action)}`}>
                            {l.action}
                          </span>
                          {l.target && <span className="text-xs text-gray-700 dark:text-gray-300">→ {l.target}</span>}
                        </div>
                        {l.detail && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{l.detail}</p>}
                        {l.ip && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 font-mono">IP: {l.ip}</p>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
