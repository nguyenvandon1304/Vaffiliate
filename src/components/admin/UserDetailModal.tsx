"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";

interface Props {
  userId: number;
  onClose: () => void;
  onChanged?: () => void;
}

interface Detail {
  user: Record<string, unknown>;
  walletBalance: number;
  totalOrders: number;
  totalCashback: number;
  recentOrders: Record<string, unknown>[];
  recentWallet: Record<string, unknown>[];
  bankAccounts: Record<string, unknown>[];
  withdrawals: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
}

function formatVND(n: number) { return (n || 0).toLocaleString("vi-VN") + "đ"; }
function formatDate(s: string) {
  if (!s) return "—";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type Tab = "overview" | "orders" | "wallet" | "bank" | "withdrawals" | "sessions";

export function UserDetailModal({ userId, onClose, onChanged }: Props) {
  const toast = useToast();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");

  const reload = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/admin/users/${userId}`);
    const d = await r.json();
    if (d.success) setData(d.detail);
    else toast.error(d.error || "Không thể tải");
    setLoading(false);
  }, [userId, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch detail khi modal mở
    reload();
  }, [reload]);

  const doAction = async (action: "reset_password" | "force_logout" | "mark_verified", confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    const r = await fetch(`/api/admin/users/${userId}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const d = await r.json();
    if (!d.success) { toast.error(d.error || "Lỗi"); return; }
    if (action === "reset_password") {
      // Hiển thị mật khẩu tạm để admin copy + gửi cho user.
      window.prompt("Mật khẩu tạm (copy gửi cho user):", d.tempPassword || "");
      toast.success("Đã reset mật khẩu — đã sao chép vào hộp thoại");
    } else if (action === "force_logout") {
      toast.success(`Đã huỷ ${d.revoked || 0} phiên đăng nhập`);
    } else {
      toast.success("Đã xác minh email");
    }
    reload();
    onChanged?.();
  };

  const u = data?.user as Record<string, unknown> | undefined;

  return (
    <Modal open onClose={onClose} title={u ? `User: ${u.username}` : "Chi tiết user"} size="xl">
      {loading && <p className="text-sm text-gray-400">Đang tải…</p>}
      {!loading && data && u && (
        <>
          {/* Header info */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Stat label="Số dư ví" value={formatVND(data.walletBalance)} color="emerald" />
            <Stat label="Đơn hàng" value={String(data.totalOrders)} color="blue" />
            <Stat label="Cashback" value={formatVND(data.totalCashback)} color="orange" />
            <Stat label="Phiên đăng nhập" value={String(data.sessions.length)} color="purple" />
          </div>

          {/* Profile + actions */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <Field label="ID">{u.id as number}</Field>
            <Field label="Email">{u.email as string}</Field>
            <Field label="Display name">{(u.display_name as string | null) || "—"}</Field>
            <Field label="Phone">{(u.phone as string | null) || "—"}</Field>
            <Field label="Role">{u.role as string}</Field>
            <Field label="Created">{formatDate(u.created_at as string)}</Field>
            <Field label="Last login">{formatDate(u.last_login as string)}</Field>
            <Field label="Email verified">
              {u.email_verified ? <span className="text-green-600 dark:text-green-400">✓ Verified</span> : <span className="text-amber-600 dark:text-amber-400">Chưa xác minh</span>}
            </Field>
            <Field label="Có withdraw PIN">{u.has_withdraw_pin ? "✓" : "—"}</Field>
            <Field label="2FA">{u.totp_enabled ? <span className="text-green-600 dark:text-green-400">✓ Bật</span> : "Tắt"}</Field>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => doAction("reset_password", "Reset mật khẩu của user này? User sẽ bị logout khỏi mọi thiết bị.")}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
            >
              🔑 Reset mật khẩu
            </button>
            <button
              onClick={() => doAction("force_logout", "Force logout: huỷ tất cả session đang mở của user?")}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
            >
              🚪 Force logout
            </button>
            {!u.email_verified && (
              <button
                onClick={() => doAction("mark_verified")}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-500/10 text-green-700 dark:text-green-300 hover:bg-green-500/20"
              >
                ✓ Xác minh email thủ công
              </button>
            )}
          </div>

          {/* Sub-tabs */}
          <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700 mb-3">
            {([
              ["overview", "Tổng quan"],
              ["orders", `Đơn (${data.recentOrders.length})`],
              ["wallet", `Ví (${data.recentWallet.length})`],
              ["bank", `Bank (${data.bankAccounts.length})`],
              ["withdrawals", `Rút (${data.withdrawals.length})`],
              ["sessions", `Session (${data.sessions.length})`],
            ] as [Tab, string][]).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`text-xs font-medium px-3 py-1.5 rounded-t-lg transition-colors ${
                  tab === k ? "bg-orange-500 text-white" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >{label}</button>
            ))}
          </div>

          <div className="max-h-[40vh] overflow-y-auto bg-gray-50 dark:bg-gray-900/30 rounded-lg p-3">
            {tab === "overview" && <OverviewSection data={data} />}
            {tab === "orders" && <OrdersSection rows={data.recentOrders} />}
            {tab === "wallet" && <WalletSection rows={data.recentWallet} />}
            {tab === "bank" && <BankSection rows={data.bankAccounts} />}
            {tab === "withdrawals" && <WithdrawSection rows={data.withdrawals} />}
            {tab === "sessions" && <SessionSection rows={data.sessions} />}
          </div>
        </>
      )}
    </Modal>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: "emerald" | "blue" | "orange" | "purple" }) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
    blue: "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300",
    orange: "bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-300",
    purple: "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300",
  };
  return (
    <div className={`rounded-lg border p-3 ${map[color]}`}>
      <p className="text-base font-bold">{value}</p>
      <p className="text-xs opacity-70 mt-0.5">{label}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-gray-900 dark:text-white font-medium break-all">{children}</p>
    </div>
  );
}

function OverviewSection({ data }: { data: Detail }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
      <div>
        <p className="font-bold mb-2 text-gray-700 dark:text-gray-300">Đơn hàng gần đây (top 5)</p>
        {data.recentOrders.slice(0, 5).map((o) => (
          <p key={o.id as number} className="py-1 border-b border-gray-200 dark:border-gray-700 last:border-0">
            <span className="font-mono text-gray-600 dark:text-gray-400">{o.order_code as string}</span>
            <span className="float-right text-orange-600 dark:text-orange-400">{formatVND(o.cashback as number)}</span>
          </p>
        ))}
        {data.recentOrders.length === 0 && <p className="text-gray-400">Chưa có đơn</p>}
      </div>
      <div>
        <p className="font-bold mb-2 text-gray-700 dark:text-gray-300">Hoạt động ví (top 5)</p>
        {data.recentWallet.slice(0, 5).map((w) => (
          <p key={w.id as number} className="py-1 border-b border-gray-200 dark:border-gray-700 last:border-0">
            <span className="text-gray-600 dark:text-gray-400">{w.label as string}</span>
            <span className={`float-right ${w.type === "credit" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {w.type === "credit" ? "+" : "-"}{formatVND(w.amount as number)}
            </span>
          </p>
        ))}
        {data.recentWallet.length === 0 && <p className="text-gray-400">Chưa có giao dịch</p>}
      </div>
    </div>
  );
}

function OrdersSection({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) return <p className="text-xs text-gray-400">Chưa có đơn</p>;
  return (
    <table className="w-full text-xs">
      <thead className="text-gray-500 dark:text-gray-400">
        <tr><th className="text-left py-1">Mã đơn</th><th className="text-left">Cửa hàng</th><th className="text-right">Tổng</th><th className="text-right">Hoàn</th><th className="text-center">Trạng thái</th><th className="text-right">Ngày</th></tr>
      </thead>
      <tbody>
        {rows.map((o) => (
          <tr key={o.id as number} className="border-t border-gray-200 dark:border-gray-700">
            <td className="font-mono py-1">{o.order_code as string}</td>
            <td>{o.store as string}</td>
            <td className="text-right">{formatVND(o.amount as number)}</td>
            <td className="text-right text-orange-600 dark:text-orange-400">{formatVND(o.cashback as number)}</td>
            <td className="text-center">{o.status as string}</td>
            <td className="text-right text-gray-400">{formatDate(o.created_at as string)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function WalletSection({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) return <p className="text-xs text-gray-400">Chưa có giao dịch</p>;
  return (
    <table className="w-full text-xs">
      <thead className="text-gray-500 dark:text-gray-400">
        <tr><th className="text-left py-1">Diễn giải</th><th className="text-right">Số tiền</th><th className="text-center">Loại</th><th className="text-right">Ngày</th></tr>
      </thead>
      <tbody>
        {rows.map((w) => (
          <tr key={w.id as number} className="border-t border-gray-200 dark:border-gray-700">
            <td className="py-1">{w.label as string}</td>
            <td className={`text-right ${w.type === "credit" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {w.type === "credit" ? "+" : "-"}{formatVND(w.amount as number)}
            </td>
            <td className="text-center text-gray-500 dark:text-gray-400">{w.type as string}</td>
            <td className="text-right text-gray-400">{formatDate(w.created_at as string)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BankSection({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) return <p className="text-xs text-gray-400">Chưa có TK ngân hàng</p>;
  return (
    <table className="w-full text-xs">
      <thead className="text-gray-500 dark:text-gray-400">
        <tr><th className="text-left py-1">Ngân hàng</th><th className="text-left">STK</th><th className="text-left">Chủ TK</th><th className="text-center">Mặc định</th></tr>
      </thead>
      <tbody>
        {rows.map((b) => (
          <tr key={b.id as number} className="border-t border-gray-200 dark:border-gray-700">
            <td className="py-1">{b.bank_name as string}</td>
            <td className="font-mono">{b.account_number as string}</td>
            <td>{b.account_holder as string}</td>
            <td className="text-center">{b.is_default ? "✓" : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function WithdrawSection({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) return <p className="text-xs text-gray-400">Chưa có yêu cầu rút</p>;
  return (
    <table className="w-full text-xs">
      <thead className="text-gray-500 dark:text-gray-400">
        <tr><th className="text-right py-1">Số tiền</th><th className="text-left">Bank</th><th className="text-center">Trạng thái</th><th>Ghi chú</th><th className="text-right">Ngày</th></tr>
      </thead>
      <tbody>
        {rows.map((w) => (
          <tr key={w.id as number} className="border-t border-gray-200 dark:border-gray-700">
            <td className="py-1 text-right text-orange-600 dark:text-orange-400">{formatVND(w.amount as number)}</td>
            <td>{(w.bank_name as string) || "—"}</td>
            <td className="text-center">{w.status as string}</td>
            <td className="text-gray-500 dark:text-gray-400">{(w.admin_note as string | null) || "—"}</td>
            <td className="text-right text-gray-400">{formatDate(w.created_at as string)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SessionSection({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) return <p className="text-xs text-gray-400">Không có phiên đang mở</p>;
  return (
    <table className="w-full text-xs">
      <thead className="text-gray-500 dark:text-gray-400">
        <tr><th className="text-left py-1">IP</th><th className="text-left">User Agent</th><th className="text-right">Last seen</th><th className="text-right">Hết hạn</th></tr>
      </thead>
      <tbody>
        {rows.map((s) => (
          <tr key={s.id as number} className="border-t border-gray-200 dark:border-gray-700">
            <td className="py-1 font-mono">{(s.ip as string | null) || "—"}</td>
            <td className="truncate max-w-xs text-gray-500 dark:text-gray-400" title={(s.user_agent as string | null) || ""}>
              {(s.user_agent as string | null)?.slice(0, 50) || "—"}
            </td>
            <td className="text-right text-gray-400">{formatDate((s.last_seen_at as string) || (s.created_at as string))}</td>
            <td className="text-right text-gray-400">{formatDate(s.expires_at as string)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
