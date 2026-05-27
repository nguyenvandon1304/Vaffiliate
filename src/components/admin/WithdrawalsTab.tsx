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
  bank_code: string;
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
  const [qrModal, setQrModal] = useState<WithdrawalRow | null>(null);

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
                    {(() => {
                      // Status có thể là English (legacy) hoặc tiếng Việt (default schema mới).
                      const isApproved = w.status === "approved" || w.status === "Đã chuyển" || w.status === "Đã duyệt";
                      const isRejected = w.status === "rejected" || w.status === "Đã hủy" || w.status === "Đã huỷ";
                      const cls = isApproved ? "bg-green-500/20 text-green-600 dark:text-green-400"
                        : isRejected ? "bg-red-500/20 text-red-600 dark:text-red-400"
                        : "bg-amber-500/20 text-amber-600 dark:text-amber-400";
                      const label = isApproved ? "Đã duyệt" : isRejected ? "Từ chối" : "Chờ duyệt";
                      return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
                    })()}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={w.admin_note || ""}>{w.admin_note || "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 text-xs">{formatDate(w.created_at)}</td>
                  <td className="px-4 py-3 text-center">
                    {(w.status === "pending" || w.status === "Đang xử lý") && (
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setQrModal(w)} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20" title="QR chuyển khoản nhanh">
                          📱 QR
                        </button>
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

      {qrModal && (
        <QRTransferModal
          w={qrModal}
          onClose={() => setQrModal(null)}
          onApproved={() => { setQrModal(null); reload(); }}
        />
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

/**
 * Modal hiển thị QR VietQR.io để admin scan bằng app ngân hàng → app tự điền
 * STK + tên + số tiền + nội dung. Sau khi chuyển xong, admin bấm "Đã chuyển - Duyệt"
 * → backend update status approved + tạo notification cho user.
 *
 * VietQR.io endpoint (free, không cần auth):
 *   https://img.vietqr.io/image/<bank_bin>-<account>-compact2.png?amount=X&addInfo=Y&accountName=Z
 */
function QRTransferModal({ w, onClose, onApproved }: { w: WithdrawalRow; onClose: () => void; onApproved: () => void }) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Map bank_code → BIN số 6 chữ số. Inline để không phải import (tránh tăng bundle).
  // Verified với data chính thức từ https://api.vietqr.io/v2/banks (2026-05).
  const BANK_BIN: Record<string, string> = {
    VCB: "970436", TCB: "970407", VPB: "970432", MBB: "970422", ACB: "970416",
    BID: "970418", CTG: "970415", AGR: "970405", SHB: "970443", STB: "970403",
    HDB: "970437", TPB: "970423", MSB: "970426", LPB: "970449", OCB: "970448",
    EIB: "970431", SSB: "970440", NAB: "970428", BAB: "970409", VAB: "970427",
    SCB: "970429", ABB: "970425", KLB: "970452", PGB: "970430", VIB: "970441",
    NVB: "970419", SGB: "970400", PVC: "970412", BVB: "970438", VRB: "970421",
    GPB: "970408", CBB: "970444", OJB: "970414", CAKE: "546034", UBANK: "546035",
    TNEX: "970426", // TNEX là digital arm của MSB → dùng BIN MSB
    CIMB: "422589", SCVN: "970410", HSBC: "458761", SHBVN: "970424",
    WOO: "970457", UOB: "970458", KBVN: "970462", IBKVN: "970455", PNLVN: "970439",
    HLBVN: "970442",
  };

  const bin = BANK_BIN[w.bank_code] || "";
  const transferContent = `VAFF rut ${w.id} uid${w.user_id}`;
  const qrUrl = bin
    ? `https://img.vietqr.io/image/${bin}-${w.account_number}-compact2.png?amount=${w.amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(w.account_holder)}`
    : "";

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleApprove = async () => {
    if (!confirm(`Xác nhận đã chuyển ${formatVND(w.amount)} cho ${w.username}?\n\nHệ thống sẽ:\n• Duyệt yêu cầu rút\n• Gửi notification cho user\n• Cập nhật "Tổng đã rút"`)) return;
    setSubmitting(true);
    const r = await fetch("/api/admin/withdrawals", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: w.id, status: "approved" }),
    });
    const d = await r.json();
    setSubmitting(false);
    if (d.success) {
      toast.success("✓ Đã duyệt - user sẽ nhận thông báo");
      onApproved();
    } else {
      toast.error(d.error || "Lỗi");
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="📱 Quét mã chuyển khoản nhanh">
      <div className="space-y-4">
        {/* User info */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Đang xử lý cho</p>
          <p className="font-bold text-gray-900 dark:text-white">@{w.username} {w.display_name && <span className="font-normal text-gray-500">· {w.display_name}</span>}</p>
        </div>

        {/* QR + thông tin */}
        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-start">
          {qrUrl ? (
            <div className="bg-white border border-gray-200 dark:border-gray-600 rounded-xl p-2 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- VietQR external CDN, dùng next/image phức tạp hơn */}
              <img
                src={qrUrl}
                alt="QR chuyển khoản"
                className="w-full max-w-[180px] aspect-square object-contain"
              />
            </div>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300">
              ⚠️ Bank code &quot;{w.bank_code}&quot; chưa có trong map BIN. Vui lòng chuyển khoản thủ công bằng thông tin bên cạnh.
            </div>
          )}

          <div className="space-y-2 text-sm">
            <InfoRow label="Ngân hàng" value={w.bank_name} />
            <InfoRow label="Số TK" value={w.account_number} onCopy={() => copy(w.account_number, "stk")} copied={copied === "stk"} mono />
            <InfoRow label="Chủ TK" value={w.account_holder} />
            <InfoRow label="Số tiền" value={formatVND(w.amount)} onCopy={() => copy(String(w.amount), "amount")} copied={copied === "amount"} highlight />
            <InfoRow label="Nội dung" value={transferContent} onCopy={() => copy(transferContent, "content")} copied={copied === "content"} mono />
          </div>
        </div>

        {/* Hướng dẫn */}
        <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
          <p className="font-semibold mb-1">📝 Cách dùng:</p>
          <ol className="list-decimal pl-4 space-y-0.5">
            <li>Mở app ngân hàng trên điện thoại (Vietcombank / MB / TPBank...)</li>
            <li>Bấm <span className="font-semibold">&quot;Quét QR&quot;</span> → quét mã trên màn hình</li>
            <li>App sẽ tự điền sẵn STK + tên + số tiền + nội dung</li>
            <li>Xác nhận chuyển khoản trong app</li>
            <li>Quay lại đây bấm <span className="font-semibold text-green-600 dark:text-green-400">&quot;Đã chuyển - Duyệt&quot;</span></li>
          </ol>
        </div>

        {/* CTA */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="text-sm font-medium px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
            Đóng
          </button>
          <button
            disabled={submitting}
            onClick={handleApprove}
            className="text-sm font-bold px-5 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 disabled:opacity-60 shadow-sm"
          >
            {submitting ? "Đang xử lý..." : "✓ Đã chuyển - Duyệt"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function InfoRow({ label, value, onCopy, copied, mono, highlight }: { label: string; value: string; onCopy?: () => void; copied?: boolean; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
        <span className={`text-sm truncate ${mono ? "font-mono" : ""} ${highlight ? "font-extrabold text-orange-600 dark:text-orange-400" : "font-semibold text-gray-900 dark:text-white"}`}>
          {value}
        </span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className={`shrink-0 w-6 h-6 rounded flex items-center justify-center transition-colors ${
              copied ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400" : "bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
            title={copied ? "Đã copy" : "Sao chép"}
          >
            {copied ? (
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
