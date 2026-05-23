"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";

interface Flag {
  id: number;
  user_id: number | null;
  username: string | null;
  type: string;
  severity: "low" | "medium" | "high";
  detail: string | null;
  resolved: number;
  resolved_at: string | null;
  resolved_by_username: string | null;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  same_ip_register: "🌐 Đăng ký cùng IP",
  self_referral: "🔁 Tự refer",
  rapid_withdraw: "⚡ Rút tiền nhanh",
  suspicious_login: "🔐 Login đáng ngờ",
};

const SEVERITY_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
  medium: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
  low: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
};

function formatDate(s: string) {
  const d = new Date(s);
  return d.toLocaleString("vi-VN");
}

export function FraudTab() {
  const toast = useToast();
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterResolved, setFilterResolved] = useState<"0" | "1">("0");
  const [filterSeverity, setFilterSeverity] = useState<"all" | "low" | "medium" | "high">("all");

  const reload = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ resolved: filterResolved });
    if (filterSeverity !== "all") params.set("severity", filterSeverity);
    const res = await fetch(`/api/admin/fraud?${params}`);
    const d = await res.json();
    if (d.success) setFlags(d.flags);
    setLoading(false);
  }, [filterResolved, filterSeverity]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState sau await
    void reload();
  }, [reload]);

  const handleResolve = async (id: number) => {
    if (!confirm("Đánh dấu flag này đã review xong?")) return;
    const r = await fetch("/api/admin/fraud", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const d = await r.json();
    if (d.success) {
      toast.success("Đã resolve");
      void reload();
    } else {
      toast.error(d.error || "Lỗi");
    }
  };

  const counts = {
    high: flags.filter((f) => f.severity === "high").length,
    medium: flags.filter((f) => f.severity === "medium").length,
    low: flags.filter((f) => f.severity === "low").length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">🚨 Phát hiện gian lận</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Hành vi đáng ngờ tự động được flag — review để khoá user nếu cần.
          </p>
        </div>
        <button
          onClick={reload}
          className="text-sm font-medium px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Severity counter cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 p-3">
          <div className="text-xs text-red-600 dark:text-red-400 font-medium">Cao (high)</div>
          <div className="text-2xl font-bold text-red-700 dark:text-red-300">{counts.high}</div>
        </div>
        <div className="rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-3">
          <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">Trung bình</div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{counts.medium}</div>
        </div>
        <div className="rounded-xl border border-blue-300 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/10 p-3">
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Thấp (low)</div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{counts.low}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 mb-4 flex flex-wrap gap-2 items-center">
        <select
          value={filterResolved}
          onChange={(e) => setFilterResolved(e.target.value as "0" | "1")}
          className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white outline-none"
        >
          <option value="0">⏳ Chưa review</option>
          <option value="1">✅ Đã review</option>
        </select>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value as typeof filterSeverity)}
          className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white outline-none"
        >
          <option value="all">Tất cả mức độ</option>
          <option value="high">🔴 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🔵 Low</option>
        </select>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400">Đang tải...</div>
        ) : flags.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-2">✨</div>
            <p className="text-sm text-gray-400">
              {filterResolved === "0" ? "Không có flag nào cần review" : "Không có flag nào đã resolve"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {flags.map((f) => (
              <li key={f.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start gap-3">
                  <span
                    className={`flex-shrink-0 text-xs font-bold uppercase px-2 py-0.5 rounded-full border ${SEVERITY_STYLES[f.severity]}`}
                  >
                    {f.severity}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {TYPE_LABELS[f.type] || f.type}
                      </span>
                      {f.username && (
                        <span className="text-xs text-gray-500">
                          → <code className="font-mono">{f.username}</code>
                        </span>
                      )}
                    </div>
                    {f.detail && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">{f.detail}</p>
                    )}
                    <p className="text-[11px] text-gray-400">
                      {formatDate(f.created_at)}
                      {f.resolved === 1 && f.resolved_by_username && (
                        <> · Resolved bởi <span className="font-medium">{f.resolved_by_username}</span></>
                      )}
                    </p>
                  </div>
                  {f.resolved === 0 && (
                    <button
                      onClick={() => handleResolve(f.id)}
                      className="flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
