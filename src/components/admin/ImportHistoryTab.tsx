"use client";

import { useEffect, useState } from "react";

interface Entry {
  id: number;
  admin_user_id: number;
  admin_username?: string;
  file_name: string | null;
  total: number;
  matched: number;
  updated: number;
  duplicated: number;
  unmatched: number;
  created_at: string;
}

function formatDate(s: string) {
  if (!s) return "—";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function ImportHistoryTab() {
  const [rows, setRows] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/import-history?limit=100")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setRows(d.history);
        setLoading(false);
      });
  }, []);

  return (
    <>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Lịch Sử Import</h2>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Thời gian</th>
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Admin</th>
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">File</th>
                <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Tổng</th>
                <th className="text-right px-4 py-3 text-green-600 dark:text-green-400 font-medium">Match</th>
                <th className="text-right px-4 py-3 text-cyan-600 dark:text-cyan-400 font-medium">Update</th>
                <th className="text-right px-4 py-3 text-amber-600 dark:text-amber-400 font-medium">Trùng</th>
                <th className="text-right px-4 py-3 text-red-600 dark:text-red-400 font-medium">Không match</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Đang tải…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Chưa có lịch sử</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.admin_username || `#${r.admin_user_id}`}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs font-mono break-all max-w-xs truncate" title={r.file_name || ""}>{r.file_name || "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200 font-medium">{r.total}</td>
                  <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{r.matched}</td>
                  <td className="px-4 py-3 text-right text-cyan-600 dark:text-cyan-400">{r.updated}</td>
                  <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400">{r.duplicated}</td>
                  <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">{r.unmatched}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
