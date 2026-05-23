"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CaffiliateLogo } from "@/components/icons";

interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  target: string | null;
  ip: string | null;
  user_agent: string | null;
  detail: string | null;
  created_at: string;
}

function formatDate(s: string): string {
  return new Date(s).toLocaleString("vi-VN");
}

// Map action → màu theo nhóm.
function actionColor(action: string): string {
  if (action.startsWith("admin.")) return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30";
  if (action.includes("login.failed")) return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30";
  if (action.includes("login")) return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
  if (action.includes("password") || action.includes("session")) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
  if (action.includes("delete")) return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30";
  return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30";
}

function shortUA(ua: string | null): string {
  if (!ua) return "—";
  const browser = ua.match(/(Chrome|Firefox|Safari|Edg|Opera)\/[\d.]+/)?.[0] ?? "?";
  return browser;
}

export default function AdminAuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/audit?limit=500");
        if (cancelled) return;
        if (res.status === 401 || res.status === 403) {
          setAuthError(true);
          return;
        }
        const data = await res.json();
        if (data.success) setLogs(data.logs);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

  const filtered = filter
    ? logs.filter((l) =>
        [l.action, l.target, l.ip, l.user_agent, l.detail, String(l.user_id)]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(filter.toLowerCase())),
      )
    : logs;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
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
            <h1 className="text-base font-bold">Audit Log</h1>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {filtered.length}/{logs.length} entries
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-4 flex items-center gap-3">
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Tìm theo action / IP / user_id / detail..."
            className="flex-1 max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-orange-500"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Thời gian</th>
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Action</th>
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">User ID</th>
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Target</th>
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">IP</th>
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">UA</th>
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">Đang tải...</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">Không có entry nào.</td></tr>
                )}
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 align-top">
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{formatDate(l.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-mono border ${actionColor(l.action)}`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-mono text-xs">{l.user_id ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">{l.target ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-mono text-xs">{l.ip ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{shortUA(l.user_agent)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-sm truncate" title={l.detail ?? ""}>{l.detail ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
