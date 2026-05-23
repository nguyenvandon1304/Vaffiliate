"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Modal } from "@/components/Modal";
import { Pagination } from "@/components/Pagination";
import { useToast } from "@/components/Toast";

interface WithdrawalRow {
  id: number;
  user_id: number;
  username: string;
  display_name: string | null;
  bank_name: string;
  account_number: string;
  account_holder: string;
  amount: number;
  status: string;
  admin_note?: string | null;
  created_at: string;
}

function formatVND(n: number) { return (n || 0).toLocaleString("vi-VN") + "đ"; }
function formatDate(s: string) {
  if (!s) return "—";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const PAGE_SIZE = 20;

export function WithdrawalsTab() {
  const toast = useToast();
  const params = useSearchParams();
  const initialStatus = params.get("status");
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "approved" | "rejected">(
    initialStatus === "pending" || initialStatus === "approved" || initialStatus === "rejected"
      ? initialStatus
      : "all",
  );
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [rejecting, setRejecting] = useState<WithdrawalRow | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search.trim()) params.set("search", search.trim());
    if (status !== "all") params.set("status", status);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    const r = await fetch(`/api/admin/withdrawals?${params}`);
    const d = await r.json();
    if (d.success) { setRows(d.withdrawals); setTotal(d.total); }
    setLoading(false);
  }, [page, search, status, fromDate, toDate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch theo filter
    reload();
  }, [reload]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search, status, fromDate, toDate]);

  const handleApprove = async (id: number) => {
    if (!confirm("Duyệt yêu cầu rút này?")) return;
    const r = await fetch("/api/admin/withdrawals", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "approved" }),
    });
    const d = await r.json();
    if (d.success) { toast.success("Đã duyệt"); reload(); }
    else toast.error(d.error || "Lỗi");
  };

  const exportCsv = () => {
    const lines = ["username,bank,stk,holder,amount,status,note,created_at"];
    for (const w of rows) {
      lines.push([w.username, w.bank_name, w.account_number, w.account_holder, w.amount, w.status, w.admin_note || "", w.created_at]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    }
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `withdrawals-page${page}-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${rows.length} yêu cầu`);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Yêu Cầu Rút Tiền ({total.toLocaleString("vi-VN")})
        </h2>
        <button onClick={exportCsv} className="text-sm font-medium px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
          ⬇ Export CSV
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 mb-4 flex flex-col sm:flex-row gap-2 flex-wrap items-stretch sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔎 Username / STK..."
          className="flex-1 min-w-[200px] bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500"
        >
          <option value="all">Tất cả</option>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="rejected">Từ chối</option>
        </select>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white" />
        <span className="text-gray-400">→</span>
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">User</th>
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Ngân hàng</th>
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">STK</th>
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Chủ TK</th>
                <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Số tiền</th>
                <th className="text-center px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Trạng thái</th>
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Ghi chú</th>
                <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Ngày</th>
                <th className="text-center px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Đang tải…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Không có yêu cầu</td></tr>}
              {rows.map((w) => (
                <tr key={w.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{w.display_name || w.username}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{w.bank_name || "—"}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-mono text-xs">{w.account_number || "—"}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">{w.account_holder || "—"}</td>
                  <td className="px-4 py-3 text-right text-orange-600 dark:text-orange-400 font-bold">{formatVND(w.amount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      w.status === "approved" ? "bg-green-500/20 text-green-600 dark:text-green-400" :
                      w.status === "rejected" ? "bg-red-500/20 text-red-600 dark:text-red-400" :
                      "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                    }`}>{w.status === "pending" ? "Chờ duyệt" : w.status === "approved" ? "Đã duyệt" : "Từ chối"}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={w.admin_note || ""}>{w.admin_note || "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 text-xs">{formatDate(w.created_at)}</td>
                  <td className="px-4 py-3 text-center">
                    {w.status === "pending" && (
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleApprove(w.id)} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20">Duyệt</button>
                        <button onClick={() => setRejecting(w)} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20">Từ chối</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      {rejecting && (
        <RejectModal w={rejecting} onClose={() => setRejecting(null)} onDone={() => { setRejecting(null); reload(); }} />
      )}
    </>
  );
}

function RejectModal({ w, onClose, onDone }: { w: WithdrawalRow; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    const r = await fetch("/api/admin/withdrawals", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: w.id, status: "rejected", note }),
    });
    const d = await r.json();
    if (d.success) { toast.success("Đã từ chối, ví user đã được hoàn lại"); onDone(); }
    else toast.error(d.error || "Lỗi");
    setSubmitting(false);
  };

  return (
    <Modal open onClose={onClose} title="Từ chối yêu cầu rút" size="md">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        User <b>{w.display_name || w.username}</b> yêu cầu rút <b className="text-orange-600 dark:text-orange-400">{formatVND(w.amount)}</b>.
        Tiền sẽ được hoàn ngay vào ví khi từ chối.
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="Lý do từ chối (sẽ gửi cho user, tối đa 500 ký tự)"
        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500"
      />
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="text-sm font-medium px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">Huỷ</button>
        <button disabled={submitting} onClick={submit} className="text-sm font-medium px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-60">
          {submitting ? "Đang xử lý..." : "Từ chối & hoàn tiền"}
        </button>
      </div>
    </Modal>
  );
}
