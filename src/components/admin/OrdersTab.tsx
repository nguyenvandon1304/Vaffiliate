"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Modal } from "@/components/Modal";
import { Pagination } from "@/components/Pagination";
import { useToast } from "@/components/Toast";
import { ExportButton } from "@/components/admin/ExportButton";

interface OrderRow {
  id: number;
  user_id: number;
  username: string;
  display_name: string | null;
  order_code: string;
  store: string;
  amount: number;
  cashback: number;
  status: string;
  created_at: string;
}

const ORDER_STATUS = ["Đã hoàn tiền", "Đang xử lý", "Chờ xác nhận", "Đã hủy"] as const;
type OrderStatus = typeof ORDER_STATUS[number];

function formatVND(n: number) { return (n || 0).toLocaleString("vi-VN") + "đ"; }
function formatDate(s: string) {
  if (!s) return "—";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function statusClass(s: string) {
  if (s === "Đã hoàn tiền") return "bg-green-500/20 text-green-600 dark:text-green-400";
  if (s === "Đang xử lý") return "bg-amber-500/20 text-amber-600 dark:text-amber-400";
  if (s === "Đã hủy") return "bg-red-500/20 text-red-600 dark:text-red-400";
  return "bg-blue-500/20 text-blue-600 dark:text-blue-400";
}

const PAGE_SIZE = 20;

export function OrdersTab() {
  const toast = useToast();
  const params = useSearchParams();
  const initialStatus = params.get("status");
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | OrderStatus>(
    (ORDER_STATUS as readonly string[]).includes(initialStatus ?? "")
      ? (initialStatus as OrderStatus)
      : "all",
  );
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<OrderRow | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [orderUserId, setOrderUserId] = useState("");
  const [orderCode, setOrderCode] = useState("");
  const [orderStore, setOrderStore] = useState("Shopee");
  const [orderAmount, setOrderAmount] = useState("");
  const [orderCashback, setOrderCashback] = useState("");
  const [orderStatusVal, setOrderStatusVal] = useState<OrderStatus>("Chờ xác nhận");

  const reload = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search.trim()) params.set("search", search.trim());
    if (status !== "all") params.set("status", status);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    const r = await fetch(`/api/admin/orders?${params}`);
    const d = await r.json();
    if (d.success) { setRows(d.orders); setTotal(d.total); }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch theo filter
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload đọc state, ko phải dep
  }, [page, search, status, fromDate, toDate]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search, status, fromDate, toDate]);

  const exportCsv = () => {
    const lines = ["order_code,username,store,amount,cashback,status,created_at"];
    for (const o of rows) {
      lines.push([
        o.order_code, o.username, o.store, o.amount, o.cashback, o.status, o.created_at,
      ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    }
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `orders-page${page}-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${rows.length} đơn (trang hiện tại)`);
  };

  const handleCreate = async () => {
    if (!orderUserId || !orderCode || !orderAmount) {
      toast.error("Nhập đủ User ID, mã đơn, giá trị"); return;
    }
    const res = await fetch("/api/admin/orders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: Number(orderUserId), orderCode, store: orderStore,
        amount: Number(orderAmount), cashback: Number(orderCashback) || 0, status: orderStatusVal,
      }),
    });
    const d = await res.json();
    if (d.success) {
      toast.success("Đã tạo đơn"); setShowCreate(false);
      setOrderCode(""); setOrderAmount(""); setOrderCashback("");
      reload();
    } else toast.error(d.error || "Lỗi");
  };

  const handleDelete = async (id: number, code: string) => {
    if (!confirm(`Xoá đơn ${code}? Nếu đơn đã hoàn tiền, cashback sẽ bị thu hồi khỏi ví user.`)) return;
    const r = await fetch(`/api/admin/orders?id=${id}`, { method: "DELETE" });
    const d = await r.json();
    if (d.success) { toast.success("Đã xoá đơn"); reload(); }
    else toast.error(d.error || "Lỗi");
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Quản Lý Đơn Hàng ({total.toLocaleString("vi-VN")})
        </h2>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportCsv} className="text-sm font-medium px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600" title="Xuất CSV trang hiện tại">
            ⬇ Trang
          </button>
          <ExportButton
            endpoint="/api/admin/export/orders"
            filename="orders.csv"
            label="Xuất tất cả"
            query={fromDate || toDate ? `from=${fromDate}&to=${toDate}` : undefined}
          />
          <button onClick={() => setShowCreate(true)} className="text-sm font-medium px-3 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600">
            + Tạo đơn
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 mb-4 flex flex-col sm:flex-row gap-2 flex-wrap items-stretch sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔎 Mã đơn / username..."
          className="flex-1 min-w-[200px] bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500"
        >
          <option value="all">Tất cả trạng thái</option>
          {ORDER_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500" />
        <span className="text-gray-400">→</span>
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Mã đơn</th>
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">User</th>
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Cửa hàng</th>
                <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Giá trị</th>
                <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Cashback</th>
                <th className="text-center px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Trạng thái</th>
                <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Ngày</th>
                <th className="text-center px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Đang tải…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Không có đơn</td></tr>}
              {rows.map((o) => (
                <tr key={o.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-mono text-xs">{o.order_code}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{o.display_name || o.username}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{o.store}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{formatVND(o.amount)}</td>
                  <td className="px-4 py-3 text-right text-orange-600 dark:text-orange-400 font-medium">{formatVND(o.cashback)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(o.status)}`}>{o.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 text-xs">{formatDate(o.created_at)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setEditing(o)} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20">Sửa</button>
                      <button onClick={() => handleDelete(o.id, o.order_code)} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20">Xoá</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Tạo đơn hàng mới" size="md">
        <div className="grid grid-cols-2 gap-3">
          <input value={orderUserId} onChange={(e) => setOrderUserId(e.target.value)} placeholder="User ID" className="col-span-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm" />
          <input value={orderCode} onChange={(e) => setOrderCode(e.target.value)} placeholder="Mã đơn" className="col-span-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm" />
          <input value={orderStore} onChange={(e) => setOrderStore(e.target.value)} placeholder="Cửa hàng" className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm" />
          <select value={orderStatusVal} onChange={(e) => setOrderStatusVal(e.target.value as OrderStatus)} className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm">
            {ORDER_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input value={orderAmount} onChange={(e) => setOrderAmount(e.target.value)} placeholder="Giá trị (VNĐ)" type="number" className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm" />
          <input value={orderCashback} onChange={(e) => setOrderCashback(e.target.value)} placeholder="Cashback (VNĐ)" type="number" className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setShowCreate(false)} className="text-sm font-medium px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">Huỷ</button>
          <button onClick={handleCreate} className="text-sm font-medium px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600">Tạo</button>
        </div>
      </Modal>

      {/* Edit Modal */}
      {editing && (
        <EditOrderModal
          order={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}
    </>
  );
}

function EditOrderModal({ order, onClose, onSaved }: { order: OrderRow; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [amount, setAmount] = useState(String(order.amount));
  const [cashback, setCashback] = useState(String(order.cashback));
  const [status, setStatus] = useState<OrderStatus>(order.status as OrderStatus);
  const [store, setStore] = useState(order.store);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const r = await fetch("/api/admin/orders", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: order.id,
        amount: Number(amount), cashback: Number(cashback),
        status, store,
      }),
    });
    const d = await r.json();
    if (d.success) { toast.success("Đã lưu"); onSaved(); }
    else toast.error(d.error || "Lỗi");
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title={`Sửa đơn ${order.order_code}`} size="md">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        User: <b>{order.display_name || order.username}</b>. Khi đổi trạng thái sang/khỏi
        &quot;Đã hoàn tiền&quot;, hệ thống sẽ tự cộng/trừ ví user theo cashback tương ứng.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-gray-500">Cửa hàng</label>
        <input value={store} onChange={(e) => setStore(e.target.value)} className="col-span-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm" />
        <label className="text-xs text-gray-500">Giá trị</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm" />
        <label className="text-xs text-gray-500">Cashback</label>
        <input type="number" value={cashback} onChange={(e) => setCashback(e.target.value)} className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm" />
        <label className="text-xs text-gray-500">Trạng thái</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)} className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm">
          {ORDER_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="text-sm font-medium px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">Huỷ</button>
        <button disabled={saving} onClick={handleSave} className="text-sm font-medium px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-60">{saving ? "Đang lưu..." : "Lưu"}</button>
      </div>
    </Modal>
  );
}
